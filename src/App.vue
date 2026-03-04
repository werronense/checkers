<script setup lang="ts">
import { computed, ref } from 'vue'

import { chooseAiMove, quickCounts } from './game/ai'
import { createInitialState } from './game/setup'
import { applyMove, getLegalMoves, isTerminal, isMoveFrom, moveEndsAt } from './game/rules'
import { isDarkSquare, posKey, samePos } from './game/utils'
import { BOARD_SIZE, type Move, type Piece, type Pos } from './game/types'

const aiDepth = 4

const gameState = ref(createInitialState('HUMAN'))
const selectedFrom = ref<Pos | null>(null)
const candidateMoves = ref<Move[]>([])
const aiThinking = ref(false)

const terminal = computed(() => isTerminal(gameState.value))
const counts = computed(() => quickCounts(gameState.value))

const legalMoves = computed(() => {
  if (terminal.value.over) return []
  return getLegalMoves(gameState.value)
})

const forcedCapture = computed(() => legalMoves.value.some((m) => m.captures.length > 0))

const highlightKeys = computed(() => {
  const s = new Set<string>()
  for (const m of candidateMoves.value) s.add(posKey(moveEndsAt(m)))
  return s
})

const squares = computed(() => {
  const out: Pos[] = []
  for (let r = 0; r < BOARD_SIZE; r++) for (let c = 0; c < BOARD_SIZE; c++) out.push({ r, c })
  return out
})

function pieceAt(p: Pos): Piece | null {
  return gameState.value.board[p.r]?.[p.c] ?? null
}

function clearSelection(): void {
  selectedFrom.value = null
  candidateMoves.value = []
}

function pickMoveTo(to: Pos): Move | null {
  const matches = candidateMoves.value.filter((m) => samePos(moveEndsAt(m), to))
  if (matches.length === 0) return null
  // Prefer the move that captures the most pieces.
  matches.sort((a, b) => b.captures.length - a.captures.length)
  return matches[0]!
}

async function runAiTurn(): Promise<void> {
  if (terminal.value.over) return
  if (gameState.value.turn !== 'AI') return

  aiThinking.value = true
  // Small pause so the UI updates before the AI move.
  await new Promise((r) => setTimeout(r, 120))

  // In case the rules ever produce forced continuation, loop safely.
  let guard = 0
  while (!isTerminal(gameState.value).over && gameState.value.turn === 'AI' && guard < 50) {
    const move = chooseAiMove(gameState.value, aiDepth)
    gameState.value = applyMove(gameState.value, move)
    guard++
  }

  aiThinking.value = false
}

function onSquareClick(p: Pos): void {
  if (terminal.value.over) return
  if (gameState.value.turn !== 'HUMAN') return
  if (aiThinking.value) return

  const key = posKey(p)
  if (highlightKeys.value.has(key)) {
    const move = pickMoveTo(p)
    if (!move) return
    gameState.value = applyMove(gameState.value, move)
    clearSelection()
    void runAiTurn()
    return
  }

  const piece = pieceAt(p)
  if (piece && piece.player === 'HUMAN') {
    selectedFrom.value = p
    candidateMoves.value = legalMoves.value.filter((m) => isMoveFrom(m, p))
    return
  }

  clearSelection()
}

function restart(): void {
  gameState.value = createInitialState('HUMAN')
  aiThinking.value = false
  clearSelection()
}

function squareClass(p: Pos): string {
  const dark = isDarkSquare(p.r, p.c)
  const isHighlighted = highlightKeys.value.has(posKey(p))
  const isSelected = selectedFrom.value && samePos(selectedFrom.value, p)

  const base = dark ? 'bg-black' : 'bg-white'
  const hover =
    terminal.value.over || gameState.value.turn !== 'HUMAN' ? '' : 'hover:brightness-110'
  const cursor =
    terminal.value.over || gameState.value.turn !== 'HUMAN' ? 'cursor-default' : 'cursor-pointer'

  const ring = isHighlighted
    ? 'ring-4 ring-violet-600 ring-inset'
    : isSelected
      ? 'ring-4 ring-sky-300 ring-inset'
      : ''

  return `relative flex items-center justify-center ${base} ${hover} ${cursor} ${ring}`
}

function pieceClass(piece: Piece): string {
  const color = piece.player === 'HUMAN' ? 'bg-pink-600' : 'bg-white'
  const outline = piece.king
    ? piece.player === 'HUMAN'
      ? 'ring-2 ring-white'
      : 'ring-2 ring-pink-600'
    : 'ring-1 ring-black/20'
  return `h-10 w-10 sm:h-12 sm:w-12 rounded-full ${color} ${outline} shadow-md flex items-center justify-center`
}

const bannerText = computed(() => {
  if (terminal.value.over) {
    if (terminal.value.winner === 'HUMAN') return 'You won.'
    if (terminal.value.winner === 'AI') return 'You lost.'
    return 'Game over.'
  }
  if (aiThinking.value) return 'Computer is thinking…'
  if (gameState.value.turn === 'HUMAN')
    return forcedCapture.value ? 'Your turn (capture required).' : 'Your turn.'
  return 'Computer’s turn.'
})
</script>

<template>
  <div class="min-h-dvh bg-zinc-950 text-zinc-100">
    <div class="mx-auto max-w-3xl px-4 py-10">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight">Checkers</h1>
          <p class="text-sm text-zinc-300">
            You are <span class="font-medium text-pink-400">Pink</span>. Computer is
            <span class="font-medium text-zinc-200">White</span>.
          </p>
        </div>

        <button
          class="rounded-lg bg-zinc-800 px-3 py-2 text-sm font-medium hover:bg-zinc-700 active:bg-zinc-600"
          @click="restart"
        >
          Restart
        </button>
      </div>

      <div class="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="text-sm font-medium">{{ bannerText }}</div>
          <div class="text-xs text-zinc-300">
            Pink: <span class="font-semibold text-zinc-100">{{ counts.human }}</span> • White:
            <span class="font-semibold text-zinc-100">{{ counts.ai }}</span>
          </div>
        </div>
      </div>

      <div class="mt-6">
        <div class="mx-auto w-full max-w-[520px]">
          <div
            class="grid aspect-square grid-cols-8 grid-rows-8 overflow-hidden rounded-none ring-1 ring-zinc-800"
          >
            <button
              v-for="p in squares"
              :key="posKey(p)"
              type="button"
              :class="squareClass(p)"
              :disabled="terminal.over || gameState.turn !== 'HUMAN' || aiThinking"
              :aria-label="`Square ${p.r},${p.c}`"
              @click="onSquareClick(p)"
            >
              <div v-if="pieceAt(p)" :class="pieceClass(pieceAt(p)!)">
                <svg
                  v-if="pieceAt(p)!.king"
                  class="h-5 w-5 sm:h-6 sm:w-6 shrink-0"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                  :class="pieceAt(p)!.player === 'HUMAN' ? 'text-white' : 'text-pink-600'"
                >
                  <path d="M12 2l2 6h4l-3 4 1 6-4-3-4 3 1-6-3-4h4l2-6z" />
                </svg>
              </div>
            </button>
          </div>
        </div>

        <div class="mx-auto mt-4 max-w-[520px] text-xs text-zinc-400">
          Click a pink piece to see legal moves. Click a highlighted square to move.
        </div>
      </div>
    </div>
  </div>
</template>
