import modal

image = modal.Image.debian_slim(python_version="3.11").uv_pip_install(
    "beautifulsoup4>=4.13,<5",
    "fastapi[standard]>=0.115,<1",
    "httpx>=0.28,<1",
)

app = modal.App("viralbridge-page-audit")


def normalize_text(value):
    if value is None:
        return None
    normalized = " ".join(str(value).split())
    return normalized or None


def audit_html(source_url: str, raw_html: str, markdown: str, metadata: dict):
    import json
    import re
    from urllib.parse import urljoin, urlparse

    from bs4 import BeautifulSoup

    soup = BeautifulSoup(raw_html or "", "html.parser")
    source_host = (urlparse(source_url).hostname or "").lower()

    title = normalize_text(metadata.get("title"))
    if not title and soup.title:
        title = normalize_text(soup.title.get_text(" ", strip=True))

    def meta_content(*, name=None, property_name=None):
        attributes = {}
        if name:
            attributes["name"] = lambda value: value and value.lower() == name.lower()
        if property_name:
            attributes["property"] = (
                lambda value: value and value.lower() == property_name.lower()
            )
        tag = soup.find("meta", attrs=attributes)
        return normalize_text(tag.get("content")) if tag else None

    description = normalize_text(metadata.get("description")) or meta_content(
        name="description"
    )
    robots = meta_content(name="robots")

    canonical = None
    for link_tag in soup.find_all("link", href=True):
        rel_values = [str(value).lower() for value in (link_tag.get("rel") or [])]
        if "canonical" in rel_values:
            canonical = urljoin(source_url, str(link_tag["href"]))
            break

    headings = {}
    for level in range(1, 7):
        headings[f"h{level}"] = [
            text
            for tag in soup.find_all(f"h{level}")
            if (text := normalize_text(tag.get_text(" ", strip=True)))
        ]

    content_root = soup.find("main") or soup.find("article") or soup.body or soup
    for tag in content_root.find_all(["script", "style", "noscript", "svg"]):
        tag.decompose()
    visible_text = normalize_text(content_root.get_text(" ", strip=True)) or ""
    words = re.findall(r"\b[\w’'-]+\b", visible_text, flags=re.UNICODE)

    internal_links = set()
    external_links = set()
    for link_tag in soup.find_all("a", href=True):
        href = str(link_tag["href"]).strip()
        if not href or href.startswith(("#", "mailto:", "tel:", "javascript:")):
            continue
        absolute_url = urljoin(source_url, href)
        parsed_link = urlparse(absolute_url)
        if parsed_link.scheme not in {"http", "https"} or not parsed_link.hostname:
            continue
        normalized_url = parsed_link._replace(fragment="").geturl()
        if parsed_link.hostname.lower() == source_host:
            internal_links.add(normalized_url)
        else:
            external_links.add(normalized_url)

    images = soup.find_all("img")
    images_without_alt = [
        urljoin(source_url, str(image_tag.get("src") or ""))
        for image_tag in images
        if not normalize_text(image_tag.get("alt"))
    ]

    json_ld_blocks = []
    for script_tag in soup.find_all("script", attrs={"type": "application/ld+json"}):
        raw_json = script_tag.string or script_tag.get_text()
        if not normalize_text(raw_json):
            continue
        try:
            json_ld_blocks.append(json.loads(raw_json))
        except json.JSONDecodeError:
            json_ld_blocks.append({"invalid_json": True})

    html_tag = soup.find("html")
    language = normalize_text(metadata.get("language"))
    if not language and html_tag:
        language = normalize_text(html_tag.get("lang"))

    charset_tag = soup.find("meta", charset=True)
    viewport = meta_content(name="viewport")
    status_code = metadata.get("statusCode")
    try:
        status_code = int(status_code) if status_code is not None else None
    except (TypeError, ValueError):
        status_code = None

    page = {
        "title": title,
        "title_length": len(title) if title else 0,
        "description": description,
        "description_length": len(description) if description else 0,
        "language": language,
        "canonical": canonical,
        "robots": robots,
        "status_code": status_code,
        "content_type": metadata.get("contentType"),
        "word_count": len(words),
        "headings": headings,
        "internal_links_count": len(internal_links),
        "external_links_count": len(external_links),
        "internal_links_sample": sorted(internal_links)[:20],
        "external_links_sample": sorted(external_links)[:20],
        "images_count": len(images),
        "images_without_alt_count": len(images_without_alt),
        "images_without_alt_sample": images_without_alt[:20],
        "structured_data_blocks": len(json_ld_blocks),
        "invalid_structured_data_blocks": sum(
            1
            for block in json_ld_blocks
            if isinstance(block, dict) and block.get("invalid_json")
        ),
        "open_graph": {
            "title": meta_content(property_name="og:title"),
            "description": meta_content(property_name="og:description"),
            "image": meta_content(property_name="og:image"),
        },
        "viewport": viewport,
        "charset": normalize_text(charset_tag.get("charset")) if charset_tag else None,
        "raw_html_characters": len(raw_html),
        "markdown_characters": len(markdown),
    }

    findings = []
    total_deduction = 0

    def add_finding(
        code: str,
        severity: str,
        title_text: str,
        detail: str,
        recommendation: str,
        deduction: int,
    ):
        nonlocal total_deduction
        total_deduction += deduction
        findings.append(
            {
                "code": code,
                "severity": severity,
                "title": title_text,
                "detail": detail,
                "recommendation": recommendation,
                "score_deduction": deduction,
            }
        )

    if status_code and status_code >= 400:
        add_finding(
            "http_error",
            "high",
            f"Страница отвечает HTTP {status_code}",
            "Поисковый робот и пользователи могут не получить содержимое страницы.",
            "Исправить HTTP-ответ или целевой URL.",
            30,
        )
    elif status_code and status_code >= 300:
        add_finding(
            "http_redirect",
            "medium",
            f"Страница отвечает HTTP {status_code}",
            "Аудит выполняется для URL, который возвращает перенаправление.",
            "Проверить конечный URL и внутренние ссылки на него.",
            10,
        )

    if not title:
        add_finding(
            "missing_title",
            "high",
            "Отсутствует title",
            "У страницы не найден HTML title.",
            "Добавить уникальный и описательный title.",
            20,
        )
    elif len(title) < 30:
        add_finding(
            "short_title",
            "low",
            "Короткий title",
            f"Длина title — {len(title)} символов; это эвристика, а не требование поисковика.",
            "Проверить, достаточно ли title описывает страницу и поисковый интент.",
            5,
        )
    elif len(title) > 60:
        add_finding(
            "long_title",
            "medium",
            "Длинный title",
            f"Длина title — {len(title)} символов; сниппет может отображаться не полностью.",
            "Сделать title компактнее, сохранив основную тему страницы.",
            5,
        )

    if not description:
        add_finding(
            "missing_description",
            "medium",
            "Отсутствует meta description",
            "Поисковая система будет формировать описание сниппета самостоятельно.",
            "Добавить полезное описание страницы без переспама.",
            10,
        )
    elif len(description) < 70:
        add_finding(
            "short_description",
            "low",
            "Короткий meta description",
            f"Длина description — {len(description)} символов.",
            "Проверить, раскрывает ли description ценность страницы.",
            3,
        )
    elif len(description) > 160:
        add_finding(
            "long_description",
            "low",
            "Длинный meta description",
            f"Длина description — {len(description)} символов.",
            "Сократить описание до основной мысли и призыва к переходу.",
            3,
        )

    h1_count = len(headings["h1"])
    if h1_count == 0:
        add_finding(
            "missing_h1",
            "medium",
            "Отсутствует H1",
            "На странице не найден заголовок первого уровня.",
            "Добавить один понятный заголовок, описывающий содержание страницы.",
            10,
        )
    elif h1_count > 1:
        add_finding(
            "multiple_h1",
            "low",
            "Несколько H1",
            f"На странице найдено H1: {h1_count}.",
            "Проверить семантическую структуру и необходимость каждого H1.",
            5,
        )

    if not canonical:
        add_finding(
            "missing_canonical",
            "low",
            "Отсутствует canonical",
            "Не найден link rel=canonical.",
            "Добавить self-referencing canonical, если это соответствует стратегии индексации.",
            5,
        )

    if robots and "noindex" in robots.lower():
        add_finding(
            "noindex",
            "high",
            "Страница закрыта от индексации",
            f"Meta robots содержит: {robots}.",
            "Проверить, является ли noindex намеренным.",
            20,
        )

    if len(words) < 100:
        add_finding(
            "thin_content",
            "low",
            "Мало видимого текста",
            f"Найдено примерно {len(words)} слов; это эвристика и зависит от типа страницы.",
            "Проверить, достаточно ли контента для удовлетворения пользовательского интента.",
            5,
        )

    if images_without_alt:
        deduction = min(10, len(images_without_alt) * 2)
        add_finding(
            "images_without_alt",
            "medium",
            "Изображения без alt",
            f"Без непустого alt найдено изображений: {len(images_without_alt)}.",
            "Добавить содержательные alt для информативных изображений.",
            deduction,
        )

    if not language:
        add_finding(
            "missing_language",
            "low",
            "Не указан язык документа",
            "Не найден атрибут lang у HTML-документа.",
            "Добавить корректный атрибут lang.",
            2,
        )

    if not viewport:
        add_finding(
            "missing_viewport",
            "low",
            "Не найден meta viewport",
            "Страница может некорректно отображаться на мобильных устройствах.",
            "Добавить стандартный meta viewport и проверить мобильную версию.",
            2,
        )

    severity_order = {"high": 0, "medium": 1, "low": 2}
    findings.sort(
        key=lambda finding: (
            severity_order.get(finding["severity"], 3),
            -finding["score_deduction"],
            finding["code"],
        )
    )

    score_value = max(0, 100 - total_deduction)
    if score_value >= 90:
        score_label = "excellent"
    elif score_value >= 75:
        score_label = "good"
    elif score_value >= 50:
        score_label = "needs_work"
    else:
        score_label = "poor"

    top_findings = findings[:3]
    if top_findings:
        finding_summary = "; ".join(
            f"{finding['title']} ({finding['severity']})"
            for finding in top_findings
        )
    else:
        finding_summary = "существенных проблем по правилам v1 не найдено"

    mock_summary = (
        f"Детерминированный аудит страницы {source_url}: "
        f"{score_value}/100 ({score_label}). "
        f"Проверено без LLM. Основные наблюдения: {finding_summary}."
    )

    return {
        "page": page,
        "findings": findings,
        "score": {
            "value": score_value,
            "max": 100,
            "label": score_label,
            "total_deduction": total_deduction,
            "method": "viralbridge_page_rules_v1",
        },
        "mock_provider": {
            "name": "deterministic-template",
            "llm_used": False,
            "input_tokens": 0,
            "output_tokens": 0,
            "estimated_cost_usd": 0,
            "summary": mock_summary,
        },
    }


