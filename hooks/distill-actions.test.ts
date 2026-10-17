import { expect, test } from 'claude-code/testing'
import { addRejected, prepareDistillActions, reconcileDistillActions } from './distill'
import { parseNotes } from './notes'
import { actionsReply } from './test-world'

test('裁決 owner 採用外部正規化路徑，重試已完成動作是成功 no-op', () => {
  const notes = parseNotes('')
  const prepared = prepareDistillActions({
    text: actionsReply({ op: 'in_project', id: 'G1', where: 'C:/proj/AGENTS.md' }), notes, userText: '', candidates: [], drafts: [], retry: true,
    guards: [{ id: 1, state: 'off', project: '已在 AGENTS.md' }],
  })
  const result = reconcileDistillActions({ prepared, actions: [{ op: 'in_project', id: 'G1', where: 'AGENTS.md' }], tombstones: { known: [], dead: [] }, currentUserText: '', notes, day: '2026-10-17', sid: 'S1', source: 'S1:0:5' })
  expect(result.kind).toBe('usable')
  if (result.kind !== 'usable') throw new Error('expected usable result')
  expect(result.actions).toEqual([])
  expect(result.changes).toEqual([])
  expect(result.rejected.count).toBe(0)
  expect(result.hasEffects).toBe(false)
})

test('裁決 owner 保留外部缺檔 rejection，不能把它當空合法回應', () => {
  const notes = parseNotes('')
  const prepared = prepareDistillActions({ text: actionsReply({ op: 'in_project', id: 'G1', where: 'AGENTS.md' }), notes, userText: '', candidates: ['G1'], drafts: [], retry: false, guards: [] })
  addRejected(prepared.rejected, 'file missing', 'AGENTS.md')
  const result = reconcileDistillActions({ prepared, actions: [], tombstones: { known: [], dead: [] }, currentUserText: '', notes, day: '2026-10-17', sid: 'S1', source: 'S1:0:5' })
  expect(result.kind).toBe('unusable')
  expect(result.rejected.count).toBe(1)
})

test('裁決 owner 對空合法回應仍成功，不產生副作用', () => {
  const notes = parseNotes('')
  const prepared = prepareDistillActions({ text: actionsReply(), notes, userText: '', candidates: [], drafts: [], retry: false, guards: [] })
  const result = reconcileDistillActions({ prepared, actions: [], tombstones: { known: [], dead: [] }, currentUserText: '', notes, day: '2026-10-17', sid: 'S1', source: 'S1:0:5' })
  expect(result.kind).toBe('usable')
  if (result.kind !== 'usable') throw new Error('expected usable result')
  expect(result.hasEffects).toBe(false)
  expect(result.rejected).toEqual({ count: 0, samples: [] })
})
