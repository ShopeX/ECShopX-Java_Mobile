/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 *
 * 会员任务「分享好友下单」归因：落地缓存 → 下单携带
 */
import Taro from '@tarojs/taro'
import { SG_MEMBER_TASK_SHARE } from '@/consts/localstorage'

/**
 * 从路由/启动参数写入缓存（有 member_task_id 才更新）
 * @param {object} params
 */
export function captureMemberTaskShareFromParams(params = {}) {
  const member_task_id = params.member_task_id
  if (member_task_id == null || member_task_id === '') return
  const payload = {
    member_task_id,
    member_task_sharer_user_id: params.member_task_sharer_user_id || ''
  }
  try {
    Taro.setStorageSync(SG_MEMBER_TASK_SHARE, payload)
  } catch (e) {
    console.warn('[memberTaskShare] capture fail', e)
  }
}

/** @returns {{ member_task_id?: string|number, member_task_sharer_user_id?: string|number }|null} */
export function getMemberTaskShareParams() {
  try {
    const data = Taro.getStorageSync(SG_MEMBER_TASK_SHARE)
    if (!data?.member_task_id) return null
    return {
      member_task_id: data.member_task_id,
      ...(data.member_task_sharer_user_id
        ? { member_task_sharer_user_id: data.member_task_sharer_user_id }
        : {})
    }
  } catch (e) {
    return null
  }
}

export function clearMemberTaskShareParams() {
  try {
    Taro.removeStorageSync(SG_MEMBER_TASK_SHARE)
  } catch (e) {
    // ignore
  }
}
