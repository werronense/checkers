import type { GameState, Move, Player } from './types'
import { applyMove, countPieces, getLegalMoves, isTerminal } from './rules'

function terminalScore(winner: Player, depthRemaining: number): number {
  // Prefer quicker wins / slower losses.
  const base = winner === 'AI' ? 10_000 : -10_000
  return base + (winner === 'AI' ? depthRemaining : -depthRemaining)
}

export function evaluate(state: GameState): number {
  const { board } = state

  let material = 0
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r]!.length; c++) {
      const p = board[r]![c]
      if (!p) continue
      const v = p.king ? 2 : 1
      material += p.player === 'AI' ? v : -v
    }
  }

  // Mobility (small weight so it doesn't dominate captures/material).
  const aiMoves = getLegalMoves({ board, turn: 'AI' }).length
  const humanMoves = getLegalMoves({ board, turn: 'HUMAN' }).length
  const mobility = 0.05 * (aiMoves - humanMoves)

  return material + mobility
}

function orderMoves(moves: Move[]): Move[] {
  // Deterministic: prefer longer capture sequences, then stable position ordering.
  return moves.slice().sort((a, b) => {
    const cap = b.captures.length - a.captures.length
    if (cap !== 0) return cap
    const ar = a.from.r - b.from.r
    if (ar !== 0) return ar
    const ac = a.from.c - b.from.c
    if (ac !== 0) return ac
    const al = a.path.length - b.path.length
    return al
  })
}

function minimax(state: GameState, depth: number, alpha: number, beta: number): number {
  const term = isTerminal(state)
  if (term.over && term.winner) return terminalScore(term.winner, depth)
  if (depth <= 0) return evaluate(state)

  const moves = orderMoves(getLegalMoves(state))
  if (moves.length === 0) {
    // No legal moves: current player loses.
    const winner = state.turn === 'AI' ? 'HUMAN' : 'AI'
    return terminalScore(winner, depth)
  }

  if (state.turn === 'AI') {
    let best = -Infinity
    for (const m of moves) {
      const v = minimax(applyMove(state, m), depth - 1, alpha, beta)
      if (v > best) best = v
      if (best > alpha) alpha = best
      if (alpha >= beta) break
    }
    return best
  } else {
    let best = Infinity
    for (const m of moves) {
      const v = minimax(applyMove(state, m), depth - 1, alpha, beta)
      if (v < best) best = v
      if (best < beta) beta = best
      if (alpha >= beta) break
    }
    return best
  }
}

export function chooseAiMove(state: GameState, depth: number = 4): Move {
  const moves = orderMoves(getLegalMoves(state))
  if (moves.length === 0) {
    // Should be handled by terminal detection in UI, but keep this safe.
    throw new Error('AI has no legal moves')
  }

  let bestMove = moves[0]!
  let bestValue = -Infinity

  for (const m of moves) {
    const next = applyMove(state, m)
    const v = minimax(next, depth - 1, -Infinity, Infinity)
    if (v > bestValue) {
      bestValue = v
      bestMove = m
      continue
    }
    if (v === bestValue) {
      // Tie-break: prefer captures, then keep deterministic order.
      if (m.captures.length > bestMove.captures.length) bestMove = m
    }
  }

  return bestMove
}

export function quickCounts(state: GameState): { human: number; ai: number } {
  // Handy for UI display.
  return countPieces(state.board)
}

