// Tasks, phase 2 (src/domain/tasks.js, src/domain/markdown.js): priority, hours,
// @mentions, the calendar grid, templates and the description's Markdown.
import { describe, it, expect } from 'vitest'
import {
  filterTasks, sortTasks, taskHours, formatHours, mentionQuery, insertMention, mentionedIds,
  calendarWeeks, templateItems, tasksFromTemplate, recurrenceLabel, priorityLabel
} from '@/domain/tasks'
import { renderMarkdown, markdownToText } from '@/domain/markdown'

describe('priority', () => {
  const tasks = [{ id: 1, priority: 'low' }, { id: 2 }, { id: 3, priority: 'high' }]
  it('sorts high first (empty counts as normal) and filters', () => {
    expect(sortTasks(tasks, 'priority').map(t => t.id)).toEqual([3, 2, 1])
    expect(filterTasks(tasks, { state: 'all', priority: 'normal' }).map(t => t.id)).toEqual([2])
    expect(priorityLabel('high')).toBe('Alta')
    expect(recurrenceLabel('biweekly')).toBe('Cada 2 setmanes')
    expect(recurrenceLabel(null)).toBe('No es repeteix')
  })
})

describe('hours', () => {
  it('logged against estimated', () => {
    expect(taskHours({ id: 1, estimated_hours: 4 }, { 1: 5 })).toEqual({ done: 5, estimate: 4, ratio: 1, over: true })
    expect(taskHours({ id: 2, estimated_hours: null }, { 2: 1.5 })).toEqual({ done: 1.5, estimate: null, ratio: 0, over: false })
    expect(formatHours(1.5)).toBe('1,5 h')
  })
})

describe('mentions', () => {
  const users = [{ id: 8, username: 'Laia Puig' }, { id: 9, username: 'Pau' }]
  it('finds the query at the caret, inserts the name and reads the ids back', () => {
    expect(mentionQuery('Hola @La', 8)).toBe('La')
    expect(mentionQuery('Hola @Laia P', 12)).toBe('Laia P')
    expect(mentionQuery('correu a@b.cat', 14)).toBe(null)
    const r = insertMention('Hola @La i prou', 8, 'Laia Puig')
    expect(r).toEqual({ text: 'Hola @Laia Puig  i prou', caret: 16 })
    expect(mentionedIds('Ei @Laia Puig i @Pau', users)).toEqual([8, 9])
    expect(mentionedIds('Ei Pau', users)).toEqual([])
  })
})

describe('calendar', () => {
  it('weeks from Monday; a task on every day from its start to its due date', () => {
    const weeks = calendarWeeks('2026-10', [
      { id: 1, start_date: '2026-10-05', due_date: '2026-10-07' },
      { id: 2, due_date: '2026-10-31' },
      { id: 3 }
    ])
    expect(weeks[0][0].date).toBe('2026-09-28')
    expect(weeks[0][0].inMonth).toBe(false)
    const day = d => weeks.flat().find(x => x.date === d).tasks.map(t => t.id)
    expect([day('2026-10-04'), day('2026-10-05'), day('2026-10-07'), day('2026-10-08')]).toEqual([[], [1], [1], []])
    expect(day('2026-10-31')).toEqual([2])
    expect(weeks.at(-1).at(-1).date).toBe('2026-11-01')
  })
})

describe('templates', () => {
  it('keeps the dates as days from the earliest one and applies them from another day', () => {
    const items = templateItems([
      { name: 'Acta', start_date: '2026-10-10', due_date: '2026-10-12', priority: 'high', activity_type: { id: 7 }, checklist: [{ name: 'Enviar', done: true }] },
      { name: 'Factura', due_date: '2026-10-20', estimated_hours: 2 }
    ])
    expect(items).toEqual([
      { name: 'Acta', description: null, activity_type: 7, priority: 'high', estimated_hours: null, recurrence: null, start_days: 0, due_days: 2, checklist: ['Enviar'] },
      { name: 'Factura', description: null, activity_type: null, priority: 'normal', estimated_hours: 2, recurrence: null, start_days: null, due_days: 10, checklist: [] }
    ])
    const tasks = tasksFromTemplate(items, { project: 4, from: '2027-01-01', stateId: 1, createdBy: 5 })
    expect(tasks[0]).toMatchObject({ name: 'Acta', project: 4, start_date: '2027-01-01', due_date: '2027-01-03', task_state: 1, created: 5, checklist: [{ name: 'Enviar', done: false }] })
    expect(tasks[1]).toMatchObject({ start_date: null, due_date: '2027-01-11', estimated_hours: 2 })
  })
})

describe('markdown', () => {
  it('formats a little and never lets HTML through', () => {
    expect(renderMarkdown('**Hola** *món*')).toBe('<p><b>Hola</b> <i>món</i></p>')
    expect(renderMarkdown('- a\n- b\n\n1. c')).toBe('<ul><li>a</li><li>b</li></ul><ol><li>c</li></ol>')
    expect(renderMarkdown('línia 1\nlínia 2')).toBe('<p>línia 1<br>línia 2</p>')
    expect(renderMarkdown('[web](https://x.cat) i https://y.cat.')).toBe('<p><a href="https://x.cat" target="_blank" rel="noopener noreferrer">web</a> i <a href="https://y.cat" target="_blank" rel="noopener noreferrer">https://y.cat</a>.</p>')
    const evil = renderMarkdown('<img src=x onerror=alert(1)> [x](javascript:alert(1))')
    expect(evil).not.toContain('<img')
    expect(evil).not.toContain('href="javascript')
    expect(markdownToText('**Hola** [web](https://x.cat)\n- a')).toBe('Hola web\na')
  })
})
