# Codebase Structure

**Analysis Date:** 2026-03-12

## Directory Layout

```
BOILER-ROOM/                    # Project root (3-layer agent architecture)
├── .claude/                    # Claude Code configuration
│   └── settings.local.json     # Local permissions (GSD skills)
├── .planning/                  # GSD planning artifacts
│   └── codebase/               # Codebase analysis documents (this file lives here)
├── directives/                 # Layer 1: Workflow definitions (markdown)
│   └── _template.md            # Directive template -- copy for new directives
├── execution/                  # Layer 2: Python execution scripts
│   └── utils.py                # Shared utilities (env, logging, temp files, JSON)
├── .env                        # Environment secrets (gitignored, never committed)
├── .gitignore                  # Ignores .tmp/, .env, credentials, __pycache__, IDE files
├── .tmp/                       # Intermediate/generated artifacts (gitignored, always regenerated)
├── agents.md                   # Shared agent roster definition (currently empty)
├── CLAUDE.md                   # Claude Code instruction surface (currently empty)
├── GEMINI.md                   # Gemini instruction surface (currently empty)
└── requirements.txt            # Python dependencies (python-dotenv, requests)
```

## Directory Purposes

**`directives/`:**
- Purpose: Store workflow definitions that AI orchestrators follow step-by-step
- Contains: Markdown files following the template structure defined in `directives/_template.md`
- Key files: `directives/_template.md` (the canonical directive format)
- Convention: Files prefixed with `_` are templates/meta-files, not actual directives

**`execution/`:**
- Purpose: Store runnable Python scripts that perform actual work
- Contains: Python modules that directives reference and AI agents invoke
- Key files: `execution/utils.py` (shared utility library imported by all scripts)
- Convention: Each script is a self-contained unit of work; all share the utils baseline

**`.planning/`:**
- Purpose: GSD framework planning artifacts
- Contains: Codebase analysis docs, phase plans, roadmaps
- Key files: `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/STRUCTURE.md`
- Generated: Yes (by GSD commands)
- Committed: Yes

**`.claude/`:**
- Purpose: Claude Code local configuration
- Contains: Permission settings for GSD skills
- Key files: `.claude/settings.local.json`
- Committed: Yes

**`.tmp/`:**
- Purpose: Intermediate artifacts generated during script execution
- Contains: JSON files, temporary downloads, processing artifacts
- Generated: Yes (by execution scripts via `utils.tmp_path()`)
- Committed: No (gitignored)

## Key File Locations

**Entry Points:**
- `execution/utils.py`: Shared utility library (not directly executable, imported by scripts)
- `CLAUDE.md`: Claude Code reads this on project open (currently empty)
- `GEMINI.md`: Gemini reads this on project open (currently empty)

**Configuration:**
- `.claude/settings.local.json`: Claude Code permissions (allows GSD skills)
- `requirements.txt`: Python dependencies (`python-dotenv>=1.0.0`, `requests>=2.31.0`)
- `.gitignore`: Defines ignored paths (`.tmp/`, `.env`, credentials, caches, IDE files)
- `.env`: Environment variables / API keys (gitignored -- existence noted only)

**Core Logic:**
- `execution/utils.py`: All shared utilities -- `load_env()`, `get_logger()`, `tmp_path()`, `write_json()`, `read_json()`, `timestamp()`

**Templates:**
- `directives/_template.md`: Canonical directive format with sections: Goal, Inputs, Steps, Execution Scripts, Outputs, Edge Cases & Learnings

**Agent Definitions:**
- `agents.md`: Shared agent roster (currently empty -- to be populated)
- `CLAUDE.md`: Claude-specific behavioral instructions (currently empty)
- `GEMINI.md`: Gemini-specific behavioral instructions (currently empty)

## Naming Conventions

**Files:**
- Python scripts: `snake_case.py` (e.g., `utils.py`)
- Markdown directives: `snake_case.md` or `_template.md` (underscore prefix for meta-files)
- Agent instruction files: `UPPERCASE.md` at root (e.g., `CLAUDE.md`, `GEMINI.md`)
- Planning docs: `UPPERCASE.md` in `.planning/codebase/`
- Environment: `.env` (dotfile convention)

**Directories:**
- Lowercase, singular nouns: `directives/`, `execution/`
- Dot-prefixed for hidden/config: `.planning/`, `.claude/`, `.tmp/`

**Python conventions (from `execution/utils.py`):**
- Module-level constants: `UPPER_SNAKE_CASE` (e.g., `ROOT_DIR`, `TMP_DIR`, `ENV_PATH`)
- Functions: `snake_case` (e.g., `load_env`, `get_logger`, `tmp_path`)
- Parameters: `snake_case` (e.g., `filepath`, `filename`)
- Type hints: Modern Python union syntax (`dict | list` not `Union[dict, list]`)
- Docstrings: One-line Google style under every function

