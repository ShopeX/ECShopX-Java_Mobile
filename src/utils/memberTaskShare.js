/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 *
 * 会员任务归因：缓存任务号 → 下单携带 member_task_id
 * - 分享类（share_order / invite_register）：落地页参数缓存，带分享人
 * - 消费类（首单 / 单笔 / 累计）：点「去完成」时缓存，只带任务号（限时有效）
 */
import Taro from '@tarojs/taro'
import { SG_MEMBER_TASK_SHARE } from '@/consts/localstorage'

/**
 * 「去完成」缓存有效期（秒）：用户点完去完成会离开任务中心去下单，
 * 缓存不能永久有效，否则过几天买无关商品也会被归因到该任务。
 */
const GO_COMPLETE_CACHE_TTL_SECONDS = 24 * 60 * 60

function nowSeconds() {
  return Math.floor(Date.now() / 1000)
}

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

/**
 * 消费类任务（首单/单笔/累计消费）点「去完成」时写入归因缓存。
 * 任务中心跳转的落地页（商品/店铺/首页）不一定会带上参数，
 * 因此点击时直接缓存，结算页统一下单带出 member_task_id。
 * @param {string|number} taskId
 */
export function cacheMemberTaskForCheckout(taskId) {
  const id = Number(taskId)
  if (!Number.isInteger(id) || id <= 0) return
  const payload = {
    member_task_id: id,
    member_task_sharer_user_id: '',
    expire_at: nowSeconds() + GO_COMPLETE_CACHE_TTL_SECONDS
  }
  try {
    Taro.setStorageSync(SG_MEMBER_TASK_SHARE, payload)
  } catch (e) {
    console.warn('[memberTaskShare] cache fail', e)
  }
}

/** @returns {{ member_task_id?: string|number, member_task_sharer_user_id?: string|number }|null} */
export function getMemberTaskShareParams() {
  try {
    const data = Taro.getStorageSync(SG_MEMBER_TASK_SHARE)
    if (!data?.member_task_id) return null
    // 只有「去完成」写入的缓存带有效期；分享落地缓存保持原有长期有效行为
    if (data.expire_at && Number(data.expire_at) <= nowSeconds()) {
      Taro.removeStorageSync(SG_MEMBER_TASK_SHARE)
      return null
    }
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
