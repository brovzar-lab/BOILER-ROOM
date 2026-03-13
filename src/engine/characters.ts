/**
 * Character state machine: movement, animation, walk-to-room logic.
 *
 * Core update functions called by the game loop each frame.
 * Handles BILLY walking between rooms via BFS pathfinding with speed ramping,
 * agent idle/work animations, and knock pause on room arrival.
 */
import {
  TILE_SIZE,
  WALK_SPEED,
  WALK_SPEED_FAST,
  SPEED_RAMP_TILES,
  WALK_FRAME_DURATION,
  WORK_FRAME_DURATION,
  TileType,
} from './types';
import type { Character, Direction, TileCoord } from './types';
import { findPath } from './tileMap';
import { getRoomAtTile, ROOMS } from './officeLayout';
import { useOfficeStore } from '@/store/officeStore';

/** Number of walk animation frames in a cycle */
const WALK_FRAMES = 4;

/** Number of work animation frames in a cycle */
const WORK_FRAMES = 3;

/** Knock pause duration in seconds */
const KNOCK_DURATION = 0.5;

/**
 * Tracks the knock timer per character.
 * When BILLY arrives at a room's billyStandTile, this timer is set.
 * During the knock pause, BILLY is 'idle' and the timer counts down.
 */
const knockTimers = new Map<string, number>();

/**
 * Returns the Direction based on delta between two tile positions.
 * Prioritizes vertical if both axes change.
 */
export function getCharacterDirection(
  fromCol: number,
  fromRow: number,
  toCol: number,
  toRow: number,
): Direction {
  const dc = toCol - fromCol;
  const dr = toRow - fromRow;

  // Prioritize vertical if both axes change
  if (dr !== 0) {
    return dr < 0 ? 'up' : 'down';
  }
  if (dc !== 0) {
    return dc < 0 ? 'left' : 'right';
  }
  return 'down'; // Default (no movement)
}

/**
 * Main character update function. Switch on ch.state:
 * - 'walk': Advance along BFS path with smooth interpolation
 * - 'work': Cycle animation frames
 * - 'idle': No change
 */
export function updateCharacter(
  ch: Character,
  dt: number,
  _tileMap: TileType[][],
): void {
  switch (ch.state) {
    case 'walk': {
      if (ch.path.length === 0) {
        ch.state = 'idle';
        break;
      }

      // Update direction based on next tile in path
      const nextTile = ch.path[0]!;
      ch.direction = getCharacterDirection(
        ch.tileCol,
        ch.tileRow,
        nextTile.col,
        nextTile.row,
      );

      // Advance move progress
      ch.moveProgress += (ch.speed / TILE_SIZE) * dt;

      // Check if we've arrived at the next tile
      while (ch.moveProgress >= 1 && ch.path.length > 0) {
        const arrived = ch.path.shift()!;
        ch.tileCol = arrived.col;
        ch.tileRow = arrived.row;
        ch.moveProgress -= 1;

        // Update direction for new next tile if available
        if (ch.path.length > 0) {
          const next = ch.path[0]!;
          ch.direction = getCharacterDirection(
            ch.tileCol,
            ch.tileRow,
            next.col,
            next.row,
          );
        }
      }

      // If path exhausted, transition to idle
      if (ch.path.length === 0) {
        ch.state = 'idle';
        ch.moveProgress = 0;
        ch.x = ch.tileCol * TILE_SIZE;
        ch.y = ch.tileRow * TILE_SIZE;
        break;
      }

      // Interpolate pixel position between current tile and next tile
      const target = ch.path[0]!;
      const fromX = ch.tileCol * TILE_SIZE;
      const fromY = ch.tileRow * TILE_SIZE;
      const toX = target.col * TILE_SIZE;
      const toY = target.row * TILE_SIZE;
      ch.x = fromX + (toX - fromX) * ch.moveProgress;
      ch.y = fromY + (toY - fromY) * ch.moveProgress;

      // Cycle walk animation frame
      ch.frameTimer += dt;
      if (ch.frameTimer >= WALK_FRAME_DURATION) {
        ch.frame = (ch.frame + 1) % WALK_FRAMES;
        ch.frameTimer -= WALK_FRAME_DURATION;
      }
      break;
    }

    case 'work': {
      // Cycle animation frames
      ch.frameTimer += dt;
      if (ch.frameTimer >= WORK_FRAME_DURATION) {
        ch.frame = (ch.frame + 1) % WORK_FRAMES;
        ch.frameTimer -= WORK_FRAME_DURATION;
      }
      break;
    }

    case 'idle': {
      // No frame cycling, no position change
      break;
    }
  }
}

