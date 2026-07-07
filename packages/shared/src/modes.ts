import { applyPass, applyPlay, applySwap, applyTakeBack, type EngineResult } from './engine.js';
import { validatePlacement } from './placement.js';
import type { GameState, Placement } from './types.js';

export interface GameMode {
  id: string;
  validateMove(state: GameState, playerId: string, placements: Placement[]): EngineResult;
  play: typeof applyPlay;
  swap: typeof applySwap;
  pass: typeof applyPass;
  takeBack: typeof applyTakeBack;
}

export const ClassicMode: GameMode = {
  id: 'classic',
  validateMove(state, _playerId, placements) {
    const v = validatePlacement(state.board, placements);
    if (v.ok === true) {
      return { ok: true, state };
    }
    const vFailed = v as { ok: false; reason: string };
    return { ok: false, reason: vFailed.reason };
  },
  play: applyPlay,
  swap: applySwap,
  pass: applyPass,
  takeBack: applyTakeBack,
};

export const MODES: Record<string, GameMode> = { classic: ClassicMode };
