/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AtButton } from 'taro-ui'
import { getGameConfig, drawPrize } from '@/api/game'
import { GAME_TYPES } from '@/consts/game'
import { pickBy, styleNames, showToast } from '@/utils'
import { GAME_CONFIG, resolveActivityStatus } from '@/doc/game'
import { SpPage } from '@/components'
import { useTranslation, $t } from '@/i18n'
import useLogin from '@/hooks/useLogin'
import S from '@/spx'
import SpWheel from './components/sp-wheel'
import SpGrid from './components/sp-grid'
import SpSlot from './components/sp-slot'
import SpRuleLayout from './components/sp-rule-layout'
import SpDrawResult from './components/sp-draw-result'
import ActiveTotalControl from './components/sp-active-header'
import './index.scss'

const GameActivity = () => {
  const { i18n } = useTranslation()
  const { isLogin } = useLogin({ autoLogin: false })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activityConfig, setActivityConfig] = useState(null)
  const [gameType, setGameType] = useState('')
  const [userInfo, setUserInfo] = useState(null)
  const [activityMeta, setActivityMeta] = useState({})
  const [activityStatus, setActivityStatus] = useState('online')

  const [resultVisible, setResultVisible] = useState(false)
  const [resultData, setResultData] = useState({})
  const [rules, setRules] = useState('')
  const [ruleVisible, setRuleVisible] = useState(false)
  const [activeId, setActiveId] = useState('')

  const isDrawing = useRef(false)

  useEffect(() => {
    loadActivityData()
  }, [])

  useEffect(() => {
    Taro.setNavigationBarTitle({ title: $t('0ca7753b.9384d6') })
  }, [i18n.language])

  const canDraw = activityStatus === 'online'

  const ensureLogin = useCallback(() => {
    const token = S?.getAuthToken?.()
    if (token || isLogin) return true
    showToast($t('c7a229df.033202'))
    const pages = Taro.getCurrentPages?.() || []
    const current = pages[pages.length - 1]
    const route = current?.route ? `/${current.route}` : '/subpages/game-activity/index'
    const params = current?.options || Taro.getCurrentInstance()?.router?.params || {}
    const query = Object.keys(params)
      .filter((k) => params[k] !== undefined && params[k] !== null)
      .map((k) => `${k}=${encodeURIComponent(params[k])}`)
      .join('&')
    const fullPath = query ? `${route}?${query}` : route
    setTimeout(() => {
      Taro.navigateTo({
        url: `/subpages/member/index?redirect=${encodeURIComponent(fullPath)}`
      })
    }, 400)
    return false
  }, [isLogin])

  const loadActivityData = async () => {
    setLoading(true)
    setError(null)

    try {
      const { type, id } = Taro.getCurrentInstance()?.router?.params || {}
      const response = await getGameConfig({ id })

      if (response && response?.activity_template_config) {
        const processedConfig = pickBy(response.activity_template_config, GAME_CONFIG)
        const _gameType = type || processedConfig.gameType
        const status = resolveActivityStatus(response)

        setActivityConfig(processedConfig)
        setGameType(_gameType)
        setRules(response.intro || '')
        setUserInfo({
          ...(response.user_info || {}),
          point: response.user_info?.point ?? response.user_info?.points ?? 0,
          cost_value: response.cost_value
        })
        setActiveId(response.id)
        setActivityMeta(response)
        setActivityStatus(status)
        setLoading(false)
      } else {
        setError('c7a229df.2e15a2')
        setLoading(false)
      }
    } catch (err) {
      console.error('加载活动数据出错:', err)
      setError('c7a229df.400a8d')
      setLoading(false)
    }
  }

  const tipForStatus = useCallback(() => {
    if (activityStatus === 'notstart') {
      showToast($t('c7a229df.7527b8'))
      return
    }
    if (activityStatus === 'expire') {
      showToast($t('c7a229df.cdae1c'))
    }
  }, [activityStatus])

  const handleDrawPrize = useCallback(async () => {
    if (isDrawing.current) return null
    if (!ensureLogin()) return Promise.reject({ code: 'NEED_LOGIN' })
    if (!canDraw) {
      tipForStatus()
      return Promise.reject({ code: 'ACTIVITY_NOT_DRAWABLE' })
    }

    isDrawing.current = true

    try {
      const response = await drawPrize(activeId)
      if (response && response.code === 0) {
        if (response.data?.remainPoints !== undefined && response.data?.remainPoints !== null) {
          setUserInfo((prev) => ({
            ...(prev || {}),
            point: response.data.remainPoints
          }))
        }
        setResultData(response)
        return response
      }

      isDrawing.current = false
      const code = String(response?.code || '')
      if (code === 'LUCKY_DRAW_POINT_NOT_ENOUGH') {
        setResultData({
          insufficientPoints: true,
          requiredPoints: userInfo?.cost_value || activityMeta?.cost_value || 0,
          currentPoints: userInfo?.point || 0,
          message: response?.message
        })
        setResultVisible(true)
        return Promise.reject(response)
      }

      if (code === 'LUCKY_DRAW_GRANT_FAILED') {
        showToast(response?.message || $t('7b1e93f4.4dabfb'))
        return Promise.reject(response)
      }

      showToast(response?.message || $t('7b1e93f4.15509f'))
      return Promise.reject(response)
    } catch (err) {
      isDrawing.current = false
      console.error('抽奖请求失败:', err)
      showToast(err?.message || $t('7b1e93f4.15509f'))
      return Promise.reject(err)
    }
  }, [
    activeId,
    canDraw,
    ensureLogin,
    tipForStatus,
    userInfo?.cost_value,
    userInfo?.point,
    activityMeta?.cost_value
  ])

  const handleCloseResult = useCallback(() => {
    setResultVisible(false)
    setResultData({})
  }, [])

  const handleGameEnd = () => {
    setTimeout(() => {
      isDrawing.current = false
      setResultVisible(true)
    }, 600)
  }

  const getBtnStyle = (formConfig = {}) => {
    const colors = formConfig?.rule || []
    const style = {
      'background-color': colors[0] || '#fff',
      color: colors[1] || '#000'
    }
    if (formConfig?.img) {
      style['background-image'] = `url(${formConfig.img})`
      style['background-size'] = '100% auto'
      style['background-repeat'] = 'no-repeat'
    }
    return styleNames(style)
  }

  const renderGameComponent = useMemo(() => {
    if (!activityConfig || !activityConfig.gameConfig) return null

    const commonProps = {
      config: activityConfig.gameConfig,
      onDrawPrize: handleDrawPrize,
      isDrawing: isDrawing?.current,
      canDraw,
      onBlocked: tipForStatus,
      onGameEnd: handleGameEnd
    }

    switch (gameType) {
      case GAME_TYPES.WHEEL:
        return <SpWheel {...commonProps} />
      case GAME_TYPES.GRID:
        return <SpGrid {...commonProps} />
      case GAME_TYPES.SLOT:
        return <SpSlot {...commonProps} />
      default:
        return (
          <View className='sp-game-activity__unsupported'>
            <Text>{$t('c7a229df.64247c')}</Text>
          </View>
        )
    }
  }, [activityConfig?.gameConfig, gameType, activeId, i18n.language, canDraw, handleDrawPrize, tipForStatus])

  const getPageStyle = () => {
    const style = {}
    if (activityConfig?.backgroundImage) {
      style.backgroundImage = `url(${activityConfig.backgroundImage})`
      style.backgroundSize = 'cover'
      style.backgroundPosition = 'center'
      style.backgroundRepeat = 'no-repeat'
    } else if (activityConfig?.backgroundColor) {
      style.backgroundColor = activityConfig.backgroundColor
    }
    return style
  }

  const ruleFormConfig = activityConfig?.ruleFormConfig || {}
  const recordFormConfig = activityConfig?.recordFormConfig || {}

  return (
    <SpPage className='sp-game-activity'>
      <View className='sp-game-activity__ad-area' style={getPageStyle()}>
        {loading && (
          <View className='sp-game-activity__loading'>
            <View className='sp-game-activity__loading-icon'></View>
            <Text className='sp-game-activity__loading-text'>{$t('c7a229df.26b5bd')}</Text>
          </View>
        )}

        {error && (
          <View className='sp-game-activity__error'>
            <Text className='sp-game-activity__error-text'>{$t(error)}</Text>
            <AtButton size='normal' onClick={loadActivityData}>
              {$t('c7a229df.132c5c')}
            </AtButton>
          </View>
        )}

        {!loading && !error && (
          <>
            <View style={{ marginTop: activityConfig?.gameMarginTop || 0 }}>
              <ActiveTotalControl userInfo={userInfo} />
            </View>

            {activityConfig && (
              <>
                <View className='sp-game-activity__game-container'>{renderGameComponent}</View>
                <View className='sp-game-activity__footer'>
                  <View
                    style={getBtnStyle(ruleFormConfig)}
                    className='sp-game-activity__footer-btn'
                    onClick={() => setRuleVisible(true)}
                  >
                    {!ruleFormConfig?.img && $t('c7a229df.02a217')}
                  </View>
                  <View
                    style={getBtnStyle(recordFormConfig)}
                    className='sp-game-activity__footer-btn'
                    onClick={() => {
                      if (!ensureLogin()) return
                      Taro.navigateTo({
                        url: `/subpages/game-activity/pages/records?id=${activeId}`
                      })
                    }}
                  >
                    {!recordFormConfig?.img && $t('c7a229df.8a69c2')}
                  </View>
                </View>
              </>
            )}

            <SpRuleLayout
              rules={rules}
              visible={ruleVisible}
              onClose={() => setRuleVisible(false)}
            />
          </>
        )}

        <SpDrawResult
          id={activeId}
          visible={resultVisible}
          onClose={handleCloseResult}
          prizeInfo={resultData.insufficientPoints ? {} : resultData}
          insufficientPoints={!!resultData.insufficientPoints}
          requiredPoints={resultData.requiredPoints}
          currentPoints={resultData.currentPoints}
        />
      </View>
    </SpPage>
  )
}

export default GameActivity
