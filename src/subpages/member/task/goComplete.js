/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 *
 * 去完成路由框架（ECX-10436）
 * 分享类走页面 useShareAppMessage + Button open-type=share；
 * 浏览类落地计时后 browse-report。
 */
import Taro from '@tarojs/taro'
import { buildSharePath } from '@/utils'

const SHARE_TYPES = ['share_order', 'invite_register']

export function isShareTaskType(type) {
  return SHARE_TYPES.includes(type)
}

/**
 * 运营配置 jump（如 /products/6728）→ 小程序可打开/可分享路径
 * @param {string} raw
 * @param {string|number} [taskId]
 * @param {'share'|'navigate'} mode share 用统一落地页；navigate 直达详情
 */
export function resolveTaskJumpPath(raw, taskId, mode = 'navigate') {
  const s = String(raw || '').trim()
  const products = s.match(/^\/?products\/(\d+)/i)
  if (products) {
    const id = products[1]
    if (mode === 'share') {
      return buildSharePath('poster_espier_detail', {
        id,
        ...(taskId != null && taskId !== '' ? { task_id: taskId } : {})
      })
    }
    return appendTaskId(`/subpages/item/espier-detail?id=${id}`, taskId)
  }
  if (!s) {
    return mode === 'share'
      ? buildSharePath('poster_home', taskId != null ? { task_id: taskId } : {})
      : appendTaskId('/pages/index', taskId)
  }
  const path = s.startsWith('/') ? s : `/${s}`
  return appendTaskId(path, taskId)
}

/** 微信分享卡片：title / imageUrl / path */
export function buildTaskShareMessage(task) {
  if (!task) {
    return { title: '', path: '/pages/index' }
  }
  const raw = task.share?.path || task.jumpUrl || ''
  return {
    title: task.share?.title || task.name || '',
    imageUrl: task.share?.cover || '',
    path: resolveTaskJumpPath(raw, task.taskId, 'share')
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
        appendTaskId(jumpUrl || '/subpages/member/sign-in/index', task.taskId)
      )
      return
    case 'browse': {
      const path = task.browse?.page_path || jumpUrl || '/pages/index'
      const page = String(task.browse?.page || path || '')
        .replace(/^\//, '')
        .split('?')[0]
      await safeNavigate(
        appendTaskId(path, task.taskId, {
          stay: task.browse?.stay_seconds ?? 0,
          page
        })
      )
      return
    }
    case 'favorite':
      await safeNavigate(appendTaskId(jumpUrl || '/pages/item/list', task.taskId))
      return
    case 'invite_register':
    case 'share_order': {
      // 兜底：未走 open-type=share 时，跳到可分享的商品详情（解析 /products/{id}）
      const raw = task.share?.path || jumpUrl || ''
      const url = resolveTaskJumpPath(raw, task.taskId, 'navigate')
      await safeNavigate(url)
      return
    }
    case 'consume_once':
    case 'first_order':
    case 'consume_sum':
    case 'single_spend':
    case 'total_spend':
      await safeNavigate(appendTaskId(jumpUrl || '/pages/index', task.taskId))
      return
    default:
      if (jumpUrl) {
        await safeNavigate(resolveTaskJumpPath(jumpUrl, task.taskId, 'navigate'))
      }
  }
}

function appendTaskId(url, taskId, extra = {}) {
  if (!url) return url
  if (taskId == null || taskId === '') {
    const onlyExtra = Object.keys(extra)
      .filter((k) => extra[k] != null && extra[k] !== '')
      .map((k) => `${k}=${encodeURIComponent(extra[k])}`)
    if (!onlyExtra.length) return url
    const sep = url.indexOf('?') >= 0 ? '&' : '?'
    return `${url}${sep}${onlyExtra.join('&')}`
  }
  const query = [`task_id=${encodeURIComponent(taskId)}`]
  Object.keys(extra).forEach((k) => {
    if (extra[k] != null && extra[k] !== '') {
      query.push(`${k}=${encodeURIComponent(extra[k])}`)
    }
  })
  const sep = url.indexOf('?') >= 0 ? '&' : '?'
  return `${url}${sep}${query.join('&')}`
}
