/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import { useCallback, useRef, useState } from 'react'
import api from '@/api'
import { getDistributorId, VERSION_PLATFORM } from '@/utils'

/**
 * 规范化推荐商品：无图过滤；pics 转数组以兼容 SpRecommend / ITEM_LIST_GOODS
 */
export function normalizeRecommendItems(items = []) {
  return (items || [])
    .filter((item) => !!item?.pics)
    .map((item) => ({
      ...item,
      pics: Array.isArray(item.pics) ? item.pics : [item.pics]
    }))
}

export function resolveRecommendDistributorId(explicitId) {
  if (VERSION_PLATFORM) {
    if (explicitId === undefined || explicitId === null || explicitId === '') return 0
    const n = Number(explicitId)
    // platform 传 >0 会返回空列表
    return n > 0 ? null : 0
  }
  const id = explicitId ?? getDistributorId()
  const n = Number(id)
  return n > 0 ? n : null
}

export function collectMainItemIds(sources = []) {
  return [...new Set((sources || []).map(Number).filter((id) => id > 0))]
}

/**
 * @param {object} options
 * @param {'detail'|'cart'|'checkout'|'order_detail'} options.scene
 */
export default function useProductRecommend({ scene } = {}) {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const fetchingRef = useRef(false)

  const fetchRecommend = useCallback(
    async ({ mainItemIds = [], excludeItemIds, distributorId } = {}) => {
      const main_item_ids = collectMainItemIds(mainItemIds)
      if (!scene || main_item_ids.length === 0) {
        setList([])
        setError(null)
        return []
      }

      const distributor_id = resolveRecommendDistributorId(distributorId)
      if (distributor_id === null) {
        setList([])
        return []
      }

      if (fetchingRef.current) return []
      fetchingRef.current = true
      setLoading(true)
      setError(null)
      try {
        const exclude_item_ids = collectMainItemIds(
          excludeItemIds !== undefined ? excludeItemIds : main_item_ids
        )
        const body = {
          scene,
          main_item_ids,
          exclude_item_ids,
          showError: false
        }
        if (distributor_id !== undefined) {
          body.distributor_id = distributor_id
        }
        const { items } = await api.goodsRecommend.match(body)
        const normalized = normalizeRecommendItems(items)
        setList(normalized)
        return normalized
      } catch (e) {
        setError(e)
        setList([])
        return []
      } finally {
        setLoading(false)
        fetchingRef.current = false
      }
    },
    [scene]
  )

  return {
    list,
    loading,
    error,
    fetchRecommend,
    setList
  }
}