@app.function(
    image=image,
    secrets=[modal.Secret.from_name("viralbridge-firecrawl-dev")],
    cpu=0.25,
    memory=512,
    timeout=90,
    scaledown_window=60,
)
@modal.fastapi_endpoint(
    method="POST",
    docs=False,
    requires_proxy_auth=True,
)
def audit_endpoint(data: dict):
    import os
    import time
    from urllib.parse import urlparse

    import httpx
    from fastapi import HTTPException

    request_started = time.perf_counter()
    request_id = str(data.get("request_id") or "").strip()
    target_url = str(data.get("url") or "").strip()

    if not request_id:
        raise HTTPException(status_code=400, detail="request_id is required")

    parsed_url = urlparse(target_url)
    if (
        parsed_url.scheme not in {"http", "https"}
        or not parsed_url.hostname
        or parsed_url.username
        or parsed_url.password
    ):
        raise HTTPException(status_code=400, detail="A valid public http(s) URL is required")

    allowed_hosts = {
        host.strip().lower()
        for host in os.getenv(
            "ALLOWED_AUDIT_HOSTS",
            (
                "example.com,firecrawl.dev,www.firecrawl.dev,"
                "viralbrigde.com,www.viralbrigde.com,"
                "anselat.lv,www.anselat.lv"
            ),
        ).split(",")
        if host.strip()
    }
    hostname = parsed_url.hostname.lower()
    if hostname not in allowed_hosts:
        raise HTTPException(
            status_code=400,
            detail=f"Host is not allowed for this audit test: {hostname}",
        )

    firecrawl_key = os.getenv("FIRECRAWL_API_KEY")
    if not firecrawl_key:
        raise HTTPException(status_code=500, detail="FIRECRAWL_API_KEY is missing")

    firecrawl_started = time.perf_counter()
    try:
        response = httpx.post(
            "https://api.firecrawl.dev/v2/scrape",
            headers={
                "Authorization": f"Bearer {firecrawl_key}",
                "Content-Type": "application/json",
            },
            json={
                "url": target_url,
                "formats": ["markdown", "rawHtml", "links"],
                "onlyMainContent": False,
                "onlyCleanContent": False,
                "maxAge": 172_800_000,
                "proxy": "basic",
                "storeInCache": True,
                "timeout": 30_000,
            },
            timeout=45,
        )
        response.raise_for_status()
        payload = response.json()
    except httpx.HTTPStatusError as error:
        raise HTTPException(
            status_code=502,
            detail={
                "stage": "firecrawl_http",
                "http_status": error.response.status_code,
                "error": error.response.text[:1_000],
            },
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail={
                "stage": "firecrawl_request",
                "error_type": type(error).__name__,
                "error": str(error)[:1_000],
            },
        ) from error

    firecrawl_ms = round((time.perf_counter() - firecrawl_started) * 1000)
    scrape_data = payload.get("data") or {}
    metadata = scrape_data.get("metadata") or {}
    raw_html = str(scrape_data.get("rawHtml") or scrape_data.get("html") or "")
    markdown = str(scrape_data.get("markdown") or "")

    audit_started = time.perf_counter()
    audit = audit_html(
        source_url=metadata.get("sourceURL") or target_url,
        raw_html=raw_html,
        markdown=markdown,
        metadata=metadata,
    )
    audit_ms = round((time.perf_counter() - audit_started) * 1000)
    reported_firecrawl_credits = payload.get("creditsUsed")
    estimated_firecrawl_credits = (
        reported_firecrawl_credits
        if isinstance(reported_firecrawl_credits, (int, float))
        else 1
    )

    return {
        "ok": True,
        "stage": "complete",
        "mode": "deterministic_page_audit_v1",
        "request_id": request_id,
        "source_url": metadata.get("sourceURL") or target_url,
        **audit,
        "usage": {
            "firecrawl_credits": estimated_firecrawl_credits,
            "firecrawl_credits_reported": reported_firecrawl_credits,
            "firecrawl_credit_basis": (
                "api_response"
                if reported_firecrawl_credits is not None
                else "documented_basic_scrape_cost"
            ),
            "llm_calls": 0,
            "llm_tokens": 0,
            "llm_cost_usd": 0,
        },
        "timings": {
            "firecrawl_ms": firecrawl_ms,
            "audit_ms": audit_ms,
            "total_modal_ms": round(
                (time.perf_counter() - request_started) * 1000
            ),
        },
        "runtime": {
            "modal_function": "viralbridge-page-audit.audit_endpoint",
            "rules_version": "v1",
        },
    }


@app.local_entrypoint()
def main(url: str = "https://example.com"):
    import time

    started_at = time.perf_counter()
    result = audit_endpoint.remote(
        {
            "request_id": "modal-local-entrypoint",
            "url": url,
        }
    )
    result["round_trip_ms"] = round((time.perf_counter() - started_at) * 1000)
    print(result)
