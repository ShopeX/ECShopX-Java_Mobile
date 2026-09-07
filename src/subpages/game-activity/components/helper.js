/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
/** 与弗洛伦萨 fv-ecshopx-vshop 大转盘外径一致 */
export const TURNTABLE_OUTER_SIZE = 335

const pickImgSrc = (imgs) => {
  if (!imgs) return ''
  if (typeof imgs === 'string') return imgs
  const first = Array.isArray(imgs) ? imgs[0] : imgs
  if (!first) return ''
  if (typeof first === 'string') return first
  return first.src || first.url || first.img || ''
}

/** LuckyCanvas / admin prizes → SpTurntable prizeData */
export const mapPrizesToPrizeData = (prizes = []) =>
  prizes.map((p) => ({
    text:
      p.fonts?.[0]?.text ||
      p.text ||
      p.name ||
      p.prize_title ||
      p.prizeTitle ||
      '',
    img:
      pickImgSrc(p.imgs) ||
      p.img ||
      p.image ||
      p.prize_image ||
      p.prizeImage ||
      '',
    background: p.background || p.backgroundColor || '#f9e3bb',
    prize_id: p.prize_id || p.prizeId,
    prize_type: p.prize_type || p.prizeType || p.type,
    prize_value: p.prize_value ?? p.prizeValue ?? p.value
  }))

/** LuckyCanvas buttons：优先 pointer+图，再图，再 pointer，最后取末项 */
const findPointerBtn = (buttons = []) => {
  if (!buttons.length) return {}
  const reversed = [...buttons].reverse()
  return (
    reversed.find((b) => b?.pointer && pickImgSrc(b.imgs)) ||
    reversed.find((b) => pickImgSrc(b.imgs)) ||
    reversed.find((b) => b?.pointer) ||
    buttons[buttons.length - 1] ||
    buttons[0] ||
    {}
  )
}

/**
 * 将页面 commonProps 转为 SpTurntable 入参
 * （命名对齐弗洛伦萨 resloveTurnTableProps）
 */
export const resolveTurnTableProps = (props = {}) => {
  const { config = {}, onDrawPrize, onGameEnd, onGameStart, canDraw, onBlocked } = props
  const buttons = config.buttons || []
  const pointerBtn = findPointerBtn(buttons)
  const pointerSrc = pickImgSrc(pointerBtn?.imgs) || pointerBtn?.img || ''
  const pointerLabel =
    pointerBtn?.fonts?.[0]?.text || pointerBtn?.fonts?.text || '开始\n抽奖'
  const padding = parseInt(config.blocks?.[0]?.padding || 0, 10) * 2
  const safePadding = Number.isFinite(padding) ? padding : 0
  const innerSize = Math.max(TURNTABLE_OUTER_SIZE - safePadding, 1)
  const prizeData =
    Array.isArray(config.prizeData) && config.prizeData.length
      ? mapPrizesToPrizeData(config.prizeData)
      : mapPrizesToPrizeData(config.prizes || [])

  // 外框图：优先 blocks[0].imgs，兼容字符串
  const blocks = (config.blocks || []).map((block, index) => {
    if (index !== 0) return block
    const src = pickImgSrc(block?.imgs)
    if (!src) return block
    return {
      ...block,
      imgs: [{ src }]
    }
  })

  return {
    prizeData,
    blocks,
    pointerBackgroundImage: pointerSrc,
    pointerLabel,
    onDrawPrize,
    onGameEnd,
    onGameStart,
    canDraw,
    onBlocked,
    width: `${innerSize}px`,
    height: `${innerSize}px`
  }
}

/** @deprecated 兼容弗洛伦萨拼写 */
export const resloveTurnTableProps = resolveTurnTableProps
