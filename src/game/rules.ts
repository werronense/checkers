import type { Board, GameState, Move, Piece, Player, Pos } from './types'
import { BOARD_SIZE } from './types'
import { cloneBoard, getAt, isInside, isOpponent, otherPlayer, samePos } from './utils'

function isKingRow(player: Player, r: number): boolean {
  return player === 'HUMAN' ? r === 0 : r === BOARD_SIZE - 1
}

function forwardDelta(player: Player): number {
  return player === 'HUMAN' ? -1 : 1
}

function movementRowDeltas(piece: Piece): number[] {
  if (piece.king) return [-1, 1]
  return [forwardDelta(piece.player)]
}

type ImmediateCapture = { to: Pos; capture: Pos }

function listImmediateCaptures(board: Board, from: Pos, piece: Piece): ImmediateCapture[] {
  const out: ImmediateCapture[] = []
  const rowDeltas = movementRowDeltas(piece)
  for (const dr of rowDeltas) {
    for (const dc of [-1, 1] as const) {
      const mid = { r: from.r + dr, c: from.c + dc }
      const to = { r: from.r + 2 * dr, c: from.c + 2 * dc }
      if (!isInside(to.r, to.c) || !isInside(mid.r, mid.c)) continue
      const midPiece = getAt(board, mid)
      if (!isOpponent(piece.player, midPiece)) continue
      if (getAt(board, to) !== null) continue
      out.push({ to, capture: mid })
    }
  }
  return out
}

function generateCaptureMoves(board: Board, from: Pos, piece: Piece): Move[] {
  const moves: Move[] = []

  const dfs = (b: Board, at: Pos, path: Pos[], captures: Pos[]): void => {
    const immed = listImmediateCaptures(b, at, piece)
    if (immed.length === 0) {
      if (captures.length > 0) moves.push({ from, path, captures })
      return
    }

    for (const cap of immed) {
      const nb = cloneBoard(b)
      // move piece
      nb[at.r]![at.c] = null
      nb[cap.capture.r]![cap.capture.c] = null
      nb[cap.to.r]![cap.to.c] = piece

      const nextPath = path.concat([cap.to])
      const nextCaptures = captures.concat([cap.capture])

      // In American checkers, crowning ends the turn (no continuing jumps as a new king).
      if (!piece.king && isKingRow(piece.player, cap.to.r)) {
        moves.push({ from, path: nextPath, captures: nextCaptures })
      } else {
        dfs(nb, cap.to, nextPath, nextCaptures)
      }
    }
  }

  dfs(board, from, [], [])
  return moves
}

function generateNonCaptureMoves(board: Board, from: Pos, piece: Piece): Move[] {
  const out: Move[] = []
  const rowDeltas = movementRowDeltas(piece)
  for (const dr of rowDeltas) {
    for (const dc of [-1, 1] as const) {
      const to = { r: from.r + dr, c: from.c + dc }
      if (!isInside(to.r, to.c)) continue
      if (getAt(board, to) !== null) continue
      out.push({ from, path: [to], captures: [] })
    }
  }
  return out
}

export function getMovesForPiece(state: GameState, from: Pos): Move[] {
  const piece = getAt(state.board, from)
  if (!piece || piece.player !== state.turn) return []

  const captures = generateCaptureMoves(state.board, from, piece)
  if (captures.length > 0) {
    // capture moves already include full multi-jump sequences; each path element is a landing square
    return captures.map((m) => ({
      ...m,
      path: m.path.length === 0 ? [] : m.path,
    }))
  }
  return generateNonCaptureMoves(state.board, from, piece)
}

export function getLegalMoves(state: GameState): Move[] {
  if (state.forcedFrom) {
    const forcedMoves = getMovesForPiece(state, state.forcedFrom).filter((m) => m.captures.length > 0)
    return forcedMoves
  }

  const captures: Move[] = []
  const normals: Move[] = []

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const p = state.board[r]![c]
      if (!p || p.player !== state.turn) continue
      const from = { r, c }
      const ms = getMovesForPiece(state, from)
      for (const m of ms) {
        if (m.captures.length > 0) captures.push(m)
        else normals.push(m)
      }
    }
  }

  return captures.length > 0 ? captures : normals
}

export function applyMove(state: GameState, move: Move): GameState {
  const piece = getAt(state.board, move.from)
  if (!piece) return state

  const board = cloneBoard(state.board)
  board[move.from.r]![move.from.c] = null

  for (const cap of move.captures) {
    board[cap.r]![cap.c] = null
  }

  const final = move.path.length > 0 ? move.path[move.path.length - 1]! : move.from
  const shouldKing = !piece.king && isKingRow(piece.player, final.r)
  const placed: Piece = shouldKing ? { ...piece, king: true } : piece
  board[final.r]![final.c] = placed

  // Forced continuation (rare if we generate maximal sequences).
  if (move.captures.length > 0 && !shouldKing) {
    const more = listImmediateCaptures(board, final, placed)
    if (more.length > 0) {
      return { board, turn: state.turn, forcedFrom: final }
    }
  }

  return { board, turn: otherPlayer(state.turn) }
}

export function countPieces(board: Board): { human: number; ai: number } {
  let human = 0
  let ai = 0
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const p = board[r]![c]
      if (!p) continue
      if (p.player === 'HUMAN') human++
      else ai++
    }
  }
  return { human, ai }
}

export function isTerminal(state: GameState): { over: boolean; winner?: Player } {
  const counts = countPieces(state.board)
  if (counts.human === 0) return { over: true, winner: 'AI' }
  if (counts.ai === 0) return { over: true, winner: 'HUMAN' }

  const legal = getLegalMoves(state)
  if (legal.length === 0) return { over: true, winner: otherPlayer(state.turn) }
  return { over: false }
}

export function moveEndsAt(move: Move): Pos {
  return move.path.length > 0 ? move.path[move.path.length - 1]! : move.from
}

export function moveFrom(move: Move): Pos {
  return move.from
}

export function isMoveFrom(move: Move, from: Pos): boolean {
  return samePos(move.from, from)
}

