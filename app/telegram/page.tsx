"use client";

import { useEffect, useState } from "react";

type TelegramConnection = {
  id: string;
  clientId: string;
  status: "pending" | "connected" | "expired";
  createdAt: string;
  expiresAt: string;
  connectedAt?: string;
  actionConfirmedAt?: string;
  telegram?: {
    userId: number;
    username?: string;
    firstName?: string;
  };
  lastDelivery?: {
    messageId: number;
    sentAt: string;
    kind: "test" | "audit";
  };
};

type ConnectionResponse = {
  ok?: boolean;
  connection?: TelegramConnection;
  telegram_url?: string;
  error?: string;
};

const STORAGE_KEY = "viralbridge_telegram_connection_id";

export default function TelegramTestPage() {
  const [connection, setConnection] = useState<TelegramConnection | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [auditUrl, setAuditUrl] = useState("https://anselat.lv/en");
  const [auditSending, setAuditSending] = useState(false);
  const [auditResult, setAuditResult] = useState<{
    score?: number;
    findings?: number;
    elapsedMs?: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const connectionId = window.localStorage.getItem(STORAGE_KEY);
    if (!connectionId) return;

    void refreshConnection(connectionId);
  }, []);

  useEffect(() => {
    if (!connection || connection.status === "expired") return;

    const timer = window.setInterval(() => {
      void refreshConnection(connection.id);
    }, 1_500);

    return () => window.clearInterval(timer);
  }, [connection?.id, connection?.status]);

  async function refreshConnection(connectionId: string) {
    try {
      const response = await fetch(
        `/api/telegram/status?connection_id=${encodeURIComponent(connectionId)}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as ConnectionResponse;

      if (response.status === 404) {
        window.localStorage.removeItem(STORAGE_KEY);
        setConnection(null);
        return;
      }
      if (!response.ok || !payload.connection) {
        throw new Error(payload.error ?? "Не удалось проверить подключение");
      }

      setConnection(payload.connection);
      setError(null);
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Не удалось проверить подключение",
      );
    }
  }

  async function connectTelegram() {
    setLoading(true);
    setError(null);
    const telegramWindow = window.open("", "_blank");

    try {
      const response = await fetch("/api/telegram/connect", { method: "POST" });
      const payload = (await response.json()) as ConnectionResponse;
      if (!response.ok || !payload.connection || !payload.telegram_url) {
        throw new Error(payload.error ?? "Не удалось создать подключение");
      }

      window.localStorage.setItem(STORAGE_KEY, payload.connection.id);
      setConnection(payload.connection);

      if (telegramWindow) {
        telegramWindow.location.href = payload.telegram_url;
      } else {
        window.location.href = payload.telegram_url;
      }
    } catch (connectError) {
      telegramWindow?.close();
      setError(
        connectError instanceof Error
          ? connectError.message
          : "Не удалось создать подключение",
      );
    } finally {
      setLoading(false);
    }
  }

  async function sendTestMessage() {
    if (!connection) return;

    setSending(true);
    setError(null);
    try {
      const response = await fetch("/api/telegram/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection_id: connection.id }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Тестовое сообщение не отправлено");
      }

      await refreshConnection(connection.id);
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Тестовое сообщение не отправлено",
      );
    } finally {
      setSending(false);
    }
  }

  async function runAuditAndSend() {
    if (!connection) return;

    setAuditSending(true);
    setAuditResult(null);
    setError(null);

    try {
      const auditResponse = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: auditUrl }),
      });
      const auditPayload = (await auditResponse.json()) as {
        gateway?: { elapsed_ms?: number };
        audit?: {
          ok?: boolean;
          score?: { value?: number };
          findings?: unknown[];
        };
        error?: string;
      };
      if (!auditResponse.ok || !auditPayload.audit?.ok) {
        throw new Error(auditPayload.error ?? "Page Audit не выполнен");
      }

      const sendResponse = await fetch("/api/telegram/send-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connection_id: connection.id,
          audit: auditPayload.audit,
        }),
      });
      const sendPayload = (await sendResponse.json()) as {
        ok?: boolean;
        error?: string;
      };
      if (!sendResponse.ok || !sendPayload.ok) {
        throw new Error(
          sendPayload.error ?? "Аудит не отправлен в Telegram",
        );
      }

      setAuditResult({
        score: auditPayload.audit.score?.value,
        findings: auditPayload.audit.findings?.length,
        elapsedMs: auditPayload.gateway?.elapsed_ms,
      });
      await refreshConnection(connection.id);
    } catch (auditError) {
      setError(
        auditError instanceof Error
          ? auditError.message
          : "Аудит не отправлен в Telegram",
      );
    } finally {
      setAuditSending(false);
    }
  }

  function resetTest() {
    window.localStorage.removeItem(STORAGE_KEY);
    setConnection(null);
    setError(null);
  }

  const accountName =
    connection?.telegram?.username ??
    connection?.telegram?.firstName ??
    (connection?.telegram ? `ID ${connection.telegram.userId}` : null);

  return (
    <main className="telegram-main">
      <section className="card telegram-card">
        <div className="telegram-heading">
          <div>
            <p className="eyebrow">ViralBridge Channel Spike</p>
            <h1>Подключение Telegram</h1>
          </div>
          <a href="/">Вернуться к SEO-стенду</a>
        </div>

        <p className="intro">
          Проверяем реальный onboarding-flow: одноразовая ссылка, привязка
          Telegram, callback-кнопка и исходящее тестовое сообщение.
        </p>

        <div className="telegram-flow">
          <span>1. Открыть Telegram</span>
          <span>2. Нажать Start</span>
          <span>3. Подтвердить кнопку</span>
          <span>4. Получить тест</span>
        </div>

        {!connection || connection.status === "expired" ? (
          <div className="telegram-action">
            {connection?.status === "expired" && (
              <p>Предыдущая ссылка истекла. Создайте новую.</p>
            )}
            <button type="button" onClick={connectTelegram} disabled={loading}>
              {loading ? "Создаём ссылку…" : "Подключить Telegram"}
            </button>
            <small>
              Telegram откроется в новой вкладке или в установленном приложении.
            </small>
          </div>
        ) : (
          <>
            <div className={`telegram-status ${connection.status}`}>
              <div className="status-indicator" />
              <div>
                <strong>
                  {connection.status === "connected"
                    ? "Telegram подключён"
                    : "Ожидаем нажатия Start"}
                </strong>
                <p>
                  {connection.status === "connected"
                    ? `Аккаунт: ${accountName}`
                    : "Откройте Telegram и нажмите Start. Страница обновится автоматически."}
                </p>
              </div>
            </div>
            {connection.status === "pending" && (
              <button
                className="secondary-button telegram-restart"
                type="button"
                onClick={resetTest}
              >
                Создать новую ссылку
              </button>
            )}
          </>
        )}

        {connection?.status === "connected" && (
          <div className="telegram-checks">
            <article>
              <span>Входящий `/start`</span>
              <strong>Пройден</strong>
            </article>
            <article>
              <span>Callback-кнопка</span>
              <strong>
                {connection.actionConfirmedAt ? "Пройдена" : "Ожидается"}
              </strong>
            </article>
            <article>
              <span>Исходящая доставка</span>
              <strong>
                {connection.lastDelivery ? "Пройдена" : "Не запускалась"}
              </strong>
            </article>
          </div>
        )}

        {connection?.status === "connected" && (
          <div className="telegram-buttons">
            <button type="button" onClick={sendTestMessage} disabled={sending}>
              {sending ? "Отправляем…" : "Отправить тестовое сообщение"}
            </button>
            <button className="secondary-button" type="button" onClick={resetTest}>
              Начать тест заново
            </button>
          </div>
        )}

        {connection?.status === "connected" && (
          <div className="telegram-audit-delivery">
            <div>
              <p className="eyebrow">Production-полезный тест</p>
              <h2>Page Audit → Telegram</h2>
            </div>
            <label>
              URL для аудита
              <input
                type="url"
                value={auditUrl}
                onChange={(event) => setAuditUrl(event.target.value)}
                required
              />
            </label>
            <button
              type="button"
              onClick={runAuditAndSend}
              disabled={auditSending}
            >
              {auditSending
                ? "Аудитируем и отправляем…"
                : "Запустить аудит и отправить в Telegram"}
            </button>
            {auditResult && (
              <div className="channel-result success">
                <strong>Аудит доставлен</strong>
                <p>
                  Score: {auditResult.score ?? "—"}, наблюдений:{" "}
                  {auditResult.findings ?? "—"}, полный gateway:{" "}
                  {typeof auditResult.elapsedMs === "number"
                    ? `${(auditResult.elapsedMs / 1_000).toFixed(2)} сек`
                    : "—"}
                </p>
              </div>
            )}
          </div>
        )}

        {error && <p className="telegram-error">{error}</p>}
      </section>

      <section className="card telegram-dev-card">
        <p className="eyebrow">Локальный режим</p>
        <h2>Пока нет публичного URL</h2>
        <p className="intro">
          Оставьте Next.js и polling bridge запущенными в двух терминалах.
          Polling используется только в dev; production route уже принимает
          обычные Telegram webhooks.
        </p>
        <div className="terminal-command">
          <span>Терминал 1</span>
          <code>npm run dev</code>
        </div>
        <div className="terminal-command">
          <span>Терминал 2</span>
          <code>npm run telegram:poll</code>
        </div>
      </section>
    </main>
  );
}
