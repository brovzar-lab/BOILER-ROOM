# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-14
**Phases:** 8 | **Plans:** 24

### What Was Built
- Multi-agent AI advisory workspace with 5 specialized agents
- Top-down pixel art office with character sprites and BFS pathfinding
- War Room broadcast with parallel streaming to all agents
- Deal rooms with per-deal conversation/file/memory scoping
- File handling with PDF/DOCX/Excel extraction and context injection
- Agent memory with structured fact extraction and cross-agent sharing
- Audio system with ambient sounds and contextual SFX
- Responsive side-by-side layout with auto-fit zoom

### What Worked
- Wave-based parallel execution significantly sped up multi-plan phases
- TDD approach in data layer phases (01, 05, 06, 07) caught issues early
- Individual sprite sheets architecture enables easy art swapping later
- Three-world separation (engine/chat/stores) kept phases independent
- Human verification checkpoints caught real issues (War Room gathering, sprite quality)

### What Was Inefficient
- Programmatic sprite generation produced functional but low-detail art — professional sprites would be better sourced externally
- Phase 5 (Deal Rooms) ROADMAP.md plan checkboxes weren't updated during execution, causing stale progress display
- Phase 7 gap closure needed for a regression (Layer 5.5 unconditional injection) that could have been caught by broader test coverage in the original plan

### Patterns Established
- Side-by-side layout proved better than overlay at production scale
- Context-aware audio (room-specific volume) adds atmosphere without distraction
- Individual sprite sheets per character enables asset swapping without code changes
- 5-layer system prompt architecture (base → persona → deal → files → memory) scales cleanly

### Key Lessons
1. Programmatic asset generation is a good stopgap but should be flagged for replacement early
2. Wave dependency checking by the plan-checker catches real file conflicts — always run verification
3. CONTEXT.md decisions that contradict codebase reality (32x32 vs 16x16 tile size) need early validation
4. Pre-existing bugs surface during polish phases — log them but don't let them block unrelated work

### Cost Observations
- Model mix: primarily Opus for execution, Sonnet for verification/checking
- 8 phases completed in ~2 days of wall clock time
- Gap closure cycles (Phase 7) added minimal overhead when issues were surgical

---

## Cross-Milestone Trends

*Updated after each milestone to track patterns across versions.*

| Metric | v1.0 |
|--------|------|
| Phases | 8 |
| Plans | 24 |
| LOC | 13,450 |
| Timeline | 2 days |
| Gap closures | 1 (Phase 7) |
| Human checkpoints | 4 |
