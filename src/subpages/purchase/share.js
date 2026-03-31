/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import React, { Component } from 'react'
import Taro, { getCurrentInstance } from '@tarojs/taro'
import { View, Text, ScrollView, Button } from '@tarojs/components'
import { SpPage, SpImage, SpPoster } from '@/components'
import { SharePurchase } from '@/subpages/components'
import api from '@/api'
import dayjs from 'dayjs'
import { connect } from 'react-redux'
import { withPager } from '@/hocs'
import { styleNames, formatDateTime, log } from '@/utils'
import { $t, ti, i18n } from '@/i18n'
import './share.scss'

@connect(({ user, purchase }) => ({
  userInfo: user.userInfo,
  purchase_share_info: purchase.persist_purchase_share_info
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
      posterModalOpen: false
    }
  }

  componentDidMount() {
    Taro.hideShareMenu({
      menus: ['shareAppMessage', 'shareTimeline']
    })
    this._setShareNavTitle = () => {
      Taro.setNavigationBarTitle({ title: $t('d0465c10.36d204') })
    }
    this._setShareNavTitle()
    i18n.on('languageChanged', this._setShareNavTitle)
    this.nextPage()
    this.getActivitydata()
  }

  componentWillUnmount() {
    if (this._setShareNavTitle) {
      i18n.off('languageChanged', this._setShareNavTitle)
    }
  }

  onShareAppMessage() {
    const { info } = this.state
    const { enterprise_id, activity_id } = this.props.purchase_share_info || {}
    return new Promise(async function (resolve) {
      const data = await api.purchase.getEmployeeInviteCode({ enterprise_id, activity_id })
      log.debug(`/pages/purchase/auth?code=${data.invite_code}`)
      resolve({
        title: info.name,
        imageUrl: info.share_pic,
        path: `/pages/purchase/auth?code=${data.invite_code}&enterprise_id=${enterprise_id}&activity_id=${activity_id}`
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
        title: $t('63b11dbe.ce0559'),
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

  render() {
    const { info, relative_list, isOpened, posterModalOpen } = this.state
    const { userInfo, purchase_share_info } = this.props

    return (
      <SpPage className='page-purchase-index'>
        <View
          className='header-block'
          style={styleNames({
            'background-image': `url(${process.env.APP_IMAGE_CDN}/m_bg.png)`
          })}
        >
          <View className='header-hd'>
            <SpImage className='usericon' src={userInfo.avatar || 'default_user.png'} width='110' />
            <View className='header-hd__body'>
              <View className='username-wrap'>
                <View className='left-wrap'>
                  <View className='username'>{userInfo.username}</View>
                  <View className='userRole'>
                    {info.is_employee == 1 ? $t('2ed39222.055f8a') : $t('3b6fe43d.d44fdf')}
                  </View>
                </View>
                {info.is_employee == 1 && (
                  <Button
                    open-type='share'
                    size='mini'
                    className='shareBtn'
                    disabled={info.invite_limit == info.invited_num}
                  >
                    <Text onClick={this.showInfo.bind(this)}>{$t('593377c2.c31f48')}</Text>
                  </Button>
                )}
              </View>
            </View>
          </View>
          <View className='share-info'>
            <View className='title'>{$t('c57fe3e9.ec441a')}</View>
            <View className='limitnum'>
              {ti('187d55e5.ab8f39', [
                info.invite_limit,
                info.invited_num,
                info.invite_limit - info.invited_num
              ])}
            </View>
          </View>
          <View className='relative-time'>
            {ti('efc43b43.dec226', [
              formatDateTime(info?.relative_begin_time * 1000),
              formatDateTime(info?.relative_end_time * 1000)
            ])}
          </View>
          {/* <View className='header-bd'>
            <View className='bd-item'>
              <View className='bd-item-label'>总额度</View>
              <View className='bd-item-value'>
                {info.total_limitfee ? (info.total_limitfee / 100).toFixed(2) : '0.00'}
              </View>
            </View>
            <View className='bd-item border-item'>
              <View className='bd-item-label'>已使用额度</View>
              <View className='bd-item-value'>
                {info.used_limitfee ? (info.used_limitfee / 100).toFixed(2) : '0.00'}
              </View>
            </View>
            <View className='bd-item'>
              <View className='bd-item-label'>剩余额度</View>
              <View className='bd-item-value'>
                {info.surplus_limitfee ? (info.surplus_limitfee / 100).toFixed(2) : '0.00'}
              </View>
            </View>
          </View> */}
        </View>
        {info.is_employee == 1 && (
          <View>
            <View className='line-wrap'>
              <Text className='line'></Text>
              <Text className='line-title'>{$t('a702ec6d.f31042')}</Text>
              <Text className='line'></Text>
            </View>
            <ScrollView
              className='line-wrap-scroll'
              scrollY
              scrollWithAnimation
              onScroll={this.handleScroll}
              onScrollToLower={this.nextPage}
            >
              <View className='list-wrap'>
                {relative_list?.map((item) => {
                  return (
                    <View className='list-item' key={item.id}>
                      <SpImage
                        className='list-item-img'
                        src={item.avatar || 'default_user.png'}
                        mode='widthFix'
                        width='750'
                        lazyLoad
                      />
                      <View className='list-item-center'>
                        <View className='list-item-name'>{item.username}</View>
                        <View className='list-item-date'>
                          {formatDateTime(item.created * 1000)}
                        </View>
                      </View>
                      <View>
                        <View>{$t('7a87bf63.a9b796')}</View>
                        <View className='list-item-count'>
                          {item.used_limitfee ? (item.used_limitfee / 100).toFixed(2) : '0.00'}
                        </View>
                      </View>
                    </View>
                  )
                })}
              </View>
            </ScrollView>
            {relative_list.length === 0 && (
              <View className='centerText'>{$t('c575112f.f1f45e')}</View>
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

            {/* 海报 */}
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
      </SpPage>
    )
  }
}
