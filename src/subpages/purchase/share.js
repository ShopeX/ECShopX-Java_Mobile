/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import React, { Component } from 'react'
import Taro, { getCurrentInstance } from '@tarojs/taro'
import { View, Text, ScrollView, Button } from '@tarojs/components'
import { SpPage, SpImage, SpPoster, SpPurchaseEnterpriseBar } from '@/components'
import CompPurchaseNav from '@/pages/purchase/comps/comp-purchase-nav'
import { SharePurchase } from '@/subpages/components'
import api from '@/api'
import { connect } from 'react-redux'
import { withPager } from '@/hocs'
import { formatDateTime, getDistributorId, log } from '@/utils'
import './share.scss'

@connect(({ purchase }) => ({
  purchase_share_info: purchase.persist_purchase_share_info,
  isPasscodeLogin: purchase.isPasscodeLogin
}))
@withPager
export default class PurchaseIndex extends Component {
  $instance = getCurrentInstance() || {}
  constructor(props) {
    super(props)

    this.state = {
      ...this.state,
      info: {
        invite_limit: 0,
        invited_num: 0
      },
      relative_list: [],
      isOpened: false,
      posterModalOpen: false,
      enterpriseName: ''
    }
  }

  componentDidMount() {
    Taro.hideShareMenu({
      menus: ['shareAppMessage', 'shareTimeline']
    })
    this.nextPage()
    this.getActivitydata()
    this.loadEnterpriseName()
  }

  loadEnterpriseName = async () => {
    const { purchase_share_info } = this.props
    const eid = purchase_share_info?.enterprise_id
    if (!eid) {
      this.setState({ enterpriseName: '' })
      return
    }
    try {
      const data = await api.purchase.getUserEnterprises({
        disabled: 0,
        distributor_id: getDistributorId()
      })
      const found = data?.find((x) => x.enterprise_id == eid)
      this.setState({
        enterpriseName: found?.name || found?.enterprise_name || ''
      })
    } catch (e) {
      this.setState({ enterpriseName: '' })
    }
  }

  onShareAppMessage() {
    const { info } = this.state
    const { enterprise_id, activity_id } = this.props.purchase_share_info || {}
    return new Promise(async function (resolve) {
      const data = await api.purchase.getEmployeeInviteCode({ enterprise_id, activity_id })
      resolve({
        title: info.name,
        imageUrl: info.share_pic,
        path: `/pages/purchase/auth?code=${data.invite_code}&enterprise_id=${enterprise_id}&activity_id=${activity_id}&ppe=${this.props.isPasscodeLogin ? 1 : 0}`
      })
    })
  }

  async getActivitydata() {
    const { activity_id, enterprise_id } = this.props.purchase_share_info || {}
    const data = await api.purchase.getEmployeeActivitydata({ activity_id, enterprise_id })
    this.setState({
      info: data
    })
  }

  async fetch({ pageIndex, pageSize }) {
    const { relative_list } = this.state
    const { activity_id, enterprise_id } = this.props.purchase_share_info || {}
    const { list, total_count } = await api.purchase.getEmployeeInvitelist({
      activity_id,
      enterprise_id,
      page: pageIndex,
      pageSize
    })
    this.setState({
      relative_list: [...relative_list, ...list]
    })
    return { total: total_count }
  }

  showInfo() {
    const { info } = this.state
    if (info.invite_limit == info.invited_num) {
      Taro.showToast({
        title: '分享次数为0',
        icon: 'none'
      })
      return
    }

    // this.setState({
    //   isOpened: true
    // })
  }

  onCreatePoster = () => {
    this.setState({
      isOpened: false,
      posterModalOpen: true
    })
  }

  formatUsedYuan(cents) {
    if (cents == null || cents === '') {
      return '¥0'
    }
    const y = Number(cents) / 100
    if (Number.isNaN(y)) {
      return '¥0'
    }
    return Number.isInteger(y) ? `¥${y}` : `¥${y.toFixed(2)}`
  }

