import type { Board, GameState, Piece, Player } from './types'
import { BOARD_SIZE } from './types'
import { isDarkSquare } from './utils'

function makePiece(player: Player): Piece {
  return { player, king: false }
}

export function createInitialBoard(): Board {
  const board: Board = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null),
  )

  // American checkers: pieces start on dark squares.
  // AI at top (rows 0..2), HUMAN at bottom (rows 5..7).
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (!isDarkSquare(r, c)) continue
      if (r <= 2) board[r]![c] = makePiece('AI')
      else if (r >= 5) board[r]![c] = makePiece('HUMAN')
    }
  }

  return board
}

export function createInitialState(startingPlayer: Player = 'HUMAN'): GameState {
  return { board: createInitialBoard(), turn: startingPlayer }
}

