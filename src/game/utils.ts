import type { Board, Piece, Player, Pos } from './types'
import { BOARD_SIZE } from './types'

export function posKey(p: Pos): string {
  return `${p.r},${p.c}`
}

export function samePos(a: Pos, b: Pos): boolean {
  return a.r === b.r && a.c === b.c
}

export function isInside(r: number, c: number): boolean {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE
}

export function isDarkSquare(r: number, c: number): boolean {
  // Treat (0,0) as light; playable squares are dark.
  return (r + c) % 2 === 1
}

export function cloneBoard(board: Board): Board {
  // Piece objects are treated as immutable, so row cloning is sufficient.
  return board.map((row) => row.slice())
}

export function getAt(board: Board, p: Pos): Piece | null {
  return board[p.r]?.[p.c] ?? null
}

export function setAt(board: Board, p: Pos, value: Piece | null): void {
  board[p.r]![p.c] = value
}

export function otherPlayer(p: Player): Player {
  return p === 'HUMAN' ? 'AI' : 'HUMAN'
}

export function isOpponent(a: Player, maybe: Piece | null): boolean {
  return !!maybe && maybe.player !== a
}

