# Viralbridge SEO Stack Spike

Минимальный воспроизводимый стенд для трёх связок:

```text
Page Audit v1: Browser → Next.js → Modal Function → Firecrawl → deterministic rules
OpenAI brief: Browser → Next.js → Modal Function → OpenAI Responses API
OpenAI agents: Browser → Next.js → Modal → Orchestrator → SEO Agent → Firecrawl → QA
Provider A/B: Browser → Next.js → Modal → direct API + OpenRouter BYOK
Agent smoke:  Browser → Next.js → Modal Function → Claude Agent SDK → Firecrawl
Fit onboarding: Form → Next.js → Modal job → Claude Agent SDK + Firecrawl → policy → chat/invite
```

Также добавлен Telegram channel spike:

```text
Browser → одноразовый connect token → Telegram bot
Telegram getUpdates (local) / webhook (production) → Next.js
Next.js → привязка тестовой сессии → callback + исходящее сообщение
```

### Локальный Telegram smoke без публичного URL

В `.env.local` должны быть:

```dotenv
TELEGRAM_BOT_TOKEN=...
TELEGRAM_BOT_USERNAME=viralbridge_dev_bot
```

Запустить два процесса:

```bash
npm run dev
npm run telegram:poll
```

Затем открыть:

```text
http://localhost:3000/telegram
```

После подключения на этой же странице можно выполнить реальный Page Audit и
отправить в Telegram компактную детерминированную сводку: score, количество
проблем, пять главных наблюдений и длительность. Дополнительный LLM-вызов для
этой доставки не используется.

Polling bridge удаляет установленный webhook у этого dev-бота и пересылает
updates в локальный `/api/telegram/webhook`. Это только временный dev transport:
обработчик, подпись, connect-token и Telegram API остаются теми же, что будут
использоваться с production webhook.

Текущие подключения хранятся в памяти процесса Next.js и живут 10 минут. После
проверки transport-flow их нужно перенести в Postgres до EAP.

### Slack Socket Mode без публичного URL

Создать Slack app из:

```text
config/slack-app-manifest.yaml
```

После установки приложения в dev workspace добавить в `.env.local`:

```dotenv
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
```

App-level token должен иметь scope `connections:write`. Запуск:

```bash
npm run slack:socket
```

Открыть Messages приложения, отправить любое сообщение и нажать кнопку
подтверждения. В Socket Mode публичный URL не требуется.

### WhatsApp Cloud API до появления публичного URL

В Meta App → WhatsApp API Setup получить значения и добавить:

```dotenv
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_GRAPH_API_VERSION=vXX.X
WHATSAPP_TEST_RECIPIENT=международный_номер_без_плюса
```

После `npm run dev` открыть `/channels` и отправить официальный `hello_world`
template. Для входящих сообщений route `/api/whatsapp/webhook` уже поддерживает
Meta challenge и проверку `X-Hub-Signature-256`, но Meta сможет вызвать его
только по публичному HTTPS URL. Перед включением webhook дополнительно добавить:

```dotenv
WHATSAPP_VERIFY_TOKEN=случайная_строка
WHATSAPP_APP_SECRET=...
```

Текущий интерфейс сначала запускает `Page Audit v1`, который не использует LLM,
а затем позволяет одним отдельным OpenAI-вызовом превратить готовые факты в
приоритетный план исправлений или сравнить direct/OpenRouter каналы OpenAI и
Claude. Повторного Firecrawl для one-call AI-шагов нет.

Page Audit возвращает:

- сквозной `request_id`;
- title, description, headings, canonical, robots и основные метрики страницы;
- внутренние и внешние ссылки;
- изображения без `alt`;
- структурированные данные и Open Graph;
- список детерминированных SEO-наблюдений;
- score по правилам `viralbridge_page_rules_v1`;
- длительность Firecrawl, Python-аудита и полного gateway-запроса;
- Firecrawl credits и нулевые LLM tokens/cost.

Claude Agent endpoint и отдельный Claude provider benchmark также проверены с
положительным API-балансом.

## 1. Требования

- Node.js 20.9+;
- Python 3.10+ для локального Modal CLI;
- аккаунты и ключи Firecrawl и Modal;
- Claude Platform API key нужен для Claude benchmark и Agent smoke.
- OpenAI API key нужен только для AI-приоритизации.

Ключи нельзя добавлять в Git или отправлять в чат.

### Business-fit onboarding

Новый onboarding не даёт Claude права апрувить клиента. Modal worker собирает
публичные данные через Firecrawl и возвращает структурированный assessment по
четырём факторам: масштабируемость, региональность, рыночная возможность и
экономика бизнеса. Решение принимает TypeScript policy engine:

- `AUTO_REJECT`: score ниже 50 при confidence от 80%, минимум двух доменах и
  отсутствии признаков недостаточных данных;
- `MANUAL_REVIEW`: score 50–55, технические ошибки и неразрешённые после
  уточнения случаи уходят администратору в Telegram;
- `AUTO_APPROVE`: score от 56, confidence от 80%, минимум два домена-источника,
  нет blockers, scalability и regionality не ниже 12/25;
