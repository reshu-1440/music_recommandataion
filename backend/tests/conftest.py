import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"

# Guarantee FAISS and its OpenMP runtime are initialized first
import faiss
import pytest
from backend.app.config import settings


@pytest.fixture(autouse=True)
def configure_test_environment(monkeypatch):
    """Ensure tests run offline without network latency unless RUN_LIVE_GEMINI is set."""
    if not os.getenv("RUN_LIVE_GEMINI"):
        monkeypatch.setattr(settings, "gemini_api_key", "")
