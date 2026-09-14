/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import req from './req'

const JSON_HEADER = { 'content-type': 'application/json' }

/** 按主商品匹配推荐列表（一次拉满场景 limit，无分页） */
export function match(params = {}) {
  const company_id = req.options?.company_id
  const url = company_id
    ? `/goods/recommendations/match?company_id=${company_id}`
    : '/goods/recommendations/match'
  return req.post(url, params, { header: JSON_HEADER })
}

/** 结算页推荐加购并重算（不写入长期购物车） */
export function checkoutAdd(params = {}) {
  return req.post('/goods/recommendations/checkout-add', params, { header: JSON_HEADER })
}
