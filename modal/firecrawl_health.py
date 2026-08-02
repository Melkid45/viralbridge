import time

import modal

image = modal.Image.debian_slim(python_version="3.11").uv_pip_install(
    "fastapi[standard]>=0.115,<1",
    "httpx>=0.28,<1",
)

app = modal.App("viralbridge-firecrawl-health")


def perform_scrape(url: str):
    import os
    from urllib.parse import urlparse

    import httpx

    started_at = time.perf_counter()
    hostname = (urlparse(url).hostname or "").lower()
    allowed_hosts = {"example.com", "firecrawl.dev", "www.firecrawl.dev"}

    if hostname not in allowed_hosts:
        return {
            "ok": False,
            "stage": "validation",
            "error": f"Host is not allowed: {hostname}",
        }

    api_key = os.getenv("FIRECRAWL_API_KEY")
    if not api_key:
        return {
            "ok": False,
            "stage": "configuration",
            "error": "FIRECRAWL_API_KEY is missing",
        }

    try:
        response = httpx.post(
            "https://api.firecrawl.dev/v2/scrape",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "url": url,
                "formats": ["markdown"],
                "onlyMainContent": True,
                "storeInCache": False,
            },
            timeout=45,
        )
        response.raise_for_status()
        payload = response.json()
        page = payload.get("data") or {}
        metadata = page.get("metadata") or {}
        markdown = str(page.get("markdown") or "")

        return {
            "ok": True,
            "stage": "complete",
            "http_status": response.status_code,
            "source_url": metadata.get("sourceURL") or url,
            "title": metadata.get("title"),
            "markdown_characters": len(markdown),
            "markdown_preview": markdown[:300],
            "credits_used": payload.get("creditsUsed"),
            "elapsed_ms": round((time.perf_counter() - started_at) * 1000),
        }
    except httpx.HTTPStatusError as error:
        return {
            "ok": False,
            "stage": "firecrawl_http",
            "http_status": error.response.status_code,
            "error": error.response.text[:500],
            "elapsed_ms": round((time.perf_counter() - started_at) * 1000),
        }
    except Exception as error:
        return {
            "ok": False,
            "stage": "firecrawl_request",
            "error_type": type(error).__name__,
            "error": str(error)[:500],
            "elapsed_ms": round((time.perf_counter() - started_at) * 1000),
        }


function_options = {
    "image": image,
    "secrets": [modal.Secret.from_name("viralbridge-firecrawl-dev")],
    "cpu": 0.125,
    "memory": 256,
    "timeout": 60,
}


@app.function(**function_options)
def scrape_health(url: str = "https://example.com"):
    return perform_scrape(url)


@app.function(**function_options)
@modal.fastapi_endpoint(
    method="POST",
    docs=False,
    requires_proxy_auth=True,
)
def scrape_endpoint(data: dict):
    from fastapi import HTTPException

    url = str(data.get("url") or "https://example.com")
    result = perform_scrape(url)
    result["request_id"] = data.get("request_id")
    result["mode"] = "firecrawl_only"
    status_by_stage = {
        "complete": 200,
        "validation": 400,
        "configuration": 500,
        "firecrawl_http": 502,
        "firecrawl_request": 502,
    }
    status_code = status_by_stage.get(result.get("stage"), 500)
    if status_code != 200:
        raise HTTPException(status_code=status_code, detail=result)
    return result


@app.local_entrypoint()
def main(url: str = "https://example.com"):
    started_at = time.perf_counter()
    result = scrape_health.remote(url)
    result["round_trip_ms"] = round((time.perf_counter() - started_at) * 1000)
    print(result)
