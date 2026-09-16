/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { getGameConfig, drawPrize, mapDrawErrorMessage } from '@/api/game'
import { GAME_TYPES } from '@/consts/game'
import { pickBy, styleNames, showToast, isWeb } from '@/utils'
import { GAME_CONFIG, resolveActivityStatus } from '@/doc/game'
import { SpPage, SpLoading, SpNote, SpImage, SpLogin } from '@/components'
import { useTranslation, $t } from '@/i18n'
import useLogin from '@/hooks/useLogin'
import S from '@/spx'
import SpTurntable from './components/sp-turntable'
import SpGrid from './components/sp-grid'
import SpSlot from './components/sp-slot'
import SpRuleLayout from './components/sp-rule-layout'
import SpDrawResult from './components/sp-draw-result'
import ActiveTotalControl from './components/sp-active-header'
import { resolveTurnTableProps } from './components/helper'
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
  const [showLoginModal, setShowLoginModal] = useState(false)

  const isDrawing = useRef(false)
  const loginRef = useRef(null)

  useEffect(() => {
    loadActivityData()
  }, [])

  useEffect(() => {
    const title =
      activityMeta?.activity_name || activityMeta?.name || $t('0ca7753b.9384d6')
    Taro.setNavigationBarTitle({ title })
  }, [i18n.language, activityMeta?.activity_name, activityMeta?.name])

  const canDraw = activityStatus === 'online'

  const buildCurrentPath = useCallback(() => {
    const pages = Taro.getCurrentPages?.() || []
    const current = pages[pages.length - 1]
    const route = current?.route ? `/${current.route}` : '/subpages/game-activity/index'
    const params = current?.options || Taro.getCurrentInstance()?.router?.params || {}
    const query = Object.keys(params)
      .filter((k) => params[k] !== undefined && params[k] !== null)
      .map((k) => `${k}=${encodeURIComponent(params[k])}`)
      .join('&')
    return query ? `${route}?${query}` : route
  }, [])

  const ensureLogin = useCallback(() => {
    const token = S?.getAuthToken?.()
    if (token || isLogin) return true
    // H5 无登录弹层，走授权页并带回当前抽奖页
    if (isWeb) {
      const fullPath = buildCurrentPath()
      Taro.navigateTo({
        url: `/subpages/auth/login?redirect=${encodeURIComponent(fullPath)}`
      })
      return false
    }
    // 小程序：弹登录窗，不跳个人中心
    setShowLoginModal(true)
    loginRef.current?.handleToLogin?.()
    return false
  }, [isLogin, buildCurrentPath])

  const onLoginSuccess = useCallback(() => {
    setShowLoginModal(false)
    loadActivityData()
  }, [])

  const loadActivityData = async () => {
    setLoading(true)
    setError(null)

    try {
      const routerParams = Taro.getCurrentInstance()?.router?.params || {}
      const { type, id } = routerParams
      const response = await getGameConfig({ ...routerParams, id })

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
    // expire：含已结束 / 已终止
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
      const routerParams = Taro.getCurrentInstance()?.router?.params || {}
      const response = await drawPrize(activeId, { routerParams })
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

      // 含 GRANT_FAILED：提示可重试，不伪装谢谢参与
      showToast(response?.message || mapDrawErrorMessage(response) || $t('7b1e93f4.15509f'))
      return Promise.reject(response)
    } catch (err) {
      isDrawing.current = false
      console.error('抽奖请求失败:', err)
      showToast(mapDrawErrorMessage(err))
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
    const style = {}
    // 有按钮图时由 Image 渲染，避免中文文件名在 CSS url() 下失效
    if (!formConfig?.img) {
      if (colors[0]) style['background-color'] = colors[0]
      if (colors[1]) style.color = colors[1]
    }
    return Object.keys(style).length ? styleNames(style) : ''
  }

  const renderFooterBtn = (formConfig, text, onClick) => (
    <View
      style={getBtnStyle(formConfig)}
      className='sp-game-activity__footer-btn'
      onClick={onClick}
    >
      {formConfig?.img ? (
        <SpImage
          className='sp-game-activity__footer-btn-img'
          src={formConfig.img}
          mode='widthFix'
        />
      ) : (
        text
      )}
    </View>
  )

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
        return <SpTurntable {...resolveTurnTableProps(commonProps)} />
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

  const getPageStyle = () => ({
    backgroundColor: activityConfig?.backgroundColor || '#f5f5f5'
  })

  const ruleFormConfig = activityConfig?.ruleFormConfig || {}
  const recordFormConfig = activityConfig?.recordFormConfig || {}

  return (
    <SpPage className='sp-game-activity'>
      <View className='sp-game-activity__ad-area' style={getPageStyle()}>
        {loading && (
          <View className='sp-game-activity__status'>
            <SpLoading>{$t('c7a229df.26b5bd')}</SpLoading>
          </View>
        )}

        {!loading && (error || !activityConfig) && (
          <View className='sp-game-activity__status'>
            <SpNote className='sp-game-activity__empty' img='empty_data.png'>
              {$t(error || 'c7a229df.2e15a2')}
            </SpNote>
            <View className='sp-game-activity__retry' onClick={loadActivityData}>
              {$t('c7a229df.132c5c')}
            </View>
          </View>
        )}

        {!loading && !error && activityConfig && (
          <View className='sp-game-activity__background-image-container'>
            {!!activityConfig.backgroundImage && (
              <SpImage
                src={activityConfig.backgroundImage}
                mode='aspectFill'
                className='sp-game-activity__background-image'
              />
            )}
            <View className='sp-game-activity__content'>
              <View style={{ marginTop: activityConfig?.gameMarginTop ?? 150 }}>
                <ActiveTotalControl
                  userInfo={userInfo}
                  isLogin={!!(S?.getAuthToken?.() || isLogin)}
                  onLogin={ensureLogin}
                />
              </View>

              <View className='sp-game-activity__game-container'>{renderGameComponent}</View>
              <View className='sp-game-activity__footer'>
                {renderFooterBtn(ruleFormConfig, $t('c7a229df.02a217'), () =>
                  setRuleVisible(true)
                )}
                {renderFooterBtn(recordFormConfig, $t('c7a229df.8a69c2'), () => {
                  if (!ensureLogin()) return
                  Taro.navigateTo({
                    url: `/subpages/game-activity/pages/records?id=${activeId}`
                  })
                })}
              </View>
            </View>
          </View>
        )}

        <SpRuleLayout
          rules={rules}
          visible={ruleVisible}
          onClose={() => setRuleVisible(false)}
        />

        <SpDrawResult
          id={activeId}
          visible={resultVisible}
          onClose={handleCloseResult}
          prizeInfo={resultData.insufficientPoints ? {} : resultData}
          insufficientPoints={!!resultData.insufficientPoints}
          requiredPoints={resultData.requiredPoints}
          currentPoints={resultData.currentPoints}
        />

        <SpLogin
          ref={loginRef}
          visible={showLoginModal}
          onChange={onLoginSuccess}
          onClose={() => setShowLoginModal(false)}
        />
      </View>
    </SpPage>
  )
}

export default GameActivity
