export type Player = 'HUMAN' | 'AI'

export type Piece = {
  player: Player
  king: boolean
}

export type Board = Array<Array<Piece | null>>

export type Pos = {
  r: number
  c: number
}

/**
 * A move is a full turn for a single piece.
 * - Non-capture: path has 1 landing square, captures is empty.
 * - Capture: path has 1+ landing squares (multi-jump), captures has same length as jumps.
 */
export type Move = {
  from: Pos
  path: Pos[]
  captures: Pos[]
}

export type GameState = {
  board: Board
  turn: Player
  /**
   * When set, the current player must continue capturing with this piece.
   * (Most moves we generate are already maximal multi-jump sequences, so this is usually undefined.)
   */
  forcedFrom?: Pos
}

export const BOARD_SIZE = 8