## Where to Add New Code

**New Directive:**
- Copy `directives/_template.md` to `directives/your_directive_name.md`
- Fill in all sections: Goal, Inputs, Steps, Execution Scripts, Outputs, Edge Cases
- Reference execution scripts by path: `execution/script_name.py`

**New Execution Script:**
- Create `execution/your_script.py`
- Import shared utilities: `from utils import load_env, get_logger, tmp_path, write_json, read_json`
- Call `load_env()` at module level or in `main()`
- Use `get_logger(__name__)` for logging
- Use `tmp_path("filename.json")` for intermediate files

**New Python Dependency:**
- Add to `requirements.txt` with minimum version pin: `package>=X.Y.Z`
- Comment if a script depends on specific behavior that requires exact pinning

**New Agent Configuration:**
- For Claude: add instructions to `CLAUDE.md`
- For Gemini: add instructions to `GEMINI.md`
- For shared agent definitions: add to `agents.md`

**New Planning/Analysis Documents:**
- Place in `.planning/codebase/` with `UPPERCASE.md` naming

## Special Directories

**`.tmp/`:**
- Purpose: Intermediate artifacts from execution scripts
- Generated: Yes (via `execution/utils.py` `tmp_path()`)
- Committed: No (gitignored)
- Safe to delete: Yes (always regenerated)

**`.planning/`:**
- Purpose: GSD framework codebase analysis and phase planning
- Generated: Yes (by GSD map/plan commands)
- Committed: Yes

**`.claude/`:**
- Purpose: Claude Code local settings and permissions
- Generated: Partially (settings.local.json may be auto-generated)
- Committed: Yes

## Implemented Structure (Phase 1 Complete)

```
src/
├── App.tsx                          # Root app component (Header + ChatPanel + IndexedDB hydration)
├── main.tsx                         # React 19 createRoot entry point
├── index.css                        # Tailwind v4 @theme with Lemon Studios brand tokens
├── vite-env.d.ts                    # Vite client type definitions
├── components/
│   ├── chat/
│   │   ├── ChatPanel.tsx            # Main chat container (flex column layout)
│   │   ├── ChatInput.tsx            # Textarea with Enter-to-send, Stop button
│   │   ├── MessageList.tsx          # Scrollable message container with auto-scroll
│   │   ├── MessageBubble.tsx        # Message display with react-markdown
│   │   ├── StreamingIndicator.tsx   # Live streaming content with pulsing cursor
│   │   ├── TokenCounter.tsx         # Token usage with color thresholds
│   │   └── ErrorBanner.tsx          # Error display with Retry/Dismiss
│   └── ui/
│       └── Header.tsx               # App header with branding and status
├── config/
│   ├── agents/
│   │   ├── diana.ts                 # Diana CFO persona definition
│   │   └── index.ts                 # Agent registry with getAgent() accessor
│   └── prompts/
│       ├── base.ts                  # Base system prompt
│       └── index.ts                 # Prompt re-exports
├── hooks/
│   └── useChat.ts                   # Chat orchestration hook
├── services/
│   ├── anthropic/
│   │   ├── client.ts                # Singleton Anthropic SDK client
│   │   └── stream.ts               # Streaming service with callbacks
│   ├── context/
│   │   ├── builder.ts               # Layered system prompt assembly
│   │   ├── tokenCounter.ts          # Token estimation and limits
│   │   └── summarizer.ts            # Auto-summarization with history preservation
│   └── persistence/
│       ├── adapter.ts               # Singleton accessor for PersistenceAdapter
│       └── indexeddb.ts             # IndexedDB implementation (5 stores)
├── store/
│   ├── chatStore.ts                 # Chat state with CRUD, streaming, tokens
│   ├── officeStore.ts               # Skeleton (Phase 2)
│   ├── dealStore.ts                 # Skeleton (Phase 5)
│   ├── fileStore.ts                 # Skeleton (Phase 6)
│   └── memoryStore.ts              # Skeleton (Phase 7)
└── types/
    ├── agent.ts                     # AgentId, AgentPersona, AgentStatus
    ├── chat.ts                      # Message, Conversation, StreamingState
    └── persistence.ts               # PersistenceAdapter interface, StoreName
```

## Remaining Planned Directories

Not yet implemented (future phases):

- `src/engine/` -- Canvas 2D isometric rendering engine (Phase 2)
- `src/components/office/` -- Office/canvas React components (Phase 2-3)
- `src/components/deals/` -- Deal room components (Phase 5)
- `src/components/memory/` -- Memory panel components (Phase 7)
- `public/assets/` -- Sprites, tiles, UI icons, audio (Phase 2, 8)

---

*Structure analysis: 2026-03-12*
*Updated: 2026-03-12 after Phase 1 completion*
