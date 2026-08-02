"use client";

import { useState } from "react";

type WhatsAppResult = {
  ok?: boolean;
  delivery?: {
    messageId?: string;
    messageStatus?: string | null;
    sentAt?: string;
  };
  error?: string;
};

export default function ChannelsPage() {
  const [whatsAppLoading, setWhatsAppLoading] = useState(false);
  const [whatsAppResult, setWhatsAppResult] =
    useState<WhatsAppResult | null>(null);

  async function sendWhatsAppTest() {
    setWhatsAppLoading(true);
    setWhatsAppResult(null);

    try {
      const response = await fetch("/api/whatsapp/send-test", {
        method: "POST",
      });
      const payload = (await response.json()) as WhatsAppResult;
      setWhatsAppResult(payload);
    } catch (error) {
      setWhatsAppResult({
        ok: false,
        error:
          error instanceof Error ? error.message : "WhatsApp request failed",
      });
    } finally {
      setWhatsAppLoading(false);
    }
  }

  return (
    <main className="channels-main">
      <section className="card channels-header">
        <div>
          <p className="eyebrow">ViralBridge Channel Lab</p>
          <h1>Slack + WhatsApp</h1>
        </div>
        <a href="/">Вернуться к SEO-стенду</a>
        <p className="intro">
          Slack проверяем полностью локально через Socket Mode. WhatsApp без
          публичного HTTPS позволяет проверить авторизацию и исходящую template
          delivery; входящий webhook уже подготовлен для следующего этапа.
        </p>
      </section>

      <section className="card channel-card">
        <div className="channel-title">
          <span className="channel-icon slack-icon">S</span>
          <div>
            <p className="eyebrow">Полный локальный тест</p>
            <h2>Slack Socket Mode</h2>
          </div>
        </div>

        <ol className="channel-steps">
          <li>Создать приложение из `config/slack-app-manifest.yaml`.</li>
          <li>Установить приложение в dev workspace.</li>
          <li>Добавить `SLACK_BOT_TOKEN` и `SLACK_APP_TOKEN` в `.env.local`.</li>
          <li>Запустить bridge и написать приложению в Messages.</li>
        </ol>

        <div className="terminal-command">
          <span>Локальный Socket Mode</span>
          <code>npm run slack:socket</code>
        </div>

        <p className="channel-note">
          Публичный URL не требуется: events и кнопки идут через WebSocket.
        </p>
      </section>

      <section className="card channel-card">
        <div className="channel-title">
          <span className="channel-icon whatsapp-icon">W</span>
          <div>
            <p className="eyebrow">Исходящий локальный тест</p>
            <h2>WhatsApp Cloud API</h2>
          </div>
        </div>

        <ol className="channel-steps">
          <li>Создать Meta App и открыть WhatsApp API Setup.</li>
          <li>Добавить свой номер в список тестовых получателей.</li>
          <li>Заполнить WhatsApp-переменные в `.env.local`.</li>
          <li>Отправить официальный `hello_world` template.</li>
        </ol>

        <button
          type="button"
          onClick={sendWhatsAppTest}
          disabled={whatsAppLoading}
        >
          {whatsAppLoading
            ? "Отправляем WhatsApp…"
            : "Отправить WhatsApp test template"}
        </button>

        {whatsAppResult && (
          <div
            className={`channel-result ${whatsAppResult.ok ? "success" : "error"}`}
          >
            <strong>
              {whatsAppResult.ok ? "Запрос принят Meta" : "Запрос не выполнен"}
            </strong>
            <p>
              {whatsAppResult.ok
                ? `Message ID: ${whatsAppResult.delivery?.messageId ?? "—"}`
                : whatsAppResult.error}
            </p>
          </div>
        )}

        <p className="channel-note">
          Для реальных входящих сообщений Meta потребует публичный HTTPS webhook.
        </p>
      </section>

      <section className="card channels-summary">
        <h2>Что проверяем</h2>
        <div className="telegram-checks">
          <article>
            <span>Slack inbound</span>
            <strong>Socket Mode</strong>
          </article>
          <article>
            <span>Slack action</span>
            <strong>Интерактивная кнопка</strong>
          </article>
          <article>
            <span>WhatsApp outbound</span>
            <strong>Cloud API template</strong>
          </article>
        </div>
      </section>
    </main>
  );
}
