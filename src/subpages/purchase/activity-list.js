/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import Taro, { useRouter } from '@tarojs/taro'
import React, { useRef, useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useImmer } from 'use-immer'
import { View, Text, ScrollView } from '@tarojs/components'
import dayjs from 'dayjs'
import api from '@/api'
import { classNames, pickBy, getDistributorId, VERSION_IN_PURCHASE, showToast } from '@/utils'
import { updateUserInfo } from '@/store/slices/user'
import { updateActivityInfo, updateCount, updateIsPasscodeLogin } from '@/store/slices/purchase'
import doc from '@/doc'
import S from '@/spx'
import { SpPage, SpNote, SpScrollView, SpImage, SpPurchaseEnterpriseBar } from '@/components'
import CompPurchaseNav from '@/pages/purchase/comps/comp-purchase-nav'
import './activity-list.scss'

const initialState = {
  activityList: [],
  loading: true
}

/** @returns {'upcoming' | 'ongoing' | 'ended'} */
function getActivityPhase(item) {
  let begin = Number(item.beginTs)
  let end = Number(item.endTs)
  const tsMissing =
    !begin ||
    !end ||
    Number.isNaN(begin) ||
    Number.isNaN(end)
  if (tsMissing && item.employeeBeginTime && item.employeeEndTime) {
    begin = dayjs(item.employeeBeginTime).valueOf()
    end = dayjs(item.employeeEndTime).valueOf()
  }
  const now = Date.now()
  if (!begin || !end || Number.isNaN(begin) || Number.isNaN(end)) {
    return 'ongoing'
  }
  if (now < begin) return 'upcoming'
  if (now > end) return 'ended'
  return 'ongoing'
}

