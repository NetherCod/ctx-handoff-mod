// 新對話的開頭內容（經驗、放進專案的交代、守門詢問、進度備忘）：prompt.context 或第一則訊息的 prompt.submit 擇一帶入
import { expect, test } from 'claude-code/testing'
import { NOTE_TAG, NOTES, EXISTING, ctl, say, world } from './test-world'

const HEAD = `${NOTE_TAG} 這個工作區累積的`
const projectBlock = (blocks: readonly { name: string }[]) => blocks.find(b => b.name === 'ctxHandoffProject')

// 事故（2026-10-22）：Claude Code 2.1.304 起，Team／Enterprise 登入或有受管設定時，內建守門 mod（cc-plugin-sec-default）
// 讓 prompt.context 越過使用者裝的 mod，新對話完全沒帶入經驗
test('prompt.context 被跳過：經驗跟著第一則人類訊息帶入，下一則不再帶', async ($, on) => {
  const w = world(on, 1000)
  w.files.set(NOTES, EXISTING)
  await say($, '第一則')
  expect(w.contexts[0]?.[0]).toStartWith(HEAD)
  await say($, '第二則')
  expect(w.contexts[1]).toBeUndefined()
})

test('prompt.context 先跑：第一則訊息不重複帶入', async ($, on) => {
  const w = world(on, 1000)
  w.files.set(NOTES, EXISTING)
  expect(projectBlock((await $.prompt.context({ blocks: [] })).blocks)).toBeDefined()
  await say($, '第一則')
  expect(w.contexts[0]).toBeUndefined()
})

test('第一則訊息先帶過：同一段的 prompt.context 略過一次，之後（compaction 重算）照常帶入', async ($, on) => {
  const w = world(on, 1000)
  w.files.set(NOTES, EXISTING)
  await say($, '第一則')
  expect(w.contexts[0]?.[0]).toStartWith(HEAD)
  expect(projectBlock((await $.prompt.context({ blocks: [] })).blocks)).toBeUndefined()
  expect(projectBlock((await $.prompt.context({ blocks: [] })).blocks)).toBeDefined()
})

test('斜線指令與被丟棄的訊息不算：下一則真正送進對話的才帶入', async ($, on) => {
  const w = world(on, 1000)
  w.files.set(NOTES, EXISTING)
  await say($, '/handoff')
  expect(w.contexts[0]).toBeUndefined()
  ctl.failSubmits = 1
  await say($, '被丟棄的訊息')
  expect(w.get('opening:S1')).toBeUndefined()
  await say($, '真正送出的訊息')
  expect(w.contexts.at(-1)?.[0]).toStartWith(HEAD)
  expect(w.get('opening:S1')).toBe('submit')
})

test('/clear 之後的新對話（新的 session id）再帶一次', async ($, on) => {
  const w = world(on, 1000)
  w.files.set(NOTES, EXISTING)
  await say($, '第一段')
  ctl.curSid = 'S2'
  await say($, '第二段')
  expect(w.contexts.map(c => c?.[0]?.startsWith(HEAD))).toEqual([true, true])
})