- `NEEDS_INFO`: если агент не уверен, что нашёл правильную компанию, либо ему
  не хватает данных о соцсетях, франшизе, географии или модели масштабирования,
  он задаёт до трёх точных вопросов в секретном onboarding-чате;
- clarification ограничен двумя ответами клиента и двумя повторными анализами,
  после чего оставшиеся сомнения передаются администратору;
- website в заявке необязателен: worker сначала ищет компанию по названию, а при
  неоднозначности просит официальный сайт или социальные профили в чате;
- каждый анализ ограничен аварийным Claude-потолком `$0.12`; это не целевая
  стоимость запроса — фактическая цена зависит от использованных токенов. Firecrawl-контекст сокращён
  до трёх результатов и 2500 символов страницы, а длина structured output
  ограничена JSON Schema, чтобы повторные проверки не
  расходовали токены на нерелевантный текст;
- Claude Agent SDK остаётся оркестратором: он получает заявку, вызывает ровно
  один in-process MCP tool `research_company`, получает компактный Firecrawl
  dossier и сам выполняет оценку по фиксированной rubric. Повторный вызов tool
  возвращает cached guard и не расходует Firecrawl credits;
- при clarification в новый assessment передаётся пара `вопросы → ответ`, а не
  только короткий ответ клиента. Поэтому значения вроде `1. no / 2. no` не
  теряют смысл и агент не задаёт уже закрытые вопросы повторно;
- клиент не видит внутренние баллы и получает финальное решение по email.

Clarification smoke-test выполнен 22 августа 2026: для намеренно несовпадающих
`Viral Bridge Example` и `example.com` Claude вернул `company_match=MISMATCH`,
score `0/100` и не стал придумывать бизнес. Worker отработал за `17.17 сек.` при
стоимости Claude `$0.01396`; policy engine направляет такой результат в
`NEEDS_INFO`, а не в автоматический отказ.

Задеплоить асинхронный Modal worker:

```bash
.venv/bin/python -m modal deploy modal/business_fit.py --env dev
```

URL функции `business_fit_api` записать в `.env.local` и Vercel:

```dotenv
MODAL_BUSINESS_FIT_URL=https://...modal.run
```

Для защищённого operational retry/sync по `applicationId` или `email + companyName` в production нужно
задать `ASSESSMENT_RECOVERY_SECRET` длиной не менее 32 символов. Endpoint
`POST /api/admin/assessments/recover` принимает secret только в заголовке
`x-recovery-secret`, синхронизирует или повторно запускает Modal job и ротирует
onboarding link. Параметр `restart: true` разрешает повторный анализ состояния
`NEEDS_INFO` после исправления qualification flow.

Worker использует уже созданные Modal secrets `viralbridge-firecrawl-dev` и
`viralbridge-claude-dev`. Prisma migration
`20260821120000_add_fit_assessment_onboarding` нужно применить до включения flow.

Первый успешный business-fit benchmark выполнен 21 августа 2026 на `stripe.com`:

| Вариант | Полный запрос | Modal worker | Firecrawl | Turns | Claude cost |
| --- | ---: | ---: | ---: | ---: | ---: |
| 2 MCP tools + ToolSearch | 45 сек | 35.37 сек | 2.35 сек | 4 | $0.04611 |
| 2 MCP tools + `tools=[]` | 45 сек | 42.05 сек | 0.88 сек | 4 | $0.03567 |
| 1 MCP tool + Structured Output | 39 сек | 29.99 сек | 0.68 сек | 3 | $0.02595 |

Финальный вариант использует один research tool, официальный JSON Schema output
и TypeScript policy. Stripe получил 65/100 и не проходит auto-approve: глобальный
масштаб высокий, но дополнительная SEO/growth-ценность для такого лидера низкая.

Контрольный onboarding выполнен 22 августа 2026 на `anselat.lv` через полный
`Next.js → Modal → Firecrawl → Claude Agent SDK → Postgres → Telegram` flow:

| Метрика | Результат |
| --- | ---: |
| Ответ формы | 6.73 сек |
| Форма → итоговый статус | 50.87 сек |
| Modal worker | 38.03 сек |
| Firecrawl research | 3.10 сек, 3 credits |
| Claude Agent SDK | 3 turns, $0.02844 |
| Решение на момент benchmark | `MANUAL_REVIEW`, 34/100, confidence 95% |
| Источники | 4 evidence URL, 3 домена |
| Telegram | доставлено без ошибки |
| Activation invite | не создавался, как и требуется для manual review |

Первый прогон обнаружил нестабильность Agent SDK с вложенным
`StructuredOutput`: модель исчерпала пять попыток JSON validation. Контракт worker
переведён на плоскую строгую схему с нормализацией обратно в доменную структуру;
два последующих прогона завершились успешно с одинаковым решением (33 и 34 балла).
Текущий safety cap одного Claude-прогона — `$0.12`; он предотвращает
неконтролируемый расход, но не должен использоваться как целевая цена.
По текущей policy этот же результат `34/100` при confidence 95% и трёх доменах
привёл бы к `AUTO_REJECT` с отправкой клиенту нейтрального decision email.

Production recovery-test выполнен 24 августа 2026 на той же заявке Anselat
после ответа `no / no / 1000 euro`:

