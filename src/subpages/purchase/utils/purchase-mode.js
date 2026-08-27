/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */

export const PURCHASE_MODE_CASH = 'cash'
export const PURCHASE_MODE_PREPAID = 'prepaid_point'

export function isPrepaidPoint(mode) {
  return mode === PURCHASE_MODE_PREPAID
}

export function getPurchaseModeFromActivity(data) {
  if (!data) return PURCHASE_MODE_CASH
  const mode = data.purchase_mode ?? data.purchaseMode
  return mode || PURCHASE_MODE_CASH
}

export function isPurchasePrepaidPoint(data) {
  return isPrepaidPoint(getPurchaseModeFromActivity(data))
}

/** 订单是否为企业购预充点数单（orderClass + purchaseMode） */
export function isEmployeePurchasePrepaidOrder(order) {
  if (!order) return false
  const orderClass = order.orderClass ?? order.order_class
  const mode = order.purchaseMode ?? order.purchase_mode
  return orderClass === 'employee_purchase' && isPrepaidPoint(mode)
}

/**
 * @param {number|string} fen - 金额，单位分
 * @param {string} mode - purchase_mode
 * @param {{ showUnit?: boolean, decimals?: number }} [options]
 */
export function formatPurchaseAmount(fen, mode, options = {}) {
  const { showUnit = true, decimals = 2 } = options
  const prepaid = isPrepaidPoint(mode)

  if (fen == null || fen === '') {
    if (prepaid) {
      return showUnit ? '0点' : '0'
    }
    return '¥0.00'
  }

  const n = Number(fen) / 100
  if (Number.isNaN(n)) {
    if (prepaid) {
      return showUnit ? '0点' : '0'
    }
    return '¥0.00'
  }

  if (prepaid) {
    const formatted = Number.isInteger(n) ? String(n) : n.toFixed(decimals)
    return showUnit ? `${formatted}点` : formatted
  }

  return `¥${n.toFixed(decimals)}`
}

/** 预充点数支付方式展示文案 */
export function getPrepaidPaymentLabel(data) {
  return data?.purchase_mode_desc ?? data?.purchaseModeDesc ?? '预充点数'
}
