/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */

/**
 * 解析应展示在某条主品下方的满赠赠品（同一活动仅挂在最后一个关联主品下，避免重复）。
 */
export function resolveGiftsUnderCartItem(item, index, list, giftActivity = []) {
  if (!item || !Array.isArray(giftActivity) || giftActivity.length === 0) {
    return []
  }
  const fullGiftIds = normalizeIdList(item.full_gift_id)
  const out = []
  const seen = new Set()
  for (const act of giftActivity) {
    if (!act) continue
    const activityId = act.activity_id
    if (activityId == null) continue
    const aid = String(activityId)
    const linkedByFullGift = fullGiftIds.some((id) => String(id) === aid)
    const linkedByActivityItems = normalizeIdList(act.activity_item_ids).some(
      (id) => String(id) === String(item.item_id)
    )
    if (!linkedByFullGift && !linkedByActivityItems) {
      continue
    }
    // 同一活动只挂在最后一个关联主品下方
    const isLastForActivity = !list.slice(index + 1).some((later) => {
      const laterIds = normalizeIdList(later?.full_gift_id)
      if (laterIds.some((id) => String(id) === aid)) {
        return true
      }
      return normalizeIdList(act.activity_item_ids).some(
        (id) => String(id) === String(later?.item_id)
      )
    })
    if (!isLastForActivity) {
      continue
    }
    const gifts = Array.isArray(act.gifts) ? act.gifts : []
    for (const gift of gifts) {
      if (!gift) continue
      // 后端 check_gift_store 下调后 gift_num<=0 会剔除；此处兜底不展示
      const giftNum = Number(gift.gift_num)
      if (Number.isFinite(giftNum) && giftNum <= 0) continue
      const key = `${aid}_${gift.item_id || gift.itemId || ''}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ ...gift, activity_id: activityId })
    }
  }
  return out
}

function normalizeIdList(raw) {
  if (raw == null) {
    return []
  }
  if (Array.isArray(raw)) {
    return raw.filter((id) => id != null && String(id) !== '')
  }
  return [raw]
}