| Метрика | Результат |
| --- | ---: |
| Архитектура | Claude Agent SDK → `research_company` MCP tool → Firecrawl → structured assessment |
| Search tool | 1 вызов, 862 мс, сайт + 3 search results |
| Claude Agent SDK | 4 turns, 73.36 сек, `$0.04259` |
| Решение | `AUTO_REJECT`, 26/100, confidence 90% |
| Blocker | `LOCAL_SINGLE_LOCATION` |
| Повторные вопросы | 0 |
| Email / Telegram | доставлены без ошибок |

## 2. Next.js

Установить зависимости:

```bash
npm install
```

Скопировать пример конфигурации:

```bash
cp .env.example .env.local
```

Значения Modal URL и Proxy Token появятся после шагов ниже.

## 3. Modal CLI

Создать окружение текущим `python3`:

```bash
python3 -m venv .venv
.venv/bin/pip install modal
.venv/bin/python -m modal setup
```

Проверить чистый Modal cloud-вызов без API-ключей:

```bash
.venv/bin/python -m modal run modal/health.py
```

## Проверка Firecrawl без Claude

Создать `modal/.env.firecrawl`:

```dotenv
FIRECRAWL_API_KEY=fc-...
```

Загрузить его в Modal `dev`:

```bash
.venv/bin/python -m modal secret create viralbridge-firecrawl-dev \
  --from-dotenv modal/.env.firecrawl
```

Запустить один scrape страницы `example.com`:

```bash
.venv/bin/python -m modal run modal/firecrawl_health.py
```

Этот тест проверяет только `Modal → Firecrawl` и расходует 1 Firecrawl credit.

### Измеренные результаты dev

Проверено 18 июля 2026:

| Проверка | Результат |
| --- | --- |
| Modal cloud health | успешно |
| Modal remote Python | 3.11.12 |
| Modal cold round trip | 4.75 сек |
| Firecrawl HTTP | 200 |
| Firecrawl scrape latency | 387–534 мс |
| Next → Modal → Firecrawl, cold | 6.10 сек |
| Next → Modal → Firecrawl, warm | 1.29 сек |
| Анонимный Modal endpoint | 401 |
| URL вне allowlist | 400 |
| Некорректный URL на Next | 400 |

### Page Audit v1 без LLM

Проверено 18 июля 2026:

| Проверка | Результат |
| --- | --- |
| Modal deploy Page Audit | 9.12 сек при первой сборке |
| Установленная версия BeautifulSoup | 4.15.0 |
| Прямой Page Audit, cold | 5.19 сек |
| Cold: Firecrawl / Python rules | 333 / 95 мс |
| Прямой Page Audit, warm | 1.25 сек |
| Warm: Firecrawl / Python rules | 211 / 1 мс |
| Полный Next → Modal → Page Audit, warm | 1.50 сек |
| Полный Next → Modal → Page Audit, cold | 4.47 сек |
| Cold после redeploy: Modal workload | 345 мс |
| `example.com` score | 75 / 100 |
| Найдено правилом v1 | 4 наблюдения |
| Firecrawl usage | 1 credit на успешный scrape |
| LLM usage | 0 calls, 0 tokens, $0 |
| Некорректный URL через Next | 400 за 8 мс |
| `localhost` через Next и Modal | 400 за 285 мс |

Firecrawl v2 не вернул `creditsUsed` в payload тестового scrape, поэтому
`firecrawl_credits=1` помечается как оценка по документированной стоимости
успешного basic scrape. Исходное значение сохраняется отдельно в
`firecrawl_credits_reported`.

## 4. OpenAI SEO brief

OpenAI добавлен отдельным провайдером и не заменяет Claude endpoint:

```text
готовый audit JSON
  → Next.js /api/openai-summary
  → Modal Function summarize_audit
  → OpenAI Responses API
  → проверенный Pydantic Structured Output
  → план действий + токены + время + расчётная стоимость
```

В текущем тесте не используется автономный агент и не даются права на внешние
инструменты. Это позволяет сначала измерить качество, скорость и цену одного
контролируемого production-полезного действия.

Открыть локальный файл:

```text
modal/.env.openai
```

Вставить ключ после `OPENAI_API_KEY=`:

```dotenv
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.6-luna
```

Файл игнорируется Git. Загрузить значения в отдельный Modal secret:

```bash
.venv/bin/python -m modal secret create viralbridge-openai-dev \
  --from-dotenv modal/.env.openai \
  --env dev
```

Задеплоить OpenAI Function:

```bash
.venv/bin/python -m modal deploy modal/openai_seo.py --env dev
```

URL `summarize_audit` из вывода записать в `.env.local`:

```dotenv
MODAL_OPENAI_URL=https://...modal.run
```

После перезапуска `npm run dev`:

1. запустить обычный Page Audit;
2. нажать `Сделать AI-приоритизацию`;
3. проверить структурированный план, модель, токены, длительность и стоимость.

