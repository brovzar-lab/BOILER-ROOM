# External Integrations

**Analysis Date:** 2026-03-12

## APIs & External Services

**HTTP Client:**
- `requests` >=2.31.0 is declared in `requirements.txt` but no execution scripts using it exist yet
- Future execution scripts in `execution/` will use `requests` for external API calls

**Google Workspace (planned):**
- `.gitignore` lists `credentials.json` and `token.json`, indicating planned Google API integration (likely Google Sheets, Slides, or Drive)
- The directive template (`directives/_template.md` line 18) references "Google Sheet, Slides, etc." as output targets
- No Google client libraries are in `requirements.txt` yet (e.g., `google-api-python-client`, `gspread`)

## Data Storage

**Databases:**
- None - no database dependencies or connection code detected

**File Storage:**
- Local filesystem only
- `.tmp/` directory used for intermediate/generated files (`execution/utils.py` lines 46-49)
- JSON read/write utilities provided via `write_json()` and `read_json()` in `execution/utils.py` (lines 52-63)
- `.tmp/` is gitignored and auto-created on demand

**Caching:**
- None - no caching layer detected

## Authentication & Identity

**Auth Provider:**
- None currently implemented
- Google OAuth2 flow is anticipated (`.gitignore` includes `credentials.json` and `token.json`)

## Monitoring & Observability

**Error Tracking:**
- None - no external error tracking service

**Logs:**
- Python `logging` module writing to stderr
- Logger factory at `execution/utils.py` `get_logger()` (lines 33-43)
- Format: `%(asctime)s [%(name)s] %(levelname)s  %(message)s`
- Default level: `INFO`
- Each execution script is expected to call `get_logger(__name__)` for a named logger

## CI/CD & Deployment

**Hosting:**
- Local execution only - no deployment target
- Scripts are run by AI coding agents (Claude Code, Gemini) on the developer's machine

**CI Pipeline:**
- None - no CI configuration files detected (no `.github/workflows/`, no `Makefile`, no `tox.ini`)

## Environment Configuration

**Required env vars:**
- Not yet defined - the `.env` loading infrastructure exists but no scripts consume specific variables yet
- Likely to include Google API credentials and any third-party API keys once execution scripts are built

**Secrets location:**
- `.env` file at project root (gitignored)
- `credentials.json` at project root (gitignored) - Google OAuth2 client credentials
- `token.json` at project root (gitignored) - Google OAuth2 token cache

## Webhooks & Callbacks

**Incoming:**
- None - no web server or webhook endpoints

**Outgoing:**
- None currently - expected to be added via execution scripts

## Integration Readiness Summary

This codebase is in **early bootstrap**. The integration infrastructure is in place:
- `execution/utils.py` provides `load_env()` for credential loading
- `requests` is declared as a dependency for HTTP calls
- Google API credential files are anticipated in `.gitignore`

But no concrete integrations have been implemented yet. The first execution scripts added to `execution/` will establish the actual integration patterns.

---

*Integration audit: 2026-03-12*
