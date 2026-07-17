/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import React, { useEffect, useState } from 'react'
import Taro, { getCurrentInstance } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { isWxWeb } from '@/utils'
import api from '@/api'
import { useTranslation, $t } from '@/i18n'
import './comp-otherlogin.scss'

const SOCIAL_CLASS = {
  weixin: 'wechat',
  google: 'google',
  apple: 'apple',
  facebook: 'facebook',
  line: 'line'
}

// 临时占位：iconfont 未接入前用英文字母标识平台
const SOCIAL_LETTERS = {
  google: 'G',
  apple: 'A',
  facebook: 'F',
  line: 'L'
}

const renderProviderIcon = (type) => {
  if (type === 'weixin') {
    return <Text className='iconfont icon-weixin' />
  }
  const letter = SOCIAL_LETTERS[type] || (type ? type.charAt(0).toUpperCase() : '?')
  return <Text className='login-item-letter'>{letter}</Text>
}

const isEnabled = (row) => row && (row.status === true || row.status === 'true' || row.status === 1)

const SOCIAL_OAUTH_REDI_KEY = 'ecx_social_oauth_redi_url'

const CompOtherLogin = () => {
  useTranslation()
  const [providers, setProviders] = useState([])

  useEffect(() => {
    const loadProviders = async () => {
      try {
        const list = await api.wx.getTrustLoginList({ version_tag: 'touch' })
        const rows = Array.isArray(list) ? list : []
        setProviders(rows.filter(isEnabled))
      } catch (e) {
        setProviders([])
      }
    }
    loadProviders()
  }, [])

  const handleClickProvider = async (row) => {
    const $instance = getCurrentInstance() || {}
    const { redirect = '' } = $instance?.router?.params || {}
    const redirectUrl =
      !!redirect && redirect !== 'undefined' ? redirect : process.env.APP_HOME_PAGE

    if (row.type === 'weixin') {
      const { oauth_url = '' } = await api.wx.getWxAuth({
        redirect_url: redirectUrl,
        trustlogin_tag: 'weixin',
        version_tag: 'touch'
      })
      if (oauth_url) {
        window.location.replace(oauth_url)
      }
      return
    }

    const { oauth_url = '' } = await api.wx.getWxAuth({
      redirect_url: redirectUrl,
      trustlogin_tag: row.type,
      version_tag: 'touch'
    })
    if (oauth_url) {
      try {
        sessionStorage.setItem(SOCIAL_OAUTH_REDI_KEY, redirectUrl || '')
      } catch (e) {
        // ignore
      }
      window.location.replace(oauth_url)
    }
  }

  const visibleProviders = providers.filter((row) => {
    if (row.type === 'weixin') {
      return isWxWeb
    }
    return true
  })

  if (!visibleProviders.length) {
    return null
  }

  return (
    <View className='comp-other-login' data-testid='auth-other-login-list'>
      <View className='text'>{$t('8c3959b3.c4a461')}</View>
      <View className='loginway'>
        {visibleProviders.map((row) => (
          <View
            key={row.type}
            className={`login-item ${SOCIAL_CLASS[row.type] || row.type}`}
            data-testid={row.type === 'google' ? 'auth-other-login-google' : `auth-other-login-${row.type}`}
            onClick={() => handleClickProvider(row)}
          >
            {renderProviderIcon(row.type)}
          </View>
        ))}
      </View>
    </View>
  )
}

CompOtherLogin.options = {
  addGlobalClass: true
}

export default CompOtherLogin