Цены в расчёте endpoint соответствуют опубликованным ставкам выбранной модели
на момент реализации. Перед production их нужно получать из единого
конфигурационного справочника и регулярно обновлять по
[официальной странице моделей OpenAI](https://developers.openai.com/api/docs/models).

### Критерии успеха OpenAI SEO brief

1. `gateway.modal_status` равен `200`;
2. `openai.ok` равен `true`;
3. `openai.provider.api` равен `responses`;
4. `openai.brief.top_actions` содержит от 3 до 5 действий;
5. ответ основан только на фактах Page Audit и не придумывает трафик/позиции;
6. `openai.usage.total_tokens` больше нуля;
7. `openai.usage.estimated_cost_usd` заполнена;
8. `openai.timings.openai_ms` и полное gateway-время измерены.

### Измеренный OpenAI baseline

Проверено 18 июля 2026 на реальном аудите `https://viralbrigde.com`.

Page Audit:

| Метрика | Результат |
| --- | --- |
| Полный Next → Modal → Firecrawl → rules | 1.62 сек |
| Firecrawl / Python rules | 511 / 160 мс |
| SEO score | 46 / 100 |
| Найдено правилом v1 | 7 наблюдений |
| Firecrawl usage | 1 credit |

OpenAI SEO brief, модель `gpt-5.6-luna`:

| Вызов | OpenAI API | Полный gateway | Токены | Стоимость |
| --- | ---: | ---: | ---: | ---: |
| Первый, с Modal cold overhead | 7.91 сек | 13.70 сек | 1 835 | $0.0057250 |
| Повтор 1 | 29.30 сек | 31.17 сек | 1 898 | $0.0051544 |
| Повтор 2 | 7.93 сек | 8.25 сек | 1 939 | $0.0054004 |
| Повтор 3 | 5.10 сек | 5.51 сек | 1 809 | $0.0046204 |

Сводка по четырём вызовам:

| Метрика | Результат |
| --- | --- |
| Успешный Structured Output | 4 / 4 |
| Приоритетных действий в ответе | 4–5 |
| OpenAI latency, min / median / avg / max | 5.10 / 7.93 / 12.56 / 29.30 сек |
| Токены, min / avg / max | 1 809 / 1 870 / 1 939 |
| Стоимость, min / avg / max | $0.0046204 / $0.0052251 / $0.0057250 |
| Общая стоимость четырёх вызовов | $0.0209002 |

Этот набор является baseline работоспособности, а не достаточной статистикой
для выбора провайдера. Он уже показывает, что отдельно измерять Modal cold start
недостаточно: один из повторных запросов провёл 29.30 секунды непосредственно
в OpenAI API. Для выбора production-провайдера нужно одинаковым payload и
форматом ответа сравнить direct OpenAI, direct Anthropic и те же модели через
OpenRouter.

### OpenAI direct vs OpenRouter → OpenAI

Добавлен отдельный transport benchmark:

```text
готовый Page Audit JSON
  → Next.js /api/provider-benchmark
  → одна Modal Function
      ├─ OpenAI Responses API напрямую
      └─ OpenRouter Responses API → только provider OpenAI
```

Это не сравнение разных моделей. Оба параллельных запроса используют:

- одну модель: `gpt-5.6-luna` / `openai/gpt-5.6-luna`;
- одинаковые instructions, input и строгую JSON Schema;
- `store=false`;
- ноль клиентских retries;
- один Modal container и одинаковый момент старта;
- Structured Output с повторной Pydantic-валидацией.

Для OpenRouter в теле запроса жёстко установлено:

```json
{
  "provider": {
    "only": ["openai"],
    "allow_fallbacks": false,
    "require_parameters": true
  }
}
```

Поэтому Azure и другие OpenRouter endpoints не участвуют, а ошибка OpenAI не
маскируется автоматическим fallback. Заголовок `X-OpenRouter-Metadata: enabled`
возвращает фактически выбранный upstream provider, количество попыток, регион и
признак BYOK. OpenRouter документирует
[provider routing](https://openrouter.ai/docs/guides/routing/provider-selection)
и [router metadata](https://openrouter.ai/docs/guides/features/router-metadata).

OpenRouter Responses API пока помечен как Beta. Это одна из вещей, которые
проверяет benchmark, а не готовое production-решение по умолчанию:
[Responses API Beta](https://openrouter.ai/docs/api/reference/responses/overview).

#### Получение и установка OpenRouter key

1. Войти в [OpenRouter](https://openrouter.ai/).
2. Открыть [API Keys](https://openrouter.ai/settings/keys).
3. Создать отдельный ключ `viralbridge-dev` с небольшим credit limit.
4. Так как OpenAI credits уже есть, для первого честного теста настроить
   [OpenAI BYOK](https://openrouter.ai/docs/guides/overview/auth/byok), поместить
   ключ в `Prioritized` и включить `Always use for this provider`.
5. Альтернатива BYOK — отдельно пополнить OpenRouter credits.
6. Создать локальный файл `modal/.env.openrouter` по примеру
   `modal/.env.openrouter.example`.
7. Вставить ключ:

```dotenv
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=openai/gpt-5.6-luna
```

Ключ не попадает в Next.js, браузер или Git. Он загружается отдельным Modal
secret:

```bash
.venv/bin/python -m modal secret create viralbridge-openrouter-dev \
  --from-dotenv modal/.env.openrouter \
  --env dev
```

Затем задеплоить benchmark:

```bash
.venv/bin/python -m modal deploy modal/provider_benchmark.py --env dev
```

URL `compare_providers` записать в `.env.local`:

```dotenv
MODAL_PROVIDER_BENCHMARK_URL=https://...modal.run
```

После перезапуска `npm run dev`:

1. выполнить обычный Page Audit;
2. нажать `Сравнить каналы`;
3. проверить оба HTTP status, latency, tokens, стоимость и
   `routing.selected_provider`;
4. для первичной статистики выполнить не менее 10 пар в разные периоды.

Один запуск UI выполняет одну параллельную пару и при текущем объёме audit
ориентировочно стоит около `$0.01` за обе стороны. Это приблизительная оценка на
основании direct baseline; фактическая стоимость выводится из token usage.
OpenRouter передаёт inference-ставки без наценки, но отдельно берёт комиссию при
покупке credits; она не включается в расчёт стоимости отдельного запроса:
[OpenRouter pricing FAQ](https://openrouter.ai/docs/faq).

Benchmark возвращает:

- success rate каждого канала;
- `min / median / avg / max` latency;
- token usage и расчётную list cost;
- reported OpenRouter cost, если поле присутствует;
- фактический upstream provider и число router attempts;
- SHA-256 fingerprint общего prompt/schema payload;
- полные структурированные ответы для ручной проверки качества.

Один или три прогона доказывают только техническую совместимость. Для решения о
production-маршруте нужны минимум 10–30 одинаковых пар и сравнение `p50/p95`,
ошибок, schema success и качества. До такого результата direct OpenAI остаётся
основным каналом, а OpenRouter — кандидатом на резерв и multi-model routing.

#### Измеренный direct vs OpenRouter результат

Проверено 19 июля 2026 на одном неизменном Page Audit JSON для
`https://anselat.lv/en`. Выполнено четыре параллельные пары, всего восемь
успешных model calls. Все пары имеют одинаковый prompt fingerprint:
`6f5e43be94881d83f36b93ada54bd734bf4e0a25069c3cd5935308d290551b0f`.

| Метрика | OpenAI direct | OpenRouter → OpenAI BYOK |
| --- | ---: | ---: |
| Успешные ответы | 4 / 4 | 4 / 4 |
| Strict Structured Output | 4 / 4 | 4 / 4 |
| Input tokens на вызов | 930 | 930 |
| Всего tokens | 6 907 | 6 909 |
| Среднее tokens на вызов | 1 727 | 1 727 |
| Latency min | 4.647 сек | 4.218 сек |
| Latency median | 5.460 сек | 5.891 сек |
| Latency avg | 5.315 сек | 5.615 сек |
| Latency max | 5.693 сек | 6.459 сек |
| Средняя расчётная стоимость | $0.0057105 | $0.0057135 |
| Общая расчётная стоимость | $0.0228420 | $0.0228540 |

OpenRouter оказался в среднем на `300 мс`, или примерно `5.6%`, медленнее.
Медиана была хуже примерно на `432 мс`, но самый быстрый единичный ответ
оказался у OpenRouter. На четырёх парах это наблюдение, а не статистически
надёжное доказательство разницы.

Router metadata во всех успешных OpenRouter вызовах подтвердил:

| Поле | Результат |
| --- | --- |
| `is_byok` | `true` |
| selected provider | `OpenAI` |
| selected model | `openai/gpt-5.6-luna-20260709` |
| router strategy | `direct` |
| router attempt | `1` |
| fallback | отключён |
| router region | `CMH` |

OpenRouter вернул `reported_cost_usd=0`, потому что использовался BYOK. Это не
означает бесплатный inference: расход проходит по OpenAI account, поэтому в
сравнении используется одинаковая расчётная token cost. Суммарная расчётная
стоимость всех восьми успешных вызовов — `$0.045696`.

Содержательно все восемь ответов совпали по главным приоритетам:

1. добавить содержательные `alt` к изображениям;
2. проверить и нормализовать структуру H1;
3. оценить применимость structured data.

Формулировки и количество quick wins немного различались из-за обычной
недетерминированности генерации, но различий, указывающих на ухудшение качества
из-за OpenRouter, не найдено.

Перед успешными прогонами оба канала синхронно вернули HTTP 400 на исходную
JSON Schema без `additionalProperties:false`. Это полезно подтвердило, что
OpenRouter действительно передал запрос в OpenAI BYOK, а также выявило отличие
от `client.responses.parse`: OpenAI SDK нормализует strict schema автоматически,
тогда как общий raw REST payload должен содержать это ограничение явно.
Ошибочные запросы завершились до генерации и не вернули token usage.

Предварительный вывод: OpenRouter технически работает с нашей моделью,
Responses API, BYOK и Strict Structured Output. На текущей малой выборке он не
дал преимуществ по скорости или цене, поэтому direct OpenAI остаётся основным
production-маршрутом. OpenRouter имеет смысл оставить для будущего fallback,
быстрой замены моделей и единого multi-provider API. Следующий объективный шаг —
30 пар в разное время суток и отдельный multi-agent benchmark с одинаковыми
tools, turn limits и критериями успеха.

## 5. OpenAI multi-agent SEO benchmark

Это отдельный realistic-сценарий, который не заменяет дешёвый Page Audit:

```text
SEO Orchestrator
  → Technical SEO Agent
      → scrape_page tool
          → Firecrawl
  → SEO QA Agent
  → structured final report
```

Каждый специалист является настоящим OpenAI `Agent`, а оркестратор вызывает
их через `Agent.as_tool()`. Endpoint собирает lifecycle events для каждого
agent/LLM/tool шага, общий usage вложенных запусков и OpenAI trace ID.

Ограничения benchmark:

- максимум 7 ходов оркестратора;
- максимум 4 хода Technical SEO Agent;
- максимум 2 хода SEO QA Agent;
- максимум один платный Firecrawl-вызов;
- allowlist доменов и повторная проверка URL внутри tool;
- page-derived text всегда считается недоверенными данными;
- workflow считается успешным только после `agent_end` всех трёх агентов и
  при отсутствии failed tools.

Деплой:

```bash
.venv/bin/python -m modal deploy modal/openai_multiagent.py --env dev
```

URL защищённой функции записывается в `.env.local`:

```dotenv
MODAL_OPENAI_AGENT_URL=https://...modal.run
```

### Измеренный multi-agent результат

Проверено 18 июля 2026 на `https://viralbrigde.com`, build
`openai-multiagent-2026-07-18-v3`.

| Проверка | Результат |
| --- | --- |
| HTTP / workflow | 200 / complete |
| Завершившиеся агенты | 3 / 3 |
| Agents | Orchestrator, Technical SEO, SEO QA |
| Tool calls | 3 |
| Failed tools | 0 |
| Firecrawl | 1 paid call, 1 credit, 242 мс |
| OpenAI model requests | 6 |
| Input / cached / output tokens | 6 538 / 1 366 / 3 333 |
| Total tokens | 9 871 |
| Расчётная модельная стоимость | $0.0253066 |
| Agent run | 26.80 сек |
| Полный Next gateway | 27.73 сек |
| QA status | needs_revision |

QA Agent обнаружил важную проблему: пустой Firecrawl payload нельзя
интерпретировать как доказательство отсутствия HTML-элементов или
индексируемого контента. Оркестратор сохранил это различие в финальном отчёте.

Сравнение с контролируемым one-call workflow на том же домене:

| Метрика | Audit + one OpenAI call | Multi-agent |
| --- | ---: | ---: |
| Model requests | 1 | 6 |
| Total tokens | 1 835 | 9 871 |
| Model cost | $0.0057250 | $0.0253066 |
| Первый полный путь | около 15.3 сек | 27.73 сек |
| Firecrawl | 1 credit | 1 credit |

Multi-agent использовал примерно в 5.4 раза больше токенов и стоил примерно
в 4.4 раза дороже по модели. Его полезное отличие в этом прогоне — независимый
QA поймал неподтверждённые выводы. Однако `viralbrigde.com` вернул пустой
контент, поэтому этот запуск проверяет orchestration и reliability, а не
качество анализа содержательной SEO-страницы.

Во время настройки выполнено три успешных платных multi-agent прогона:
суммарно `$0.0713828` model cost и `3` Firecrawl credits. Предварительные
запуски, упавшие до agent loop, не вызвали OpenAI или Firecrawl.

По эксплуатационным цифрам финальный прогон быстрее и дешевле присланного
realistic BCRM benchmark (`~69 сек / $0.20` direct Anthropic), но это разные
задачи и объёмы работы. Эти значения нельзя использовать как доказательство
преимущества OpenAI над Claude без одинаковых prompt, tools, данных и критериев
качества.

### Проверка содержательной страницы anselat.lv/en

Проверено 18 июля 2026.

Детерминированный Page Audit:

| Метрика | Результат |
| --- | --- |
| HTTP / canonical / language | 200 / `https://anselat.lv/en` / `en` |
| SEO score | 85 / 100, good |
| Title / description | 48 / 157 символов |
| Word count | 306 |
| Internal / external links | 12 / 1 |
| Images without alt | 27 из 31 |
| H1 | 2 |
| Structured data | 0 blocks |
| Полный gateway | 9.05 сек |
| Firecrawl / rules | 2.88 сек / 88 мс |
| Стоимость | 1 Firecrawl credit, $0 model cost |

Основные проверенные проблемы:

1. `27` из `31` изображений не имеют непустого `alt`;
2. найдено два H1, причём второй — сообщение успешной отправки формы;
3. structured data отсутствует, но это требует проверки применимости, а не
   автоматического штрафа.

One-call OpenAI brief:

| Метрика | Результат |
| --- | --- |
| HTTP / structured output | 200 / success |
| Полный gateway / OpenAI | 13.13 / 7.66 сек |
| Tokens | 1 756 |
| Model cost | $0.0059010 |
| Главные приоритеты | alt изображений, структура H1 |

Multi-agent v6:

| Метрика | Результат |
| --- | --- |
| Workflow | complete |
| Agents completed | 3 / 3 |
| Tools succeeded | 3 / 3 |
| Model requests | 6 |
| Tokens | 10 876 |
| Model cost | $0.0312357 |
| Firecrawl | 1 credit, 3.18 сек |
| Agent run / gateway | 42.70 / 44.09 сек |
| QA verdict | needs_revision |

Multi-agent оказался примерно в `5.3` раза дороже one-call по модели и примерно
в `3.4` раза медленнее по gateway. QA корректно остановил неподтверждённые
формулировки, но выявилось ограничение самого tool contract: multi-agent
`scrape_page` получает урезанный набор полей и не видит полный детерминированный
аудит. Поэтому он пометил canonical как непроверенный и не выделил `27`
изображений без alt, хотя Page Audit уже располагал этими фактами.

Production-вывод: Technical SEO Agent должен получать готовый полный Page Audit
JSON или вызывать `run_page_audit` tool, а не повторно сканировать страницу
упрощённым scraper. Это убирает второй Firecrawl credit, снижает токены и даёт
QA одинаковый источник фактов.

Во время anselat-теста вместе с tuning-прогонами потрачено `$0.1100511` model
cost и `5` Firecrawl credits. Из них финальный сравнительный набор потребовал
`$0.0371367` model cost и `2` Firecrawl credits: Page Audit + one-call brief +
успешный multi-agent v6.

## 6. Claude Sonnet 5: direct, OpenRouter и Agent SDK

### Claude direct vs OpenRouter → Anthropic

Проверено 19 июля 2026 на том же Page Audit `https://anselat.lv/en`, который
использовался для OpenAI transport benchmark.

Оба параллельных запроса используют:

- Claude Sonnet 5;
- Anthropic Messages API payload;
- одинаковые system prompt, user input и JSON Schema;
- `thinking: disabled`;
- Strict Structured Output;
- ноль клиентских retries;
- только upstream provider `Anthropic`;
- отключённый OpenRouter fallback.

| Метрика | Anthropic direct | OpenRouter → Anthropic BYOK |
| --- | ---: | ---: |
| Успешные ответы | 4 / 4 | 4 / 4 |
| Strict Structured Output | 4 / 4 | 4 / 4 |
| Input tokens на вызов | 1 812 | 1 812 |
| Всего tokens | 13 224 | 13 220 |
| Среднее tokens на вызов | 3 306 | 3 305 |
| Latency min | 20.388 сек | 19.390 сек |
| Latency median | 21.641 сек | 22.007 сек |
| Latency avg | 21.862 сек | 21.866 сек |
| Latency max | 23.778 сек | 24.059 сек |
| Средняя расчётная стоимость | $0.018564 | $0.018554 |
| Общая расчётная стоимость | $0.074256 | $0.074216 |

Разница средней latency составила только `4 мс`, то есть в пределах шума.
OpenRouter metadata во всех четырёх вызовах подтвердил:

| Поле | Результат |
| --- | --- |
| `is_byok` | `true` |
| selected provider | `Anthropic` |
| selected model | `anthropic/claude-sonnet-5-20260630` |
| router strategy | `direct` |
| router attempt | `1` |
| fallback | отключён |
| router region | `CDG` |

Расчёт использует вводную цену Claude Sonnet 5 до 31 августа 2026:
`$2 / MTok input` и `$10 / MTok output`. С 1 сентября значения нужно заменить
на стандартные `$3 / $15`. Актуальные ставки опубликованы в
[Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing).

Общая расчётная стоимость восьми успешных provider calls — `$0.148472`.
OpenRouter вернул `reported_cost_usd=0`, потому что использовался BYOK; расход
прошёл через Anthropic account.

### Claude Sonnet 5 vs OpenAI GPT-5.6 Luna

Сравнение one-call workflow на одном сайте и одной структуре SEO-задания:

| Метрика | OpenAI direct | Claude direct |
| --- | ---: | ---: |
| Успешные ответы | 4 / 4 | 4 / 4 |
| Средняя latency | 5.315 сек | 21.862 сек |
| Median latency | 5.460 сек | 21.641 сек |
| Среднее tokens | 1 727 | 3 306 |
| Средняя стоимость | $0.0057105 | $0.018564 |
| Типичное число top actions | 3 | 4–5 |

На этом конкретном коротком SEO brief Claude:

- примерно в `4.11` раза медленнее;
- использовал примерно в `1.91` раза больше tokens;
- стоил примерно в `3.25` раза дороже.

Обе модели стабильно выделили изображения без `alt` и структуру H1. OpenAI
осторожно предлагал оценить применимость structured data. Claude во всех
прогонах ставил внедрение Schema.org как medium priority и иногда добавлял
расширение текста или изменение ссылок, хотя детерминированный audit не
подтверждал, что это реальные проблемы. Для этого узкого production-действия
OpenAI оказался более коротким и точным, а Claude — более подробным, но шумным.

Это не доказывает общее превосходство OpenAI: модели имеют разные токенизаторы,
цены и сильные стороны. Результат относится только к текущему SEO prompt,
Structured Output schema и `thinking: disabled`.

### Claude Agent SDK + Firecrawl

Проверен полный цикл:

```text
Next/Modal
  → Claude Agent SDK
  → ToolSearch
  → MCP scrape_page
  → Firecrawl
  → Claude final answer
```

| Метрика | Первый прогон | Warm-повтор |
| --- | ---: | ---: |
| Workflow | success | success |
| Agent turns | 3 | 3 |
| Firecrawl calls | 1 | 1 |
| Firecrawl latency | 768 мс | 455 мс |
| Полный wall time | 29.032 сек | 23.432 сек |
| Cache creation tokens | 21 087 | 6 631 |
| Cache read tokens | 35 710 | 50 265 |
| Output tokens | 1 603 | 1 271 |
| Agent SDK cost estimate | $0.114545 | $0.059722 |
| Текущий promo-price расчёт | $0.075902 | $0.039353 |

Agent SDK estimate использует стандартные ставки `$3 / $15` и поэтому до
31 августа завышает текущую цену примерно в 1.5 раза. Endpoint теперь отдельно
возвращает `current_pricing_estimate_usd`, рассчитанный по настроенным тарифам.
Авторитетную фактическую стоимость всё равно нужно сверять в Claude Console.

Warm Agent SDK прогон оказался быстрее OpenAI multi-agent v6:
`23.43` против `44.09` секунды. Однако это не одинаковые workflow: Claude-тест
использует одного агента, а OpenAI-тест — Orchestrator, Technical SEO и QA.
Даже warm Claude single-agent по текущей цене стоил примерно в `1.26` раза
дороже OpenAI three-agent запуска: `$0.03935` против `$0.03124`.

Главный источник стоимости Claude Agent SDK — большой системный контекст и
cache tokens, а не 5 360 символов страницы. Для массового SEO-аудита Agent SDK
нельзя вызывать на каждую страницу; сначала должен работать дешёвый Page Audit
и one-call brief.

### Исторический pre-credit baseline

До пополнения Anthropic balance были отдельно проверены:

| Проверка | Результат |
| --- | --- |
| Claude Agent SDK | 0.2.122 |
| Anthropic authentication | ключ принят |
| Ответ при нулевом балансе | `credit balance is too low` |
| Next → Modal warm без model run | 2.09 сек |
| Анонимный Agent endpoint | 401 |
| URL validation | 400 |

## 7. Claude Secret

Для повторной настройки создать `modal/.env.claude` по примеру
`modal/.env.claude.example`:

```dotenv
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-sonnet-5
CLAUDE_INPUT_PRICE_PER_MILLION=2
CLAUDE_OUTPUT_PRICE_PER_MILLION=10
```

Загрузить отдельный Claude secret:

```bash
.venv/bin/python -m modal secret create viralbridge-claude-dev \
  --from-dotenv modal/.env.claude
```

## 8. Защита endpoint

Создать Modal Proxy Token:

```bash
.venv/bin/python -m modal workspace proxy-tokens create
```

Команда один раз покажет `Modal-Key` и `Modal-Secret`. Записать их в
`.env.local`:

```dotenv
MODAL_PROXY_TOKEN_ID=wk-...
MODAL_PROXY_TOKEN_SECRET=ws-...
```

## 9. Деплой Modal Functions

```bash
.venv/bin/python -m modal deploy modal/page_audit.py
.venv/bin/python -m modal deploy modal/openai_seo.py --env dev
.venv/bin/python -m modal deploy modal/openai_multiagent.py --env dev
.venv/bin/python -m modal deploy modal/provider_benchmark.py --env dev
.venv/bin/python -m modal deploy modal/claude_provider_benchmark.py --env dev
.venv/bin/python -m modal deploy modal/smoke.py
```

Команды напечатают URL функций. Записать их в `.env.local`:

```dotenv
MODAL_AUDIT_URL=https://...modal.run
MODAL_OPENAI_URL=https://...modal.run
MODAL_OPENAI_AGENT_URL=https://...modal.run
MODAL_PROVIDER_BENCHMARK_URL=https://...modal.run
MODAL_CLAUDE_PROVIDER_BENCHMARK_URL=https://...modal.run
MODAL_AGENT_URL=https://...modal.run
```

## 10. Запуск

```bash
npm run dev
```

Открыть `http://localhost:3000`, оставить `https://example.com` и запустить
Page Audit, затем нажать `Сделать AI-приоритизацию`.

## Критерии успеха Page Audit

1. `gateway.modal_status` равен `200`;
2. `audit.ok` равен `true`;
3. `audit.mode` равен `deterministic_page_audit_v1`;
4. `audit.score.value` заполнен;
5. `audit.findings` содержит детерминированные наблюдения;
6. `audit.usage.firecrawl_credits` равен `1`;
7. `audit.usage.llm_calls` и `llm_tokens` равны `0`;
8. warm-запрос завершается быстрее 2 секунд на контрольной странице.

## Критерии успеха Claude Agent

Эксперимент считается успешным, если:

1. `gateway.modal_status` равен `200`;
2. `modal.ok` равен `true`;
3. `modal.tool_calls[0].name` равен `scrape_page`;
4. `modal.tool_calls[0].status` равен `success`;
5. `modal.observed_tool_uses` содержит `mcp__firecrawl__scrape_page`;
6. `modal.answer` содержит данные страницы и URL источника;
7. `modal.metrics.usage` и `estimated_cost_usd` заполнены;
8. полный запрос завершается быстрее 145 секунд.

## Что тест пока не проверяет

- Postgres и сохранение сессий;
- Telegram webhooks;
- очереди для задач дольше 150 секунд;
- параллельную нагрузку;
- Claude multi-agent orchestration, аналогичный OpenAI v6;
- Claude Agent SDK через OpenRouter;
- качество полноценного нишевого исследования;
- production SLA и data residency.
