/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 *
 * 去完成路由框架（ECX-10436）
 * 分享类：share_jump_page 支持 path 字符串或 linkPage JSON；
 *   解析后 + member_task_id + member_task_sharer_user_id；
 * 浏览类落地计时后 browse-report。
 */
import Taro from '@tarojs/taro'
import { resolveLinkPageUrl } from '@/utils/linkPage'
import { cacheMemberTaskForCheckout } from '@/utils/memberTaskShare'

const SHARE_TYPES = ['share_order', 'invite_register']

export function isShareTaskType(type) {
  return SHARE_TYPES.includes(type)
}

/**
 * share_jump_page → 可分享小程序 path
 * - 字符串 path：原样
 * - JSON：{"linkPage":"custom_page","id":"196"} → resolveLinkPageUrl
 */
export function resolveShareJumpPath(raw) {
  if (raw == null || raw === '') return ''
  if (typeof raw === 'object' && raw.linkPage) {
    return resolveLinkPageUrl(raw) || ''
  }
  const s = String(raw).trim()
  if (!s) return ''
  if (s.startsWith('{')) {
    try {
      const data = JSON.parse(s)
      if (data && data.linkPage) {
        return resolveLinkPageUrl(data) || ''
      }
    } catch (e) {
      console.warn('[task] share_jump_page JSON parse fail', raw, e)
    }
  }
  return s
}

/**
 * 微信分享卡片：title / imageUrl / path
 * @param {object} task
 * @param {string|number} [userId] 分享人 user_id
 */
export function buildTaskShareMessage(task, userId) {
  if (!task) {
    return { title: '', path: '/pages/index' }
  }
  const raw = task.share?.path || task.jumpUrl || ''
  const path = resolveShareJumpPath(raw) || '/pages/index'
  return {
    title: task.share?.title || task.name || '',
    imageUrl: task.share?.cover || '',
    path: appendQuery(path, {
      member_task_id: task.taskId,
      member_task_sharer_user_id: userId
    })
  }
}

async function safeNavigate(url) {
  try {
    await Taro.navigateTo({ url })
  } catch (e) {
    console.warn('[task.goComplete] navigate fail', url, e)
    Taro.showToast({ title: String(url || ''), icon: 'none' })
  }
}

export async function goComplete(task) {
  if (!task || !task.taskId) return

  const type = task.type
  const jumpUrl = task.jumpUrl

  switch (type) {
    case 'signin':
      await safeNavigate(
        appendQuery(jumpUrl || '/subpages/member/sign-in/index', {
          task_id: task.taskId
        })
      )
      return
    case 'profile':
      // 新人任务 / 填写个人信息
      await safeNavigate(
        appendQuery(jumpUrl || '/subpages/member/user-info', {
          task_id: task.taskId
        })
      )
      return
    case 'browse': {
      const path = task.browse?.page_path || jumpUrl || '/pages/index'
      const page = String(task.browse?.page || path || '')
        .replace(/^\//, '')
        .split('?')[0]
      await safeNavigate(
        appendQuery(path, {
          task_id: task.taskId,
          stay: task.browse?.stay_seconds ?? 0,
          page
        })
      )
      return
    }
    case 'favorite':
      await safeNavigate(appendQuery(jumpUrl || '/pages/item/list', { task_id: task.taskId }))
      return
    case 'invite_register':
    case 'share_order': {
      // 兜底：未走 open-type=share 时跳到解析后的落地页 + 归因参数
      const raw = task.share?.path || jumpUrl || ''
      const path = resolveShareJumpPath(raw)
      if (path) {
        await safeNavigate(
          appendQuery(path, {
            member_task_id: task.taskId,
            member_task_sharer_user_id: task.shareUserId
          })
        )
      }
      return
    }
    case 'consume_once':
    case 'first_order':
    case 'consume_sum':
    case 'single_spend':
    case 'total_spend':
      // 消费类任务：点去完成即缓存 taskId，结算页下单带 member_task_id，后端据此判定完成与发奖
      cacheMemberTaskForCheckout(task.taskId)
      await safeNavigate(
        appendQuery(resolveShareJumpPath(jumpUrl) || '/pages/index', {
          member_task_id: task.taskId
        })
      )
      return
    default:
      if (jumpUrl) {
        await safeNavigate(appendQuery(jumpUrl, { task_id: task.taskId }))
      }
  }
}

function appendQuery(url, params = {}) {
  if (!url) return url
  const query = Object.keys(params)
    .filter((k) => params[k] != null && params[k] !== '')
    .map((k) => `${k}=${encodeURIComponent(params[k])}`)
  if (!query.length) return url
  const sep = url.indexOf('?') >= 0 ? '&' : '?'
  return `${url}${sep}${query.join('&')}`
}