/**
 * Updates all characters each frame.
 * After updating BILLY, checks for room entry and handles knock animation
 * and agent reactions.
 */
export function updateAllCharacters(
  dt: number,
  tileMap: TileType[][],
): void {
  const state = useOfficeStore.getState();
  const { characters } = state;

  // Handle knock timer for BILLY
  const billyKnockTimer = knockTimers.get('billy');
  if (billyKnockTimer !== undefined && billyKnockTimer > 0) {
    knockTimers.set('billy', billyKnockTimer - dt);
    if (billyKnockTimer - dt <= 0) {
      knockTimers.delete('billy');
      // Knock is done, update active room
      const billy = characters.find((c) => c.id === 'billy');
      if (billy) {
        const room = getRoomAtTile(billy.tileCol, billy.tileRow);
        if (room && room.id !== 'billy') {
          state.setActiveRoom(room.id);
          state.setBillyPosition(billy.tileCol, billy.tileRow);
        }
      }
    }
    // During knock pause, still update non-BILLY characters
    for (const ch of characters) {
      if (ch.id !== 'billy') {
        updateCharacter(ch, dt, tileMap);
      }
    }
    return;
  }

  // Track BILLY's previous tile position for room entry detection
  const billy = characters.find((c) => c.id === 'billy');
  const prevBillyCol = billy?.tileCol;
  const prevBillyRow = billy?.tileRow;

  // Update all characters
  for (const ch of characters) {
    updateCharacter(ch, dt, tileMap);
  }

  // Drive agent character animations from agentStatuses (Zustand bridge)
  const { agentStatuses } = state;
  for (const ch of characters) {
    if (ch.id === 'billy') continue;
    const status = agentStatuses[ch.id];
    if (status === 'thinking') {
      // Switch to work animation (fast typing) unless walking
      if (ch.state === 'idle' || ch.state === 'work') {
        ch.state = 'work';
      }
    } else if (status === 'idle' || status === 'needs-attention') {
      // Return to idle if previously in work state (from thinking)
      if (ch.state === 'work') {
        ch.state = 'idle';
      }
    }
  }

  // Check if BILLY entered a new tile
  if (billy && (billy.tileCol !== prevBillyCol || billy.tileRow !== prevBillyRow)) {
    const room = getRoomAtTile(billy.tileCol, billy.tileRow);

    if (room && room.id !== 'billy') {
      // BILLY entered an agent's room
      // Check if BILLY arrived at the billyStandTile (path exhausted)
      if (billy.state === 'idle' && billy.path.length === 0) {
        // Start knock pause
        knockTimers.set('billy', KNOCK_DURATION);

        // Make agent face BILLY
        const agent = characters.find((c) => c.id === room.id);
        if (agent && (agent.state === 'work' || agent.state === 'idle')) {
          agent.state = 'idle';
          agent.direction = getCharacterDirection(
            agent.tileCol,
            agent.tileRow,
            billy.tileCol,
            billy.tileRow,
          );
        }
      }
    }

    // Update BILLY's position in the store
    state.setBillyPosition(billy.tileCol, billy.tileRow);
  }
}

/**
 * Starts BILLY walking to a target tile.
 * Finds the character in the store, computes BFS path, assigns it,
 * and sets appropriate walk speed.
 */
export function startWalk(
  characterId: string,
  targetCol: number,
  targetRow: number,
  tileMap: TileType[][],
): void {
  const state = useOfficeStore.getState();
  const ch = state.characters.find((c) => c.id === characterId);
  if (!ch) return;

  const path = findPath(ch.tileCol, ch.tileRow, targetCol, targetRow, tileMap);

  if (path.length === 0) {
    // Unreachable destination -- keep current state
    return;
  }

  ch.path = path;
  ch.state = 'walk';
  ch.moveProgress = 0;
  ch.frame = 0;
  ch.frameTimer = 0;
  ch.speed = path.length > SPEED_RAMP_TILES ? WALK_SPEED_FAST : WALK_SPEED;

  // Clear any existing knock timer
  knockTimers.delete(characterId);
}
