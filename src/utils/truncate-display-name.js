/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 *
 * 顶栏店铺名截断：按「显示宽度」而非纯字符数。
 * 约定：1 个中文宽度 = 1，半角英文/数字/符号 ≈ 0.5（约等于 8 个英文字母 ≈ 4 个中文）。
 */

const CJK_RE = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/

function charDisplayWidth(ch) {
  if (!ch) return 0
  // 全角 / CJK 算 1，其余半角算 0.5
  if (CJK_RE.test(ch) || ch.charCodeAt(0) > 0xff) return 1
  return 0.5
}

/**
 * @param {string} name
 * @param {number} [maxWidth=4] 最大显示宽度（中文个数）
 * @returns {string}
 */
export function truncateDisplayName(name, maxWidth = 4) {
  if (!name) return name
  const chars = Array.from(String(name).trim())
  let width = 0
  const out = []
  for (let i = 0; i < chars.length; i++) {
    const w = charDisplayWidth(chars[i])
    if (width + w > maxWidth) {
      return `${out.join('')}...`
    }
    out.push(chars[i])
    width += w
  }
  return out.join('')
}
