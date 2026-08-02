import os
import platform
import time

import modal

app = modal.App("viralbridge-modal-health")


@app.function(
    image=modal.Image.debian_slim(python_version="3.11"),
    cpu=0.125,
    memory=128,
    timeout=30,
)
def health():
    started_at = time.perf_counter()
    return {
        "ok": True,
        "service": "viralbridge-modal-health",
        "environment": os.getenv("MODAL_ENVIRONMENT", "dev"),
        "python": platform.python_version(),
        "elapsed_ms": round((time.perf_counter() - started_at) * 1000, 3),
    }


@app.local_entrypoint()
def main():
    started_at = time.perf_counter()
    result = health.remote()
    result["round_trip_ms"] = round((time.perf_counter() - started_at) * 1000)
    print(result)
