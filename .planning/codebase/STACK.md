# Technology Stack

**Analysis Date:** 2026-03-12

## Languages

**Primary:**
- Python 3.9+ - All execution scripts and shared utilities (`execution/utils.py`)

**Secondary:**
- Markdown - Directives, agent configuration, and documentation (`directives/_template.md`, `CLAUDE.md`, `GEMINI.md`, `agents.md`)

## Runtime

**Environment:**
- Python 3.9+ (system Python detected at `/usr/bin/python3`; no `.python-version` or `pyproject.toml` pinning a specific version)
- Uses `pathlib.Path`, `dict | list` union syntax (requires Python 3.10+ for the union type hints in `execution/utils.py` line 52/60)

**Package Manager:**
- pip (no Pipenv, Poetry, or uv detected)
- Lockfile: **missing** - no `requirements.lock`, `Pipfile.lock`, or `poetry.lock`

## Frameworks

**Core:**
- No web framework - this is a script-based agent architecture, not a web application

**Testing:**
- Not detected - no test framework configured, no test files present

**Build/Dev:**
- No build tooling - scripts run directly via Python interpreter

## Key Dependencies

**Critical (from `requirements.txt`):**
- `python-dotenv` >=1.0.0 - Environment variable loading from `.env` files (note: `execution/utils.py` also has a manual `load_env()` that does not use python-dotenv)
- `requests` >=2.31.0 - HTTP client for external API calls

**Standard Library (heavily used in `execution/utils.py`):**
- `os` - Environment variable access
- `sys` - stderr logging
- `json` - JSON serialization/deserialization
- `logging` - Structured logging to stderr
- `pathlib` - File path management
- `datetime` - Timestamp generation

## Configuration

**Environment:**
- `.env` file at project root (listed in `.gitignore`; not present in working tree currently)
- `execution/utils.py` provides `load_env()` function that reads key=value pairs into `os.environ`
- Environment variables are loaded via `os.environ.setdefault()` (will not overwrite existing env vars)

**Secrets (gitignored):**
- `.env` - General environment configuration
- `credentials.json` - Google API OAuth2 credentials (not present currently)
- `token.json` - Google API token cache (not present currently)

**Build:**
- No build configuration - direct script execution

## Platform Requirements

**Development:**
- Python 3.10+ (required for `dict | list` union type hints in `execution/utils.py`)
- pip for dependency installation (`pip install -r requirements.txt`)
- `.env` file with required API keys/credentials

**Production:**
- This is a local-first agent orchestration system; no server deployment target
- Scripts are invoked by AI agents (Claude, Gemini) through their respective coding assistants
- Outputs go to `.tmp/` directory (gitignored, auto-created by `tmp_path()`)

## Project Architecture Context

This is a **3-layer agent architecture** (per commit message) designed as a "boiler room" for AI-agent-driven workflows:

1. **Directives layer** (`directives/`) - Markdown templates defining what to accomplish
2. **Execution layer** (`execution/`) - Python scripts that carry out directive steps
3. **Agent layer** (`CLAUDE.md`, `GEMINI.md`, `agents.md`) - Configuration for AI coding agents

The project is in **early bootstrap stage** - only the shared utility module and a directive template exist. Execution scripts for specific workflows have not yet been added.

---

*Stack analysis: 2026-03-12*
