/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import React, { useEffect, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useImmer } from 'use-immer'
import Taro, { getCurrentInstance } from '@tarojs/taro'
import api from '@/api'
import * as dianwuApi from '@/api/dianwu'
import doc from '@/subpages/doc'
import { View, Text } from '@tarojs/components'
import { AtTextarea, AtModal, AtModalHeader, AtModalContent } from 'taro-ui'
import {
  SpPage,
  SpImage,
  SpPrice,
  SpVipLabel,
  SpCell,
  SpButton,
  SpFloatLayout,
  SpCheckbox,
  SpPoster
} from '@/components'
import qs from 'qs'
import { PROMOTION_TAG } from '@/consts'
import { selectMember } from '@/store/slices/dianwu'
import { pickBy, showToast } from '@/utils'
import { useTranslation, $t, ti, i18n } from '@/i18n'
import CompGoodsPrice from './comps/comp-goods-price'
import CompGift from './comps/comp-gift'
import CompCoupon from './comps/comp-coupon'
import './checkout.scss'

const initialState = {
  itemList: [],
  itemsPromotion: [],
  totalItemNum: 0,
  itemFee: 0,
  discountFee: 0,
  totalFee: 0,
  memberDiscount: 0,
  couponDiscount: 0,
  promotionDiscount: 0,
  couponInfo: null,
  selectCoupon: null,
  couponList: [],
  remark: '',
  isOpened: false,
  couponLayout: false,
  markdown: null,
  distributor_id: null,
  prescriptionStatus: 0,
  codeStatus: false,
  checkout_order_id: null
}
function DianwuCheckout(props) {
  useTranslation()

  useEffect(() => {
    const syncNavTitle = () => {
      Taro.setNavigationBarTitle({ title: $t('2b4b2b4f.89159f') })
    }
    syncNavTitle()
    i18n.on('languageChanged', syncNavTitle)
    return () => i18n.off('languageChanged', syncNavTitle)
  }, [])

  const [state, setState] = useImmer(initialState)
  const {
    itemList,
    itemsPromotion,
    totalItemNum,
    itemFee,
    discountFee,
    totalFee,
    memberDiscount,
    couponDiscount,
    promotionDiscount,
    remark,
    isOpened,
    couponLayout,
    couponList,
    couponInfo,
    selectCoupon,
    markdown,
    distributor_id,
    prescriptionStatus,
    codeStatus,
    checkout_order_id
  } = state
  const pageRef = useRef()
  const $instance = getCurrentInstance() || {}

  const { member } = useSelector((state) => state.dianwu)
  const dispatch = useDispatch()

  // 挂单
  const onPendingOrder = async () => {
    const { confirm } = await Taro.showModal({
      title: $t('2b4b2b4f.d36db0'),
      content: $t('2b4b2b4f.a13882')
    })
    if (confirm) {
      try {
        await dianwuApi.orderPendding({
          user_id: member?.userId,
          distributor_id,
          showError: false
        })
        dispatch(selectMember(null))
        onEventCreateOrder()
        setTimeout(() => {
          Taro.navigateBack()
        }, 200)
      } catch (e) {
        if (e.res.data.data?.code == '42201') {
          const pendingModal = await Taro.showModal({
            title: $t('2b4b2b4f.6edb46'),
            content: e.res.data.data.message,
            confirmText: $t('2b4b2b4f.6dcf61')
          })
          if (pendingModal.confirm) {
            Taro.redirectTo({
              url: `/subpages/dianwu/pending-checkout?distributor_id=${distributor_id}&from=checkout`
            })
          }
        } else {
          showToast(e.res.data.data.message)
        }
      }
    }
  }

  // 收款
  const onCollection = async () => {
    if (!prescriptionStatus == 0) {
      console.log('我要跳转到新的页面啦dianwu:')
      if (!checkout_order_id) {
        await createOrder()
        dispatch(selectMember(null))
      }
      setState((draft) => {
        draft.codeStatus = true
      })
      return
    }
    setState((draft) => {
      draft.isOpened = true
      // draft.orderId = order_id
    })
  }

  useEffect(() => {
    const { distributor_id } = $instance?.router?.params
    setState((draft) => {
      draft.distributor_id = distributor_id
    })
  }, [])

  useEffect(() => {
    if (distributor_id) {
      getCheckout()
      getUserCardList()
    }
  }, [distributor_id])

  useEffect(() => {
    if (isOpened || couponLayout) {
      pageRef.current.pageLock()
    } else {
      pageRef.current.pageUnLock()
    }
  }, [isOpened, couponLayout])

  const getUserCardList = async () => {
    const { list } = await dianwuApi.getUserCardList({
      user_id: member?.userId,
      distributor_id
    })
    setState((draft) => {
      draft.couponList = pickBy(list, doc.dianwu.COUPON_ITEM)
    })
  }

  const getCheckout = async () => {
    let params = {
      user_id: member?.userId,
      not_use_coupon: 1,
      distributor_id
    }
    if (selectCoupon) {
      params = {
        ...params,
        not_use_coupon: 0,
        coupon_discount: selectCoupon
      }
    }
    Taro.showLoading({ title: '' })
    const res = await dianwuApi.checkout(params)
    if (res.extraTips) {
      Taro.hideLoading()
      await Taro.showModal({
        content: res.extraTips,
        confirmText: $t('edc703ce.ce2695')
      })
      Taro.navigateBack()
      return
    }
    resloveResWrap(res)
    // const {
    //   items,
    //   itemsPromotion: _itemsPromotion,
    //   totalItemNum: _totalItemNum,
    //   itemFee: _itemFee,
    //   discountFee: _discountFee,
    //   totalFee: _totalFee,
    //   memberDiscount: _memberDiscount,
    //   couponDiscount: _couponDiscount,
    //   promotionDiscount: _promotionDiscount,
    //   couponInfo: _couponInfo
    // } = pickBy(res, doc.dianwu.CHECKOUT_GOODS_ITEM)
    // setState((draft) => {
    //   draft.itemList = items.filter((item) => item.orderItemType != 'gift')
    //   draft.itemsPromotion = _itemsPromotion
    //   draft.totalItemNum = _totalItemNum
    //   draft.itemFee = _itemFee
    //   draft.discountFee = _discountFee
    //   draft.totalFee = _totalFee
    //   draft.memberDiscount = _memberDiscount
    //   draft.couponDiscount = _couponDiscount
    //   draft.promotionDiscount = _promotionDiscount
    //   draft.couponInfo = _couponInfo
    //   draft.selectCoupon = _couponInfo ? _couponInfo.coupon_code : null
    // })
    Taro.hideLoading()
  }

  const resloveResWrap = (res, markdown) => {
    const {
      items,
      itemsPromotion: _itemsPromotion,
      totalItemNum: _totalItemNum,
      itemFee: _itemFee,
      discountFee: _discountFee,
      totalFee: _totalFee,
      memberDiscount: _memberDiscount,
      couponDiscount: _couponDiscount,
      promotionDiscount: _promotionDiscount,
      couponInfo: _couponInfo,
      prescriptionStatus: _prescriptionStatus
    } = pickBy(res, doc.dianwu.CHECKOUT_GOODS_ITEM)
    setState((draft) => {
      draft.itemList = items.filter((item) => item.orderItemType != 'gift')
      draft.itemsPromotion = _itemsPromotion
      draft.totalItemNum = _totalItemNum
      draft.itemFee = _itemFee
      draft.discountFee = _discountFee
      draft.totalFee = _totalFee
      draft.memberDiscount = _memberDiscount
      draft.couponDiscount = _couponDiscount
      draft.promotionDiscount = _promotionDiscount
      draft.couponInfo = _couponInfo
      draft.selectCoupon = _couponInfo ? _couponInfo.coupon_code : null
      ;(draft.markdown = markdown), (draft.prescriptionStatus = _prescriptionStatus)
    })
  }

  const handleChangePrice = () => {
    let params = {
      user_id: member?.userId,
      not_use_coupon: 1,
      distributor_id
    }
    if (selectCoupon) {
      params = {
        ...params,
        not_use_coupon: 0,
        coupon_discount: selectCoupon
      }
    }
    if (markdown) {
      params = {
        ...params,
        markdown
      }
    }
    console.log('handleChangePrice:', params)
    Taro.navigateTo({
      url: `/subpages/dianwu/change-price?checkout=${encodeURIComponent(qs.stringify(params))}`,
      events: {
        onEventChangePrice: ({ res, markdown }) => {
          console.log('onEventChangePrice:', markdown)
          resloveResWrap(res, markdown)
        }
      }
    })
  }

  const onChangeRemark = (e) => {
    setState((draft) => {
      draft.remark = e
    })
  }

  const createOrder = async () => {
    let params = {
      user_id: member?.userId,
      remark,
      not_use_coupon: 1,
      distributor_id
    }
    if (couponInfo) {
      params = {
        ...params,
        not_use_coupon: 0,
        coupon_discount: couponInfo.coupon_code
      }
    }
    if (markdown) {
      params = {
        ...params,
        markdown
      }
    }
    const { order_id } = await dianwuApi.createOrder(params)

    //存在处方药要把order_id存起来
    if (!prescriptionStatus == 0) {
      setState((draft) => {
        draft.checkout_order_id = order_id
      })
    }
    return order_id
  }

  // 扫码收款
  const handleClickScanCode = async () => {
    const { errMsg, result } = await Taro.scanCode()
    if (errMsg == 'scanCode:ok') {
      console.log(`handleClickScanCode:`, result)
      const order_id = await createOrder()
      const { trade_info } = await dianwuApi.orderPayment({
        order_id,
        auth_code: result
      })
      dispatch(selectMember(null))
      onEventCreateOrder()
      Taro.redirectTo({
        url: `/subpages/dianwu/collection-result?order_id=${order_id}&trade_id=${trade_info.trade_id}`
      })
    } else {
      showToast(errMsg)
    }
  }

  // 现金收款
  const handleClickCash = async () => {
    const res = await Taro.showModal({
      title: $t('2b4b2b4f.90f054'),
      content: $t('2b4b2b4f.90741c'),
      showCancel: true,
      cancelText: $t('2b4b2b4f.64d5f3'),
      confirmText: $t('2b4b2b4f.755c7e')
    })
    if (!res.confirm) return
    const order_id = await createOrder()
    await dianwuApi.orderPayment({
      order_id,
      pay_type: 'pos'
    })
    dispatch(selectMember(null))
    onEventCreateOrder()
    Taro.redirectTo({ url: `/subpages/dianwu/collection-result?order_id=${order_id}&pay_type=pos` })
  }

  //线下转账
  const handleClickOfflinePay = async () => {
    Taro.showLoading({ title: $t('2b4b2b4f.30ade0'), mask: true })
    const order_id = await createOrder()
    await dianwuApi.orderPayment({
      order_id,
      pay_type: 'offline_pay',
      pay_channel: 'offline_pay'
    })
    Taro.hideLoading()
    Taro.showToast({
      icon: 'none',
      title: $t('2b4b2b4f.f4cb7f')
    })

    setTimeout(() => {
      Taro.redirectTo({
        url: `/pages/cart/offline-transfer?has_check=false&isDianwu=true&order_id=${order_id}`
      })
      dispatch(selectMember(null))
      onEventCreateOrder()
    }, 400)
  }

  const onEventCreateOrder = () => {
    const pages = Taro.getCurrentPages()
    const current = pages[pages.length - 1]
    const eventChannel = current.getOpenerEventChannel()
    eventChannel.emit('onEventFetchOrder')
  }

  // 使用优惠券
  const handleUseCoupon = async () => {
    getCheckout()
    setState((draft) => {
      draft.couponLayout = false
    })
  }

  const couponIsChecked = ({ couponCode }) => {
    if (selectCoupon == couponCode) {
      return true
    } else {
      return false
    }
  }

  const onChangeCoupon = ({ couponCode }, e) => {
    setState((draft) => {
      draft.selectCoupon = e ? couponCode : null
    })
  }

  return (
    <SpPage
      className='page-dianwu-checkout'
      ref={pageRef}
      renderFooter={
        <View className='btn-wrap'>
          <SpButton
            resetText={$t('2b4b2b4f.ee5b0a')}
            confirmText={$t('2b4b2b4f.2eee29')}
            onConfirm={onCollection}
            onReset={onPendingOrder}
          ></SpButton>
        </View>
      }
    >
      <View className='block-user'>
        <SpImage src={member?.avatar || 'user_icon.png'} width={80} height={80} />
        <View className='user-info'>
          <View className='info-hd'>
            <Text className='name'>{member?.username || $t('2b4b2b4f.1a75c1')}</Text>
            <Text className='mobile'>{member?.mobile}</Text>
          </View>
          <View className='info-bd'>
            <View className='filed-item'>
              <Text className='label'>{$t('2b4b2b4f.5498d6')}</Text>
              <Text className='value'>{member?.point || 0}</Text>
            </View>
            <View className='filed-item'>
              <Text className='label'>{$t('2b4b2b4f.0c9cbf')}</Text>
              <Text className='value'>{member?.couponNum || 0}</Text>
            </View>
            {member?.vipDiscount < 10 && (
              <View className='filed-item'>
                <Text className='label'>{$t('2b4b2b4f.287fa3')}</Text>
                <Text className='value'>{member?.vipDiscount || 0}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
      <View className='block-goods'>
        {itemList.map((item, index) => (
          <View className='item-wrap' key={`item-wrap__${index}`}>
            <View className='item-hd'>
              <SpImage src={item.pic} width={110} height={110} />
            </View>
            <View className='item-bd'>
              <View className='title'>
                {item?.isMedicine == 1 && item?.isPrescription == 1 && (
                  <Text className='prescription-drug'>{$t('7d82f6d2.e8b7e1')}</Text>
                )}
                {item.name}
              </View>
              {item.itemSpecDesc && <View className='sku'>{item.itemSpecDesc}</View>}
              <View className='ft-info'>
                <CompGoodsPrice info={item} />
                <View className='num'>{ti('2b4b2b4f.43ebc8', [item.num])}</View>
              </View>
            </View>
          </View>
        ))}
      </View>
      {itemsPromotion.map((item, idx) => (
        <View className='promotion-item' key={`promotion-item__${idx}`}>
          {/* {item.activity_type == 'full_gift' && (
            <View className='gift-item'>
              <View className='activity-tag'>{PROMOTION_TAG()[item.activity_type]}</View>
              <View className='activity-content'>
                {item.activity_desc?.gifts?.map((gift, index) => (
                  <View className='gift-item' key={`gift-item__${idx}__${index}`}>
                    <View className='gift-item__head'>
                      <View className='gift-name'>{gift.itemName}</View>
                      <View className='num'>x {gift.gift_num}</View>
                    </View>
                    <View className='gift-item__body'>
                      <Text className='sku'>{gift?.item_spec_desc}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )} */}

          {/* {item.activity_type != 'full_gift' && (
            <View className='activity-item'>
              <View className='activity-tag'>{PROMOTION_TAG()[item.activity_type]}</View>
              <View className='activity-content'>{item.activity_name}</View>
            </View>
          )} */}
          {item.activity_type == 'full_gift' && (
            <View className='activity-item'>
              <View className='activity-tag'>{PROMOTION_TAG()[item.activity_type]}</View>
              <View className='activity-content'>{item.item_name}</View>
            </View>
          )}
        </View>
      ))}
      {/* {itemsPromotion && (
        <View className='block-gift'>
          <View className='gift-tag'>赠品</View>
          {itemsPromotion.map((item, idx) => {
            return item.activity_desc?.gifts?.map((gift, index) => (
              <CompGift info={gift} key={`gift-item__${idx}_${index}`} />
            ))
          })}
        </View>
      )} */}

      <View className='block-coupon'>
        {couponList.length > 0 && (
          <SpCell
            title={$t('2b4b2b4f.dd244b')}
            border
            isLink
            onClick={() => {
              setState((draft) => {
                draft.couponLayout = true
              })
            }}
          >
            <Text>{couponInfo ? couponInfo.rule : $t('edc703ce.708c9d')}</Text>
          </SpCell>
        )}

        {/* <SpCell title='使用积分' isLink>
          暂无可用
        </SpCell> */}
      </View>

      <View className='block-checkout-info'>
        <SpCell title={ti('2b4b2b4f.631d07', [totalItemNum])} border>
          <SpPrice value={itemFee} />
        </SpCell>
        <SpCell title={$t('2b4b2b4f.7d9bcd')} border>
          <SpPrice value={`-${promotionDiscount}`} />
        </SpCell>
        <SpCell title={$t('2b4b2b4f.eababe')} border>
          <SpPrice value={`-${memberDiscount}`} />
        </SpCell>
        <SpCell title={$t('2b4b2b4f.ca66f9')} border>
          <SpPrice value={`-${couponDiscount}`} />
        </SpCell>
        {/* <SpCell title='积分抵扣' border>
          <SpPrice value={-50} />
        </SpCell> */}
        <SpCell title={$t('2b4b2b4f.ba5d3e')}>
          <SpPrice value={totalFee} />
        </SpCell>
      </View>

      <View className='block-remark'>
        <View className='title'>{$t('2b4b2b4f.bb84d6')}</View>
        <AtTextarea
          count
          value={remark}
          onChange={onChangeRemark}
          maxLength={150}
          placeholder={$t('2b4b2b4f.4f2387')}
        ></AtTextarea>
      </View>

      {!prescriptionStatus == 0 && (
        <View className='cart-checkout__title'>{$t('71426282.417975')}</View>
      )}

      <AtModal
        className='collection-modal'
        isOpened={isOpened}
        onClose={() => {
          setState((draft) => {
            draft.isOpened = false
          })
        }}
      >
        <AtModalHeader>{$t('2b4b2b4f.ba5d3e')}</AtModalHeader>
        <AtModalContent>
          <View className='total-mount'>
            <SpPrice size={48} value={totalFee} />
            <Text className='iconfont icon-edit' onClick={handleChangePrice}></Text>
          </View>
          {/* <SpCell isLink border>
            <Text className='iconfont icon-weixinzhifu'></Text>
            <Text>微信收款</Text>
          </SpCell> */}
          <SpCell isLink border onClick={handleClickScanCode}>
            <Text className='iconfont icon-saoma'></Text>
            <Text>{$t('2b4b2b4f.1bcb84')}</Text>
          </SpCell>
          <SpCell isLink onClick={handleClickCash}>
            <Text className='iconfont icon-money1'></Text>
            <Text>{$t('2b4b2b4f.6187a0')}</Text>
          </SpCell>
          {/* <SpCell isLink onClick={handleClickOfflinePay}>
            <Text className='iconfont icon-money1'></Text>
            <Text>线下银行转账</Text>
          </SpCell> */}
        </AtModalContent>
      </AtModal>

      <SpFloatLayout
        title={$t('2b4b2b4f.2f3635')}
        className='coupon-layout'
        open={couponLayout}
        onClose={() => {
          setState((draft) => {
            draft.couponLayout = false
          })
        }}
        renderFooter={
          <SpButton
            resetText={$t('61e2d21a.625fb2')}
            confirmText={$t('61e2d21a.e83a25')}
            onConfirm={handleUseCoupon}
            onReset={() => {
              setState((draft) => {
                draft.couponLayout = false
              })
            }}
          ></SpButton>
        }
      >
        <View className='coupon-list'>
          {couponList.map((item, index) => (
            <CompCoupon info={item} key={`coupon-item__${index}`}>
              <SpCheckbox
                checked={couponIsChecked(item)}
                onChange={onChangeCoupon.bind(this, item)}
              />
            </CompCoupon>
          ))}
        </View>
      </SpFloatLayout>

      {console.log(checkout_order_id, 'checkout_order_id0000')}

      {codeStatus && (
        <SpPoster
          info={checkout_order_id}
          type='prescriptionCode'
          onClose={() => {
            setState((draft) => {
              draft.codeStatus = false
            })
          }}
        />
      )}
    </SpPage>
  )
}

DianwuCheckout.options = {
  addGlobalClass: true
}

export default DianwuCheckout