function PurchaseActivityList() {
  const [state, setState] = useImmer(initialState)
  const { activityList, loading } = state
  const { curEnterpriseId, curEnterpriseName } = useSelector((_state) => _state.purchase)

  const scrollRef = useRef()
  const dispatch = useDispatch()

  const { params } = useRouter()
  let { activity_id, is_redirt } = params

  useEffect(() => {
    if (!S.getAuthToken()) {
      Taro.redirectTo({
        url: '/pages/purchase/auth'
      })
      return
    }
    scrollRef.current?.reset()
  }, [])

  const updataMemberInfo = async () => {
    const _userInfo = await api.member.memberInfo()
    dispatch(updateUserInfo(_userInfo))
  }

  const fetch = async ({ pageIndex, pageSize }) => {
    if (pageIndex === 1) {
      if (VERSION_IN_PURCHASE) {
        const data = await api.purchase.getUserEnterprises({
          disabled: 0,
          distributor_id: getDistributorId()
        })
        const validIdentityLen = data.filter((item) => item.disabled == 0).length
        if (!validIdentityLen) {
          Taro.redirectTo({
            url: '/pages/purchase/auth'
          })
          return { total: 0 }
        }
      }
    }
    const { list, total_count } = await api.purchase.getEmployeeActivityList({
      page: pageIndex,
      pageSize,
      enterprise_id: curEnterpriseId,
      activity_id,
      status: 'warm_up,ongoing'
    })
    const _list = pickBy(list, doc.purchase.ACTIVITY_ITEM)
    // 如果只有一条数据，直接进入活动首页
    if (total_count == 1 && is_redirt) {
      try {
        onClickChange(_list[0], 'redirectTo')
      } catch (e) { }
    }
    setState((draft) => {
      draft.activityList = [...draft.activityList, ..._list]
      if (pageIndex === 1) {
        draft.loading = false
        updataMemberInfo()
      }
    })

    return { total: total_count }
  }

  const onClickChange = async (item) => {
    const {
      id,
      enterpriseId,
      pages_template_id,
      priceDisplayConfig = {},
      isDiscountDescriptionEnabled,
      discountDescription,
      isPassphraseEnabled,
      passphraseUserVerified,
      authType
    } = item
    try {
      const eligibility = await api.purchase.getInternalSaleEligibility({
        activity_id: id,
        enterprise_id: enterpriseId
      })
      if (Number(eligibility?.internal_sale_eligible) !== 1) {
        showToast('无内购资格')
        return
      }
    } catch (e) {
      showToast(e?.message || '资格校验失败')
      return
    }
    const _priceDisplayConfig = handlePriceConfig(priceDisplayConfig)
    dispatch(
      updateActivityInfo({
        priceDisplayConfig: _priceDisplayConfig,
        isDiscountDescriptionEnabled,
        discountDescription
      })
    )
    await dispatch(
      updateCount({
        shop_type: 'distributor',
        enterprise_id: enterpriseId,
        activity_id: id
      })
    )
    if (isPassphraseEnabled) { //是否开启口令通道
      dispatch(updateIsPasscodeLogin(true))
      if (passphraseUserVerified == 1) {
        Taro.navigateTo({ url: `/subpages/purchase/index?activity_id=${id}&enterprise_id=${enterpriseId}&pages_template_id=${pages_template_id}` })
      } else {
        Taro.navigateTo({
          url: `/subpages/purchase/select-company-passcode?activity_id=${id}&enterprise_id=${enterpriseId}&pages_template_id=${pages_template_id}`
        })
      }
    } else {
      dispatch(updateIsPasscodeLogin(false))
      Taro.navigateTo({ url: `/subpages/purchase/index?activity_id=${id}&enterprise_id=${enterpriseId}&pages_template_id=${pages_template_id}` })
    }
  }

  const handlePriceConfig = (val) => {
    if (!val) return {}
    const priceConfig = JSON.parse(JSON.stringify(val))
    Object.keys(priceConfig).forEach((key) => {
      const c_config = priceConfig[key]
      if (c_config) {
        for (let ckey in c_config) {
          c_config[ckey] = c_config[ckey] == 'true'
        }
      }
    })
    return priceConfig
  }

  const handleCardAction = (item) => {
    const phase = getActivityPhase(item)
    if (phase === 'upcoming') {
      Taro.showToast({ title: '活动尚未开始', icon: 'none' })
      return
    }
    if (phase === 'ended') {
      Taro.showToast({ title: '活动已结束', icon: 'none' })
      return
    }
    onClickChange(item)
  }

  return (
    <SpPage
      className='page-purchase-index page-purchase-activitylist'
      title='企业购'
      pageConfig={{ navigateBackgroundColor: '#ffffff' }}
      renderNavigation={(navProps) => <CompPurchaseNav {...navProps} />}
    >
      <View className='page-purchase-activitylist__inner'>
        <SpPurchaseEnterpriseBar name={curEnterpriseName} showMore={false} showSearch={false} />

        <ScrollView className='purchase-activity-scroll' scrollY>
          <SpScrollView
            ref={scrollRef}
            className=''
            auto={false}
            fetch={fetch}
            renderEmpty={<SpNote img='empty_activity.png' title='没有查询到内购活动' />}
          >
            <View className='purchase-activity-list'>
              {activityList.map((item) => {
                const phase = getActivityPhase(item)
                const badgeText =
                  phase === 'upcoming' ? '即将开始' : phase === 'ended' ? '已结束' : '进行中'
                const btnText =
                  phase === 'upcoming'
                    ? '敬请期待'
                    : phase === 'ended'
                      ? '已结束'
                      : '立即参与'
                return (
                  <View key={item.id} className='activity-card'>
                    <View className='activity-card__cover'>
                      <SpImage className='activity-card__img' mode='aspectFill' src={item.pic} />
                      <View
                        className={classNames('activity-card__badge', `activity-card__badge--${phase}`)}
                      >
                        <Text>{badgeText}</Text>
                      </View>
                    </View>
                    <View className='activity-card__body'>
                      <Text className='activity-card__title'>{item.name}</Text>
                      <View className='activity-card__time-row'>
                        <Text className='iconfont icon-riqi activity-card__time-icon' />
                        <Text className='activity-card__time-text'>开始时间：{item.employeeBeginTime}</Text>
                      </View>
                      <View className='activity-card__time-row'>
                        <Text className='iconfont icon-clock1 activity-card__time-icon' />
                        <Text className='activity-card__time-text'>结束时间：{item.employeeEndTime}</Text>
                      </View>
                      <View
                        className={classNames('activity-card__btn', {
                          'activity-card__btn--primary': phase === 'ongoing',
                          'activity-card__btn--muted': phase !== 'ongoing'
                        })}
                        onClick={() => handleCardAction(item)}
                      >
                        <Text>{btnText}</Text>
                      </View>
                    </View>
                  </View>
                )
              })}
            </View>
          </SpScrollView>
        </ScrollView>
      </View>
    </SpPage>
  )
}

PurchaseActivityList.options = {
  addGlobalClass: true
}

export default PurchaseActivityList
