/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 *
 * 内购 SKU 弹窗：仅 Figma 稿一种形态（顶弧、把手+关闭、头图+价+已选+步进器、规格、限购双列、购物车+主按钮）
 */
import React, { useEffect, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import Taro, { useRouter } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { SpFloatLayout, SpImage, SpInputNumber, SpGoodsPrice } from '@/components'
import { addCart, updateCount } from '@/store/slices/purchase'
import { BUY_TOOL_BTNS } from '@/consts'
import api from '@/api'
import { useAsyncCallback } from '@/hooks'
import { classNames, showToast, navigateTo } from '@/utils'
import './comp-skuselect.scss'

function resolvePurchaseLimitQty(info, curItem) {
  if (!info) return null
  const {
    activityType,
    activityInfo,
    purlimitByCart,
    purlimitByFastbuy,
    limitNum,
    nospec,
    purchaseLimitNum
  } = info
  if (activityType === 'limited_buy' && activityInfo?.rule?.limit != null) {
    return activityInfo.rule.limit
  }
  if (activityType === 'seckill' || activityType === 'limited_time_sale') {
    if (nospec) return limitNum
    return curItem?.limitNum ?? limitNum
  }
  if (activityType === 'group') return 1
  const v = purchaseLimitNum ?? purlimitByCart ?? purlimitByFastbuy ?? limitNum
  return v != null && v !== '' ? v : null
}

function resolvePurchaseLimitAmountLine(info) {
  if (!info) return null
  const limitFee =
    info.activityInfo?.fee?.limit_fee ??
    info.fee?.limit_fee ??
    info.activityInfo?.limit_fee ??
    info.purchaseAmountLimitFee
  if (limitFee == null || limitFee === '') return null
  const n = Number(limitFee) / 100
  if (Number.isNaN(n)) return null
  return `限购金额：商品总额不超过 ¥${n.toFixed(2)}`
}

const initialState = {
  selection: [],
  disabledSet: new Set(),
  curItem: null,
  skuText: '',
  num: 1
}

function PurchaseSkuSelect(props) {
  const {
    info,
    open = false,
    onClose = () => {},
    onChange = () => {},
    type,
    hideInputNumber = false
  } = props
  const [state, setState] = useAsyncCallback(initialState)
  const { purchase_share_info = {}, cartCount = 0 } = useSelector((state) => state.purchase)
  const { selection, disabledSet, curItem, skuText, num } = state
  const dispatch = useDispatch()
  const skuDictRef = useRef({})
  const router = useRouter()

  useEffect(() => {
    if (info && !info.nospec) {
      init()
    }
  }, [info])

  const init = () => {
    const { skuList, specItems } = info
    specItems.forEach((item) => {
      const key = item.specItem.map((spec) => spec.specId).join('_')
      skuDictRef.current[key] = item
    })
    const defaultSpecItem = specItems.find(
      (item) => item.store > 0 && ['onsale', 'offline_sale'].includes(item.approveStatus)
    )
    let selection = Array(specItems.length).fill(null)
    if (defaultSpecItem) {
      selection = defaultSpecItem.specItem.map((item) => item.specId)
    }

    calcDisabled(selection)
  }

  const calcDisabled = (selection) => {
    const { skuList } = info
    const disabledSet = new Set()
    const makeReg = (sel, row, val) => {
      const tSel = sel.slice()
      const regStr = tSel.map((s, idx) => (row === idx ? val : !s ? '(\\d+)' : s)).join('_')
      return new RegExp(regStr)
    }

    const isNotDisabled = (sel, row, val) => {
      const reg = makeReg(sel, row, val)

      return Object.keys(skuDictRef.current).some((key) => {
        return (
          key.match(reg) &&
          skuDictRef.current[key].store > 0 &&
          ['onsale', 'offline_sale'].includes(skuDictRef.current[key].approveStatus)
        )
      })
    }

    for (let i = 0, l = skuList.length; i < l; i++) {
      const { skuValue } = skuList[i]
      for (let j = 0, k = skuValue.length; j < k; j++) {
        const id = skuValue[j].specId
        if (!disabledSet.has(id) && !isNotDisabled(selection, i, id)) {
          disabledSet.add(id)
        }
      }
    }

    const curItem = skuDictRef.current[selection.join('_')]
    const skuText = curItem
      ? `已选：${curItem.specItem.map((item) => `${item.skuName}:${item.specName}`).join(',')}`
      : '请选择规格'

    setState((draft) => {
      draft.selection = selection
      draft.disabledSet = disabledSet
      draft.curItem = curItem
      draft.skuText = skuText
    })

    onChange(skuText, curItem)
  }

  const handleSelectSku = ({ specId }, idx) => {
    if (disabledSet.has(specId)) return
    setState(
      (draft) => {
        draft.selection[idx] = selection[idx] == specId ? null : specId
      },
      ({ selection }) => {
        calcDisabled(selection)
      }
    )
  }

  const getImgs = () => {
    let img = info.imgs[0]
    if (curItem) {
      const { specImgs } = curItem.specItem[curItem.specItem.length - 1]
      if (specImgs.length > 0) {
        img = specImgs[0]
      }
    }
    return img
  }

  const handlePreviewImage = () => {
    let imgUrls = info.imgs
    if (curItem) {
      const { specImgs } = curItem.specItem[curItem.specItem.length - 1]
      if (specImgs.length > 0) {
        imgUrls = specImgs
      }
    }
    Taro.previewImage({
      urls: imgUrls
    })
  }

  if (!info) {
    return null
  }

  const { skuList } = info

  const addToCart = async () => {
    const { activity_id, enterprise_id } = purchase_share_info
    let _activity_id = activity_id
    let _enterprise_id = enterprise_id
    if (router?.params.activity_id && router?.params.enterprise_id) {
      _activity_id = router?.params.activity_id
      _enterprise_id = router?.params.enterprise_id
    }

    const { nospec } = info
    if (!nospec && !curItem) {
      showToast('请选择规格')
      return
    }
    Taro.showLoading({ title: '' })
    await dispatch(
      addCart({
        item_id: curItem ? curItem.itemId : info.itemId,
        num,
        distributor_id: info.distributorId,
        shop_type: 'distributor',
        activity_id: _activity_id,
        enterprise_id: _enterprise_id
      })
    )
    onClose()
    dispatch(
      updateCount({
        shop_type: 'distributor',
        activity_id: _activity_id,
        enterprise_id: _enterprise_id
      })
    )

    Taro.hideLoading()
  }

  const fastBuy = async () => {
    const { nospec } = info
    if (!nospec && !curItem) {
      showToast('请选择规格')
      return
    }
    Taro.showLoading({ title: '' })
    onClose()
    const { activity_id, enterprise_id } = purchase_share_info
    const { distributorId, activityType, activityInfo } = info
    let _activity_id = activity_id
    let _enterprise_id = enterprise_id
    if (router?.params.activity_id && router?.params.enterprise_id) {
      _activity_id = router?.params.activity_id
      _enterprise_id = router?.params.enterprise_id
    }

    const itemId = curItem ? curItem.itemId : info.itemId
    await api.purchase.addPurchaseCart(
      {
        item_id: curItem ? curItem.itemId : info.itemId,
        num,
        distributor_id: distributorId,
        activity_id: _activity_id,
        enterprise_id: _enterprise_id,
        cart_type: 'fastbuy'
      },
      !!info.point
    )
    let url = !!info.point
      ? '/subpages/pointshop/espier-checkout?cart_type=fastbuy&shop_id=0'
      : `/subpages/purchase/espier-checkout?cart_type=fastbuy&shop_id=${distributorId}`
    if (activityType == 'seckill' || activityType === 'limited_time_sale') {
      const { seckill_id } = activityInfo
      const { ticket } = await api.item.seckillCheck({
        item_id: itemId,
        seckill_id: seckill_id,
        num
      })
      url += `&type=${activityType}&seckill_id=${seckill_id}&ticket=${ticket}`
    } else if (activityType == 'group') {
      const { groups_activity_id } = activityInfo
      url += `&type=${activityType}&group_id=${groups_activity_id}`
    }

    if (router?.params.activity_id && router?.params.enterprise_id) {
      url += `&activity_id=${_activity_id}&enterprise_id=${_enterprise_id}`
    }

    Taro.hideLoading()
    Taro.navigateTo({
      url
    })
  }

  const computePurchaseQtyLimits = () => {
    const { nospec, activityType, activityInfo, purlimitByCart, purlimitByFastbuy } = info
    let limitNum = null
    let limitTxt = ''
    let max = 1
    if (activityType) {
      if (activityType == 'limited_buy') {
        limitNum = activityInfo.rule.limit
        if (activityInfo.rule.day == 0) {
          limitTxt = `（限购${limitNum}件）`
        } else {
          limitTxt = `（每${activityInfo.rule.day}天，限购${limitNum}件）`
        }
      } else if (activityType == 'seckill' || activityType == 'limited_time_sale') {
        if (nospec) {
          limitNum = info.limitNum
        } else if (curItem) {
          limitNum = curItem.limitNum
        }
        limitTxt = `（限购${limitNum}件）`
      } else if (activityType == 'group') {
        limitNum = 1
      }
    }
    if (type == 'addcart' && purlimitByCart) {
      limitNum = purlimitByCart
      limitTxt = `（限购${purlimitByCart}件）`
    }
    if (type == 'fastbuy' && purlimitByFastbuy) {
      limitNum = purlimitByFastbuy
      limitTxt = `（限购${purlimitByFastbuy}件）`
    }
    if (limitNum) {
      max = parseInt(limitNum, 10)
    } else {
      max = parseInt(curItem ? curItem.store : info.store, 10)
    }
    return { limitNum, limitTxt, max }
  }

  const renderQtyStepper = () => {
    const { max } = computePurchaseQtyLimits()
    return (
      <View className='sp-sku-select-espier__stepper-wrap'>
        <SpInputNumber
          value={num}
          min={1}
          max={max}
          onChange={(n) => {
            setState((draft) => {
              draft.num = n
            })
          }}
        />
      </View>
    )
  }

  const renderFooter = () => {
    const limitQty = resolvePurchaseLimitQty(info, curItem)
    const amountLine = resolvePurchaseLimitAmountLine(info)
    const showLimits = limitQty != null || !!amountLine
    let btnTxt = '确定'
    Object.keys(BUY_TOOL_BTNS()).forEach((key) => {
      if (BUY_TOOL_BTNS()[key].key == type) {
        btnTxt = BUY_TOOL_BTNS()[key].title
      }
    })
    const onMain = () => {
      if (type == 'picker') {
        onClose()
      } else if (type == 'addcart') {
        addToCart()
      } else {
        fastBuy()
      }
    }
    return (
      <View className='sp-sku-select-espier__footer-inner'>
        {showLimits && (
          <View className='sp-sku-select-espier__limits'>
            <Text className='sp-sku-select-espier__limit-left'>
              {limitQty != null ? `限购数量：限购 ${limitQty} 件` : ''}
            </Text>
            <Text className='sp-sku-select-espier__limit-right'>
              {amountLine || ''}
            </Text>
          </View>
        )}
        <View className='sp-sku-select-espier__bar'>
          <View
            className='sp-sku-select-espier__cart'
            onClick={navigateTo.bind(null, '/subpages/purchase/espier-index?tabbar=0')}
          >
            <View className='sp-sku-select-espier__cart-icon-wrap'>
              <Text className='iconfont icon-gouwuche sp-sku-select-espier__cart-icon' />
              {cartCount > 0 && (
                <Text className='sp-sku-select-espier__cart-badge'>
                  {cartCount > 99 ? '99+' : cartCount}
                </Text>
              )}
            </View>
            <Text className='sp-sku-select-espier__cart-label'>购物车</Text>
          </View>
          <View className='sp-sku-select-espier__btn-solid' onClick={onMain}>
            <Text className='sp-sku-select-espier__btn-text'>
              {type == 'picker' ? '确定' : btnTxt}
            </Text>
          </View>
        </View>
      </View>
    )
  }

  const selectedSpecLine =
    curItem && curItem.specItem
      ? curItem.specItem.map((s) => s.specName).join(' ')
      : '请选择'

  return (
    <SpFloatLayout
      className='sp-sku-select'
      hideClose
      beforeScroll={
        <View className='sp-sku-select-espier__sheet-head'>
          <View className='sp-sku-select-espier__handle' />
        </View>
      }
      open={open}
      onClose={onClose}
      renderFooter={renderFooter()}
    >
      <View className='sp-sku-select-espier__header'>
        <SpImage
          className='sp-sku-select-espier__thumb'
          src={getImgs()}
          width={188}
          height={186}
          radius={16}
          mode='aspectFit'
          onClick={handlePreviewImage}
        />
        <View className='sp-sku-select-espier__header-main'>
          <View className='sp-sku-select-espier__price-row'>
            <SpGoodsPrice isPurchase info={curItem || info} />
          </View>
          <View
            className={classNames('sp-sku-select-espier__selected-wrap', {
              'sp-sku-select-espier__selected-wrap--placeholder': !curItem
            })}
          >
            <Text className='sp-sku-select-espier__selected-label'>已选：</Text>
            <Text className='sp-sku-select-espier__selected'>{selectedSpecLine}</Text>
          </View>
          {!hideInputNumber && renderQtyStepper()}
          {/* {info.store_setting && (
            <Text className='sp-sku-select-espier__store'>
              库存：{curItem ? curItem.store : info.store}
            </Text>
          )} */}
        </View>
      </View>

      <View className='sku-list'>
        {skuList.map((item, index) => (
          <View className='sku-group' key={`sku-group__${index}`}>
            <View className='sku-name'>{item.skuName}</View>
            <View className='sku-values'>
              {item.skuValue.map((spec, idx) => (
                <View
                  className={classNames('sku-btn', {
                    'active': spec.specId == selection[index],
                    'disabled': disabledSet.has(spec.specId),
                    'sku-img': spec.specImgs.length > 0
                  })}
                  onClick={handleSelectSku.bind(this, spec, index)}
                  key={`sku-values-item__${idx}`}
                >
                  {spec.specImgs.length > 0 && (
                    <SpImage src={spec.specImgs[0]} width={214} height={214} />
                  )}
                  <Text className='spec-name'>{spec.specName}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </SpFloatLayout>
  )
}

PurchaseSkuSelect.options = {
  addGlobalClass: true
}

export default PurchaseSkuSelect
