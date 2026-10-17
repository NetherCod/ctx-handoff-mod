import { expect, test } from 'claude-code/testing'
import { selectDistillBatch } from './distill-batch'
import type { Row } from './transcript'

const row = (text: string): Row => ({ role: 'user', text, toolUses: [] })

test('批次 owner 保持 retry 端點、source 與本批 quote 範圍', () => {
  const batch = selectDistillBatch({
    sid: 'S1', turns: 9, anchor: 'new',
    rows: [row('old'), row('current'), row('new')],
    previous: { turn: 2, anchor: 'old', rowCount: 1, last: { role: 'user', text: 'old' } },
    retry: { fromTurn: 2, turn: 5, anchor: 'current', rowCount: 2, last: { role: 'user', text: 'current' } },
  })
  expect(batch.kind).toBe('ready')
  if (batch.kind !== 'ready') throw new Error('expected ready batch')
  expect(batch.turns).toBe(5)
  expect(batch.source).toBe('S1:2:5')
  expect(batch.userText).toBe('oldcurrent')
  expect(batch.currentUserText).toBe('current')
  expect(batch.transcript.text).toBe('【使用者】current')
  expect(batch.endpoint).toEqual({ fromTurn: 2, turn: 5, anchor: 'current', rowCount: 2, last: { role: 'user', text: 'current' } })
})

test('批次 owner 拒絕消失的 retry 端點，找不到舊錨點不讓全對話解除墓碑', () => {
  const input = { sid: 'S1', turns: 5, anchor: undefined, rows: [row('compressed')], previous: { turn: 2, anchor: 'old' }, retry: undefined }
  const batch = selectDistillBatch(input)
  expect(batch.kind).toBe('ready')
  if (batch.kind !== 'ready') throw new Error('expected ready batch')
  expect(batch.userText).toBe('compressed')
  expect(batch.currentUserText).toBe('')
  expect(selectDistillBatch({ ...input, retry: { fromTurn: 2, turn: 5, rowCount: 2 } })).toEqual({ kind: 'blocked', reason: 'retry-lost' })
})
