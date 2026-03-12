# Architecture

**Analysis Date:** 2026-03-12

## Pattern Overview

**Overall:** 3-Layer Agent Architecture (Directives / Execution / Orchestration)

This is a bootstrapped scaffolding repo designed to be operated by AI agents (Claude, Gemini). It follows a "command center" pattern where markdown directives define workflows, Python scripts handle execution, and AI agents orchestrate the flow. The actual product being built (Lemon Command Center) has not been implemented yet -- this repo contains only the foundational scaffolding layer.

**Key Characteristics:**
- Directive-driven: workflows are defined as markdown templates in `directives/`
- Execution scripts in Python share utilities from a common base (`execution/utils.py`)
- AI agents (Claude, Gemini) consume `CLAUDE.md` / `GEMINI.md` as instruction surfaces
- All intermediate/generated artifacts go to `.tmp/` (gitignored, always regenerated)
- Environment secrets loaded from `.env` via custom `load_env()` (no framework dependency)
- The repo is a "meta-layer" -- it orchestrates the creation of another project (Lemon Command Center, a React/TypeScript web app)

## Layers

**Layer 1 -- Directives:**
- Purpose: Define reusable, step-by-step workflows that an AI orchestrator follows
- Location: `directives/`
- Contains: Markdown files following the template at `directives/_template.md`
- Depends on: Nothing (pure documentation/specification)
- Used by: AI orchestrator agents (Claude, Gemini) when executing a workflow
- Pattern: Each directive specifies Goal, Inputs, Steps, Execution Scripts, Outputs, and Edge Cases

**Layer 2 -- Execution:**
- Purpose: Runnable Python scripts that perform actual work (API calls, data transforms, file generation)
- Location: `execution/`
- Contains: Python modules; currently only `execution/utils.py` (shared utilities)
- Depends on: `python-dotenv>=1.0.0`, `requests>=2.31.0` (see `requirements.txt`)
- Used by: Directives reference these scripts; AI agents invoke them
- Pattern: Each script imports from `execution/utils.py` for env loading, logging, temp files, JSON I/O

**Layer 3 -- Agent Configuration:**
- Purpose: Configure AI agent behavior through instruction files
- Location: `CLAUDE.md`, `GEMINI.md`, `agents.md` (all at project root)
- Contains: Agent-specific instructions and shared agent definitions (currently empty/placeholder)
- Depends on: Nothing
- Used by: Claude Code (reads `CLAUDE.md`), Gemini (reads `GEMINI.md`)
- Pattern: Each AI tool reads its own instruction file; `agents.md` defines shared agent roster

## Data Flow

**Directive Execution Flow:**

1. User or AI orchestrator selects a directive from `directives/`
2. Directive specifies which `execution/*.py` scripts to run and in what order
3. Execution scripts load environment via `execution/utils.py` `load_env()`
4. Scripts read inputs, call APIs or process data, write intermediate results to `.tmp/`
5. Final outputs are delivered to the destination specified in the directive (e.g., Google Sheet, Slides)

**Temporary Data Flow:**

1. `execution/utils.py` defines `TMP_DIR = ROOT_DIR / ".tmp"`
2. Scripts call `tmp_path("filename")` to get a path inside `.tmp/`, auto-creating the directory
3. Scripts use `write_json()` / `read_json()` for structured intermediate data
4. `.tmp/` is gitignored -- always regenerated, never committed

**State Management:**
- No persistent application state -- this is a scripting/orchestration repo
- Environment variables loaded from `.env` at script start via `load_env()`
- Intermediate state stored as JSON files in `.tmp/`
- No database, no ORM, no session management

## Key Abstractions

**Shared Utilities (`execution/utils.py`):**
- Purpose: Provide a consistent baseline for all execution scripts
- Examples: `execution/utils.py`
- Pattern: Module-level constants (`ROOT_DIR`, `TMP_DIR`, `ENV_PATH`) plus pure helper functions
- Key functions:
  - `load_env()` -- loads `.env` key=value pairs into `os.environ`
  - `get_logger(name)` -- returns a stderr-writing logger with timestamp formatting
  - `tmp_path(filename)` -- returns a path inside `.tmp/`, creating dir if needed
  - `write_json(data, filepath)` -- pretty-prints JSON to a file
  - `read_json(filepath)` -- reads and parses JSON from a file
  - `timestamp()` -- ISO-8601 string for filenames and logs

**Directive Template (`directives/_template.md`):**
- Purpose: Standardize how workflows are documented
- Examples: `directives/_template.md`
- Pattern: Markdown with fixed sections: Goal, Inputs, Steps, Execution Scripts, Outputs, Edge Cases & Learnings
- The "Edge Cases & Learnings" section is explicitly designed for self-annealing (update after each run)

## Entry Points

**Execution Scripts:**
- Location: `execution/*.py` (currently only `execution/utils.py` which is a library, not an entry point)
- Triggers: Invoked by AI agents following directives, or manually by the user
- Responsibilities: Perform discrete units of work (API calls, transforms, file generation)

**Agent Instruction Files:**
- Location: `CLAUDE.md` (for Claude Code), `GEMINI.md` (for Gemini)
- Triggers: Automatically loaded by the respective AI tool when it opens the project
- Responsibilities: Set behavioral rules, project context, and constraints for the AI agent

**Project Specification:**
- Location: `LEMON-COMMAND-CENTER-PROMPT.md` (exists in main branch, describes the target product)
- Triggers: Fed to `/gsd:new-project` to bootstrap the Lemon Command Center application
- Responsibilities: Defines the full product vision, agent roster, phases, architecture decisions, and file structure for the React/TypeScript app to be built

## Error Handling

**Strategy:** Minimal -- early-stage scaffolding with no error handling framework

**Patterns:**
- `load_env()` silently no-ops if `.env` does not exist (graceful degradation)
- No try/except blocks in utility functions -- errors propagate as standard Python exceptions
- Logging to stderr via `get_logger()` for diagnostic output without polluting stdout

## Cross-Cutting Concerns

**Logging:** `execution/utils.py` `get_logger(name)` -- writes to stderr with format `%(asctime)s [%(name)s] %(levelname)s  %(message)s`. Each script should call `get_logger(__name__)`.

**Validation:** Not implemented. No input validation, schema validation, or type checking beyond Python's built-in type hints (`dict | list` union syntax in `write_json` / `read_json`).

**Authentication:** Environment-based. API keys and credentials stored in `.env` (gitignored). Loaded via `load_env()` into `os.environ`. Scripts access via `os.environ["KEY_NAME"]`.

**Path Resolution:** All paths resolved relative to `ROOT_DIR = Path(__file__).resolve().parent.parent` in `execution/utils.py`. This anchors everything to the project root regardless of working directory.

---

*Architecture analysis: 2026-03-12*