  render() {
    const { info, relative_list, isOpened, posterModalOpen, enterpriseName } = this.state
    const { purchase_share_info } = this.props

    const canShareNum = Math.max(0, (info.invite_limit || 0) - (info.invited_num || 0))
    const activityStartTs = info?.relative_begin_time
      ? info.relative_begin_time * 1000
      : null

    return (
      <SpPage
        className='page-purchase-share'
        scrollToTopBtn
        title='分享亲友'
        pageConfig={{ navigateBackgroundColor: '#ffffff' }}
        renderNavigation={(navProps) => <CompPurchaseNav {...navProps} />}
      >
        <View className='share-page purchase-page'>
          <View className='purchase-page__head'>
            <SpPurchaseEnterpriseBar name={enterpriseName} showSearch={false} />
          </View>

          <View className='share-page__card share-page__summary'>
            <View className='share-page__activity-line'>
              <Text className='share-page__activity-line-text'>
                亲友购开始时间：
                {activityStartTs ? formatDateTime(activityStartTs) : '—'}
              </Text>
            </View>
            <View className='share-page__stats-row share-page__stats-row--four'>
              <View className='share-page__stat'>
                <Text className='share-page__stat-num'>{info.invite_limit ?? 0}</Text>
                <Text className='share-page__stat-label'>亲友名额</Text>
              </View>
              <View className='share-page__stat'>
                <Text className='share-page__stat-num'>{info.invited_num ?? 0}</Text>
                <Text className='share-page__stat-label'>已使用</Text>
              </View>
              <View className='share-page__stat'>
                <Text className='share-page__stat-num'>{canShareNum}</Text>
                <Text className='share-page__stat-label'>可分享</Text>
              </View>
              <View className='share-page__stat share-page__stat--share'>
                {info.is_employee == 1 ? (
                  <Button
                    open-type='share'
                    hoverClass='none'
                    className='share-page__stat-share-btn'
                    disabled={info.invite_limit == info.invited_num}
                    onClick={this.showInfo.bind(this)}
                  >
                    <View className='share-page__stat-share-inner'>
                      <Text className='iconfont icon-share share-page__stat-share-icon' />
                      <Text className='share-page__stat-label'>分享亲友</Text>
                    </View>
                  </Button>
                ) : (
                  <View className='share-page__stat-share-inner share-page__stat-share-inner--muted'>
                    <Text className='iconfont icon-share share-page__stat-share-icon' />
                    <Text className='share-page__stat-label'>分享亲友</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {info.is_employee == 1 && (
            <View className='share-page__list-block'>
              <ScrollView
                className='share-page__scroll'
                scrollY
                scrollWithAnimation
                onScroll={this.handleScroll}
                onScrollToLower={this.nextPage}
              >
                <View className='share-page__list'>
                  {relative_list?.map((item) => {
                    return (
                      <View className='share-page__list-item' key={item.id}>
                        <SpImage
                          className='share-page__list-avatar'
                          src={item.avatar || 'default_user.png'}
                          mode='aspectFill'
                          width={106}
                          height={106}
                          lazyLoad
                        />
                        <View className='share-page__list-mid'>
                          <Text className='share-page__list-name'>{item.username}</Text>
                          <View className='share-page__list-date-row'>
                            <SpImage
                              className='share-page__list-clock-icon'
                              src='purchare_time.png'
                              width={28}
                              height={28}
                            />
                            <Text className='share-page__list-date'>
                              {formatDateTime(item.created * 1000)}
                            </Text>
                          </View>
                        </View>
                        <View className='share-page__list-right'>
                          <Text className='share-page__list-r-label'>已使用</Text>
                          <Text className='share-page__list-r-val'>
                            {this.formatUsedYuan(item.used_limitfee)}
                          </Text>
                        </View>
                      </View>
                    )
                  })}
                </View>
              </ScrollView>
              {relative_list.length === 0 && (
                <View className='share-page__empty'>暂无亲友数据</View>
              )}

              <SharePurchase
                open={isOpened}
                onCreatePoster={this.onCreatePoster}
                onClose={() => {
                  this.setState({
                    isOpened: false
                  })
                }}
              ></SharePurchase>

              {posterModalOpen && (
                <SpPoster
                  info={purchase_share_info}
                  type='invite'
                  onClose={() => {
                    this.setState({
                      posterModalOpen: false
                    })
                  }}
                />
              )}
            </View>
          )}
        </View>
      </SpPage>
    )
  }
}
