/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 *
 * 去完成路由框架（ECX-10436）
 * 各类型具体完成策略（分享/签到/浏览/收藏）由 ECX-10428 / F-066 补齐。
 */
import Taro from '@tarojs/taro'

/**
 * @param {object} task 映射后的任务
 * @returns {Promise<void>}
 */
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

  // 提交前二次校验由接口负责；本地仅做入口分发
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
      await safeNavigate(
        appendTaskId(path, task.taskId, {
          stay: task.browse?.stay_seconds ?? 0
        })
      )
      return
    }
    case 'favorite':
      await safeNavigate(appendTaskId(jumpUrl || '/pages/item/list', task.taskId))
      return
    case 'invite_register':
    case 'share_order':
      // 分享三件套：share_cover / share_title / share_jump_page → task.share
      if (jumpUrl || task.share?.path) {
        await safeNavigate(
          appendTaskId(jumpUrl || task.share.path, task.taskId)
        )
        return
      }
      Taro.showToast({ title: task.share?.title || 'share', icon: 'none' })
      return
    case 'consume_once':
    case 'first_order':
    case 'consume_sum':
      await safeNavigate(appendTaskId(jumpUrl || '/pages/index', task.taskId))
      return
    default:
      if (jumpUrl) {
        await safeNavigate(appendTaskId(jumpUrl, task.taskId))
      }
  }
}

function appendTaskId(url, taskId, extra = {}) {
  if (!url) return url
  const query = [`task_id=${encodeURIComponent(taskId)}`]
  Object.keys(extra).forEach((k) => {
    if (extra[k] != null && extra[k] !== '') {
      query.push(`${k}=${encodeURIComponent(extra[k])}`)
    }
  })
  const sep = url.indexOf('?') >= 0 ? '&' : '?'
  return `${url}${sep}${query.join('&')}`
}
