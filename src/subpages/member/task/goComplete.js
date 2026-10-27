/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 *
 * 去完成路由框架（ECX-10436）
 * 分享类：分享 path 用接口 share_jump_page 原样
 *   + member_task_id + member_task_sharer_user_id；
 * 浏览类落地计时后 browse-report。
 */
import Taro from '@tarojs/taro'

const SHARE_TYPES = ['share_order', 'invite_register']

export function isShareTaskType(type) {
  return SHARE_TYPES.includes(type)
}

/**
 * 微信分享卡片：title / imageUrl / path
 * path = 接口 share_jump_page 原样 + member_task_id + member_task_sharer_user_id
 * @param {object} task
 * @param {string|number} [userId] 分享人 user_id
 */
export function buildTaskShareMessage(task, userId) {
  if (!task) {
    return { title: '', path: '/pages/index' }
  }
  const raw = task.share?.path || task.jumpUrl || ''
  return {
    title: task.share?.title || task.name || '',
    imageUrl: task.share?.cover || '',
    path: appendQuery(raw, {
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
      await safeNavigate(
        appendQuery(jumpUrl || '/pages/item/list', { task_id: task.taskId })
      )
      return
    case 'invite_register':
    case 'share_order': {
      // 兜底：未走 open-type=share 时仍用接口链接原样 + 归因参数
      const raw = task.share?.path || jumpUrl || ''
      if (raw) {
        await safeNavigate(
          appendQuery(raw, {
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
      await safeNavigate(
        appendQuery(jumpUrl || '/pages/index', { task_id: task.taskId })
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
