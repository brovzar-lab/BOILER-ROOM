# Coding Conventions

**Analysis Date:** 2026-03-12

## Naming Patterns

**Files:**
- Python modules use `snake_case.py` (e.g., `execution/utils.py`)
- Markdown documents use `UPPER_CASE.md` for project-level docs (e.g., `CLAUDE.md`, `GEMINI.md`)
- Markdown templates use `_prefixed_snake_case.md` for templates (e.g., `directives/_template.md`)

**Functions:**
- `snake_case` for all Python functions (e.g., `load_env`, `get_logger`, `tmp_path`, `write_json`, `read_json`)

**Variables:**
- `snake_case` for local variables and parameters
- `UPPER_SNAKE_CASE` for module-level constants (e.g., `ROOT_DIR`, `TMP_DIR`, `ENV_PATH` in `execution/utils.py`)

**Types:**
- Python type hints used inline with union syntax (`dict | list`) rather than `typing.Union`
- Requires Python 3.10+ for the `X | Y` union type syntax

## Code Style

**Formatting:**
- No formatter configuration detected (no `pyproject.toml`, `setup.cfg`, `.flake8`, `black.toml`, or `ruff.toml`)
- Observed style: 4-space indentation, double quotes for strings in docstrings, double quotes for all string literals in `execution/utils.py`
- Prescriptive: Use 4-space indentation and double quotes for strings to match existing code

**Linting:**
- No linter configuration detected
- No `pyproject.toml`, `setup.cfg`, `tox.ini`, or `ruff.toml` present
- Prescriptive: When adding a linter, match the existing style (PEP 8 compliant)

## Import Organization

**Order (observed in `execution/utils.py`):**
1. Standard library imports (`os`, `sys`, `json`, `logging`, `pathlib`, `datetime`)
2. No third-party imports present yet (but `requirements.txt` lists `python-dotenv`, `requests`)
3. No local imports present yet

**Prescriptive:**
1. Standard library imports (one per line, alphabetical)
2. Third-party imports (separated by blank line)
3. Local/project imports (separated by blank line)

**Path Aliases:**
- None. Use relative imports within packages or absolute paths from project root.

## Error Handling

**Patterns:**
- Silent fallback: `load_env()` in `execution/utils.py` returns early if `.env` file does not exist -- no exception raised
- No try/except blocks in the current codebase
- No custom exception classes defined
- Prescriptive: Follow the existing pattern of graceful degradation for optional resources (like `.env`). Raise exceptions for critical failures.

## Logging

**Framework:** Python `logging` standard library

**Patterns (defined in `execution/utils.py`):**
- Use `get_logger(name)` to obtain a pre-configured logger
- Loggers write to `stderr` (not stdout) to keep stdout clean for data output
- Format: `%(asctime)s [%(name)s] %(levelname)s  %(message)s`
- Default level: `INFO`
- One handler per logger (guard against duplicate handlers with `if not logger.handlers`)

**Prescriptive:**
- Every execution script should call `get_logger(__name__)` at module level
- Use `logger.info()` for operational messages, `logger.error()` for failures
- Never use bare `print()` for diagnostic output; reserve stdout for data/results

## Comments

**When to Comment:**
- Module-level docstrings are required (triple-quoted, descriptive of module purpose) -- see `execution/utils.py` lines 1-6
- Every public function has a one-line docstring explaining what it does and returns
- Inline comments used sparingly (e.g., `# skip comments/blanks` style)

**Docstring Style:**
- One-line docstrings using `"""Return a ..."""` imperative mood format
- No multi-line docstrings with parameter documentation (yet)
- Prescriptive: Use imperative mood docstrings (`"""Load ..."""` not `"""Loads ..."""`)

## Function Design

**Size:** Functions are small (3-8 lines of body). Keep functions focused on a single task.

**Parameters:**
- Use type hints for all parameters and return values
- Use `Path` objects (from `pathlib`) rather than raw strings for file paths
- Provide default values where sensible (e.g., `path: Path = ENV_PATH`)

**Return Values:**
- Functions return typed values (`Path`, `str`, `dict | list`, `None`)
- Side-effect functions (like `load_env`) return `None`
- Builder/writer functions return the path they wrote to (e.g., `write_json` returns `Path`)

## Module Design

**Exports:**
- No `__all__` defined; all public functions are implicitly exported
- No barrel files / `__init__.py` files detected
- Prescriptive: Keep modules focused. `execution/utils.py` is the shared utility module; new execution scripts go as sibling files in `execution/`.

**Directory Conventions:**
- `execution/` -- Python scripts for automated tasks, each importing from `utils.py`
- `directives/` -- Markdown instruction files for orchestrator agents, following `_template.md` structure
- `.tmp/` -- Transient/generated data (gitignored)

## Constants and Configuration

**Pattern (from `execution/utils.py`):**
- Define path constants at module level using `pathlib.Path`
- `ROOT_DIR` is resolved from the utils module location: `Path(__file__).resolve().parent.parent`
- Derived paths use `/` operator: `TMP_DIR = ROOT_DIR / ".tmp"`

**Environment Variables:**
- Loaded via custom `load_env()` (not `python-dotenv` directly, though it is in `requirements.txt`)
- Uses `os.environ.setdefault()` so existing env vars are not overwritten
- `.env` file is gitignored

## JSON Handling

**Pattern (from `execution/utils.py`):**
- Use `write_json(data, filepath)` and `read_json(filepath)` from utils
- Pretty-print with `indent=2`
- Use `default=str` in `json.dump` to handle non-serializable types (e.g., `datetime`)
- Always create parent directories before writing: `filepath.parent.mkdir(parents=True, exist_ok=True)`

---

*Convention analysis: 2026-03-12*
