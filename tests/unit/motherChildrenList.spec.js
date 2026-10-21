// A mother project lists its children as a small table: active ones first,
// then by name (numbers in names compared as numbers)
import { describe, it, expect } from 'vitest'
import { sortChildren } from '@/domain/motherFigures'

describe('mother children list', () => {
  it('puts active children first, then sorts by name', () => {
    const children = [
      { id: 1, name: 'B-2508', project_state: { id: 3 } },
      { id: 2, name: 'A-10', project_state: { id: 1 } },
      { id: 3, name: 'A-9', project_state: 1 },
      { id: 4, name: 'A-1', project_state: null },
    ]
    expect(sortChildren(children).map(c => c.id)).toEqual([3, 2, 4, 1])
    expect(children[0].id).toBe(1) // the original list is left as it was
  })

  it('accepts no children', () => {
    expect(sortChildren(undefined)).toEqual([])
  })
})
