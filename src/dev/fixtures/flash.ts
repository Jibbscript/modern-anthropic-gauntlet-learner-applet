import type { FlashCard, Step } from '../../core/types'

/**
 * Flashcard fixtures (review-only kind, so cast into the Step list the gallery expects):
 * - a short front with inline code and a two-sentence back
 * - a front with a code block, and an id carrying ReviewSession's "~n" suffix
 * - a very long back, to check the card grows instead of clipping
 */
const cards: (FlashCard & { id: string })[] = [
  {
    kind: 'flash',
    id: 'fx-flash-atomic',
    front: 'In CPython, `x in seen` and `seen.add(x)` are each atomic. Why is check-then-add still a race?',
    back: 'Each operation is atomic; the pair is not. Another thread can run between the check and the add, so both see “not seen” and both proceed.',
  },
  {
    kind: 'flash',
    id: 'fx-flash-pickle~3',
    front: 'What is wrong with sending this to a `ProcessPoolExecutor`?',
    code: {
      code: 'images = [load(p) for p in paths]\nlist(pool.map(blur, images))',
    },
    back: 'Every decoded image is pickled and copied to a worker, serially, in the parent. Send **paths** instead and let workers load and save.',
  },
  {
    kind: 'flash',
    id: 'fx-flash-review',
    front: 'Your six-step review of an AI-generated change?',
    back: '1. Define correct, with edge cases.\n2. Run it.\n3. Read closely: APIs against docs, error paths, shared state, loops.\n4. Write a failing test per bug.\n5. Comment with line, input, consequence and fix.\n6. Re-run after the fix.',
  },
]

export default cards as unknown as Step[]
