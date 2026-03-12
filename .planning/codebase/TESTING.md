# Testing Patterns

**Analysis Date:** 2026-03-12

## Test Framework

**Runner:**
- Not yet configured. No test framework is installed or configured.
- No `pytest`, `unittest`, `nose2`, or other test runner detected in `requirements.txt` or elsewhere.

**Assertion Library:**
- Not yet configured.

**Run Commands:**
```bash
# No test commands available yet
```

## Current State

This is a bootstrap-stage codebase (single commit: "Bootstrap 3-layer agent architecture"). No tests exist. The codebase contains one Python module (`execution/utils.py`) with 6 small utility functions that are all testable.

## Recommended Setup

Based on the existing stack (Python 3.10+, `requirements.txt` for dependency management), the following setup aligns with the codebase conventions.

**Prescriptive -- when tests are added:**

1. Use `pytest` as the test runner (add `pytest>=8.0.0` to `requirements.txt`)
2. Create test files as siblings or in a `tests/` directory at the project root
3. Follow the naming convention `test_<module>.py` (e.g., `tests/test_utils.py`)

## Test File Organization

**Location:**
- No test files exist yet.
- Prescriptive: Use a top-level `tests/` directory at the project root.

**Naming:**
- Prescriptive: `test_<module_name>.py` (e.g., `tests/test_utils.py`)

**Recommended Structure:**
```
tests/
├── conftest.py          # Shared fixtures
├── test_utils.py        # Tests for execution/utils.py
└── ...                  # One test file per execution script
```

## Test Structure

**Recommended Suite Organization (matching codebase style):**
```python
"""Tests for execution/utils."""

import json
from pathlib import Path

from execution.utils import load_env, get_logger, tmp_path, write_json, read_json, timestamp


class TestLoadEnv:
    """Tests for load_env()."""

    def test_loads_env_from_file(self, tmp_path_factory):
        env_file = tmp_path_factory.mktemp("env") / ".env"
        env_file.write_text("FOO=bar\n")
        load_env(env_file)
        assert os.environ.get("FOO") == "bar"

    def test_skips_missing_file(self):
        """Should not raise when .env does not exist."""
        load_env(Path("/nonexistent/.env"))  # no error


class TestWriteJson:
    """Tests for write_json()."""

    def test_creates_parent_dirs(self, tmp_path_factory):
        target = tmp_path_factory.mktemp("json") / "sub" / "data.json"
        result = write_json({"key": "value"}, target)
        assert result == target
        assert target.exists()
```

**Patterns:**
- Group tests by function/class using `class Test<FunctionName>`
- Use descriptive `test_<behavior>` method names
- Use pytest's built-in `tmp_path_factory` for filesystem tests (avoids conflicts with `utils.tmp_path`)

## Mocking

**Framework:** Not yet configured. Use `unittest.mock` (stdlib) or `pytest-mock`.

**Recommended Patterns:**
```python
from unittest.mock import patch

class TestLoadEnv:
    @patch.dict("os.environ", {}, clear=True)
    def test_does_not_overwrite_existing(self, tmp_path_factory):
        """os.environ.setdefault should preserve existing values."""
        os.environ["KEY"] = "original"
        env_file = tmp_path_factory.mktemp("env") / ".env"
        env_file.write_text("KEY=overwritten\n")
        load_env(env_file)
        assert os.environ["KEY"] == "original"
```

**What to Mock:**
- `os.environ` when testing `load_env()` to avoid polluting test environment
- External API calls (when `requests` is used in future execution scripts)
- File system operations only when necessary; prefer real temp files via `tmp_path_factory`

**What NOT to Mock:**
- `pathlib.Path` operations -- use real temp directories instead
- `json.dump`/`json.load` -- test real serialization
- `logging` -- use `caplog` fixture from pytest to capture and assert log output

## Fixtures and Factories

**Test Data:**
- No fixtures or factories exist yet.

**Recommended Location:**
- `tests/conftest.py` for shared pytest fixtures

**Recommended Fixture Pattern:**
```python
# tests/conftest.py
import pytest
from pathlib import Path

@pytest.fixture
def sample_env_file(tmp_path):
    """Create a temporary .env file with test values."""
    env = tmp_path / ".env"
    env.write_text("API_KEY=test123\nDEBUG=true\n")
    return env

@pytest.fixture
def sample_json_data():
    """Return a representative data structure for JSON tests."""
    return {"name": "test", "items": [1, 2, 3], "nested": {"key": "value"}}
```

## Coverage

**Requirements:** Not enforced. No coverage tool configured.

**Recommended Setup:**
```bash
pip install pytest-cov
pytest --cov=execution --cov-report=term-missing    # Run with coverage
pytest --cov=execution --cov-report=html             # HTML report
```

## Test Types

**Unit Tests:**
- Primary test type for this codebase
- Target: all functions in `execution/utils.py` (6 functions: `load_env`, `get_logger`, `tmp_path`, `write_json`, `read_json`, `timestamp`)
- Each function is pure or has minimal side effects, making unit testing straightforward

**Integration Tests:**
- Not yet applicable. Will be needed when execution scripts interact with external APIs (Google Sheets, Slides, etc. as mentioned in `directives/_template.md`)

**E2E Tests:**
- Not applicable for this type of project (agent orchestration scripts, not a web application)

## Testable Functions in `execution/utils.py`

| Function | Lines | What to Test |
|----------|-------|-------------|
| `load_env(path)` | 20-30 | Loads vars, skips comments/blanks, does not overwrite existing, handles missing file |
| `get_logger(name)` | 33-43 | Returns logger, writes to stderr, no duplicate handlers on repeat calls |
| `tmp_path(filename)` | 46-49 | Creates `.tmp/` dir, returns correct path |
| `write_json(data, filepath)` | 52-57 | Creates parent dirs, writes valid JSON, returns path |
| `read_json(filepath)` | 60-63 | Reads and parses JSON correctly |
| `timestamp()` | 66-68 | Returns ISO-8601 format string, matches expected pattern |

## Common Patterns

**Async Testing:**
- Not applicable. No async code in the current codebase.

**Error Testing:**
```python
import pytest

def test_read_json_missing_file():
    """read_json should raise FileNotFoundError for missing files."""
    with pytest.raises(FileNotFoundError):
        read_json(Path("/nonexistent/file.json"))
```

**Filesystem Testing:**
```python
def test_tmp_path_creates_directory(monkeypatch, tmp_path):
    """tmp_path() should create .tmp/ if it does not exist."""
    import execution.utils as utils
    monkeypatch.setattr(utils, "TMP_DIR", tmp_path / ".tmp")
    result = utils.tmp_path("output.json")
    assert result.parent.exists()
    assert result.name == "output.json"
```

---

*Testing analysis: 2026-03-12*
