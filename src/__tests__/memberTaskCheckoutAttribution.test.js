const fs = require('fs')
const path = require('path')

const read = (p) => fs.readFileSync(path.resolve(process.cwd(), p), 'utf8')

const goCompleteSource = read('src/subpages/member/task/goComplete.js')
const shareSource = read('src/utils/memberTaskShare.js')
const cartCheckoutSource = read('src/pages/cart/espier-checkout.js')
const purchaseCheckoutSource = read('src/subpages/purchase/espier-checkout.js')
const useLoginSource = read('src/hooks/useLogin.js')

test('消费类任务去完成缓存任务号并按 member_task_id 跳转', () => {
  expect(goCompleteSource).toMatch(
    /import { cacheMemberTaskForCheckout } from '@\/utils\/memberTaskShare'/
  )
  expect(goCompleteSource).toMatch(
    /case 'first_order':[\s\S]*?cacheMemberTaskForCheckout\(task\.taskId\)[\s\S]*?member_task_id: task\.taskId/
  )
  // 消费类任务分支里不能再用 task_id（后端只认 member_task_id）
  const consumeBranch = goCompleteSource.match(/case 'consume_once':[\s\S]*?return/)
  expect(consumeBranch).not.toBeNull()
  expect(consumeBranch[0]).toMatch(/member_task_id: task\.taskId/)
  expect(consumeBranch[0]).not.toMatch(/\btask_id: task\.taskId/)
  // 指定路径存的是 linkPage JSON，需先解析再跳
  expect(consumeBranch[0]).toMatch(/resolveShareJumpPath\(jumpUrl\)/)
})

test('会员任务缓存写出 member_task_id 且去完成缓存带有效期', () => {
  expect(shareSource).toMatch(/export function cacheMemberTaskForCheckout\(taskId\)/)
  expect(shareSource).toMatch(/member_task_id: id,/)
  expect(shareSource).toMatch(/expire_at: nowSeconds\(\) \+ GO_COMPLETE_CACHE_TTL_SECONDS/)
  expect(shareSource).toMatch(
    /if \(data\.expire_at && Number\(data\.expire_at\) <= nowSeconds\(\)\)/
  )
})

test('两个结算页下单都透传缓存的会员任务归因', () => {
  for (const source of [cartCheckoutSource, purchaseCheckoutSource]) {
    expect(source).toMatch(/const memberTaskShare = getMemberTaskShareParams\(\)/)
    expect(source).toMatch(/Object\.assign\(cus_parmas, memberTaskShare\)/)
  }
})

test('任务字段映射不为 linkPage JSON 强加前导斜杠', () => {
  const docSource = read('src/subpages/doc/task.js')
  expect(docSource).toMatch(/if \(raw\.startsWith\('\{'\)\) return raw/)
  expect(docSource).toMatch(/return normalizePath\(raw\)/)
})

test('退出登录清理会员任务归因缓存', () => {
  expect(useLoginSource).toMatch(/const logout = \(\) => {[\s\S]*?clearMemberTaskShareParams\(\)/)
})
