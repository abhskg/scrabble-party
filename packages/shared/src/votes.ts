import { applyPlay, retractLastMove, type EngineResult } from './engine.js';
import type { GameState, Placement } from './types.js';

const fail = (reason: string): EngineResult => ({ ok: false, reason });

export function startChallenge(state: GameState, challengerId: string): EngineResult {
  if (state.phase !== 'playing') return fail('Cannot challenge right now.');
  if (state.settings.dictionaryMode !== 'off') return fail('Challenges are only for no-dictionary games.');
  if (!state.lastMove) return fail('No move to challenge.');
  if (state.lastMove.playerId === challengerId) return fail('You cannot challenge your own word.');
  return {
    ok: true,
    state: {
      ...state,
      phase: 'voting',
      pendingVote: {
        kind: 'challenge',
        word: state.lastMove.words[0] ?? '',
        targetPlayerId: state.lastMove.playerId,
        votes: {},
        eligibleVoterIds: state.players.filter(p => p.id !== state.lastMove!.playerId).map(p => p.id),
      },
    },
  };
}

export function startOverrideVote(
  state: GameState, word: string, playerId: string, placements: Placement[],
): GameState {
  return {
    ...state,
    phase: 'voting',
    pendingVote: {
      kind: 'override',
      word,
      targetPlayerId: playerId,
      votes: {},
      eligibleVoterIds: state.players.filter(p => p.id !== playerId).map(p => p.id),
      pendingPlacements: placements,
    },
  };
}

function resolveVote(state: GameState, votes: Record<string, boolean>, eligibleIds: string[]): EngineResult {
  const vote = state.pendingVote!;
  const allowCount = Object.values(votes).filter(Boolean).length;
  // tie (and no-votes-at-all) -> allow (leniency)
  const allowed = eligibleIds.length === 0 || allowCount * 2 >= eligibleIds.length;
  const base: GameState = { ...state, phase: 'playing', pendingVote: null };

  if (vote.kind === 'challenge') {
    return { ok: true, state: allowed ? base : retractLastMove(base) };
  }
  // override
  if (!allowed) return { ok: true, state: base }; // move dropped, same player's turn
  const played = applyPlay(base, vote.targetPlayerId, vote.pendingPlacements ?? []);
  return played.ok ? played : { ok: true, state: base };
}

export function castVote(state: GameState, voterId: string, allow: boolean): EngineResult {
  const vote = state.pendingVote;
  if (state.phase !== 'voting' || !vote) return fail('No vote in progress.');
  if (!vote.eligibleVoterIds.includes(voterId)) return fail('You cannot vote on this.');

  const votes = { ...vote.votes, [voterId]: allow };
  if (Object.keys(votes).length < vote.eligibleVoterIds.length) {
    return { ok: true, state: { ...state, pendingVote: { ...vote, votes } } };
  }

  return resolveVote(state, votes, vote.eligibleVoterIds);
}

/**
 * Host-triggered "close the vote now" escape hatch: any eligible voter who is
 * currently disconnected and hasn't voted yet is dropped from the eligible
 * pool so the vote resolves on whoever is actually present. If nobody
 * connected has voted at all, default to allow (leniency).
 */
export function resolveVoteWith(state: GameState, connectedVoterIds: Set<string>): EngineResult {
  const vote = state.pendingVote;
  if (state.phase !== 'voting' || !vote) return fail('No vote in progress.');
  const eligibleIds = vote.eligibleVoterIds.filter(id => connectedVoterIds.has(id) || id in vote.votes);
  return resolveVote(state, vote.votes, eligibleIds);
}
