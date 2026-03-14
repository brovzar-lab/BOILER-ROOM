---
phase: 08-polish
plan: 02
subsystem: audio
tags: [web-audio-api, zustand, sfx, ambient, lazy-loading]

requires:
  - phase: 08-polish
    provides: "Sprite rendering, game loop, Header component, canvas layout"
provides:
  - "AudioManager singleton with lazy-loading, ambient loop, room-aware volume, SFX playback"
  - "audioStore with ambient/SFX mute toggles"
  - "Header mute controls for ambient and SFX"
  - "Audio triggers wired into game loop and character state machine"
affects: []

tech-stack:
  added: [Web Audio API]
  patterns: [singleton-audio-manager, lazy-audio-loading, room-aware-volume]

key-files:
  created:
    - src/engine/audioManager.ts
    - src/store/audioStore.ts
    - scripts/generateAudio.ts
    - public/audio/ambient-office.mp3
    - public/audio/sfx-footstep.mp3
    - public/audio/sfx-knock.mp3
    - public/audio/sfx-paper.mp3
    - public/audio/sfx-chime.mp3
  modified:
    - src/engine/gameLoop.ts
    - src/engine/characters.ts
    - src/components/ui/Header.tsx
    - src/App.tsx

key-decisions:
  - "WAV data saved as .mp3 extension for path consistency -- placeholder files to be replaced with real sounds"
  - "AudioContext ensured on first click/keydown via one-time document event listener in App.tsx"
  - "Room volume multipliers: agent offices 0.6, war room 1.0, hallway/billy 0.8"

patterns-established:
  - "Lazy audio loading: SFX buffers loaded on first trigger, ambient on first unmute"
  - "Audio mute state in Zustand store, playback logic in AudioManager singleton"

requirements-completed: [PLSH-04]

duration: 5min
completed: 2026-03-14
---

# Phase 8 Plan 02: Audio System Summary

**AudioManager with lazy-loaded ambient loops, 4 event-triggered SFX, and Header mute controls using Web Audio API**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-14T00:33:55Z
- **Completed:** 2026-03-14T00:39:13Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- AudioManager singleton with lazy loading, ambient loop with room-aware volume crossfade, and one-shot SFX playback
- Zustand audioStore with ambient/SFX mute toggles defaulting to muted (browser autoplay policy)
- Audio triggers wired: footsteps during walk, knock on room arrival, paper on file drop, chime on agent response completion
- Header mute buttons (speaker icon for ambient, bell icon for SFX) with clear on/off state

## Task Commits

Each task was committed atomically:

1. **Task 1: Create audio assets, AudioManager, and audioStore** - `a80cacc` (feat)
2. **Task 2: Wire audio triggers and add Header mute controls** - `1788982` (feat)

## Files Created/Modified
- `src/engine/audioManager.ts` - Singleton AudioManager with lazy loading, ambient loop, SFX playback
- `src/store/audioStore.ts` - Zustand store for ambient/SFX mute toggles
- `scripts/generateAudio.ts` - Placeholder audio file generator
- `public/audio/*.mp3` - 5 placeholder audio files (ambient, footstep, knock, paper, chime)
- `src/engine/gameLoop.ts` - Added footstep timer, room change ambient update, agent chime triggers
- `src/engine/characters.ts` - Added knock SFX on BILLY room arrival
- `src/components/ui/Header.tsx` - Added ambient and SFX mute toggle buttons
- `src/App.tsx` - Added AudioContext init on first interaction, paper SFX on file upload

## Decisions Made
- WAV data saved as .mp3 extension for path consistency -- placeholders to be replaced with real sounds from freesound.org
- AudioContext initialized on first user click/keydown via one-time document listener
- Room volume multipliers: agent offices 0.6x, war room 1.0x, hallway/billy 0.8x
- 200ms linear ramp for ambient volume crossfade between rooms

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Audio system fully wired and operational
- All 24/24 plans complete -- project fully shipped

## Self-Check: PASSED

All 8 created files verified. Both task commits (a80cacc, 1788982) verified.

---
*Phase: 08-polish*
*Completed: 2026-03-14*
