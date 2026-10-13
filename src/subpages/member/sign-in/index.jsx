/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, ScrollView } from '@tarojs/components'
import { useImmer } from 'use-immer'
import dayjs from 'dayjs'
import { SpPage, SpFloatLayout, SpLoading, SpNote, SpImage, SpHtml } from '@/components'
import { classNames, isWeixin, showToast } from '@/utils'
import useLogin from '@/hooks/useLogin'
import S from '@/spx'
import api from '@/api'
import { useTranslation, $t, ti } from '@/i18n'
import {
  getSignPage,
  submitSign,
  getSignMonthRecords,
  subscribeSignRemind
} from '@/api/sign'
import './index.scss'

function normalizeTmplIds(templateId) {
  if (Array.isArray(templateId)) return templateId.filter(Boolean)
  if (templateId) return [templateId]
  return []
}

const TIER_STATUS_KEYS = {
  granted: '2de1ca1c.0b7e8d',
  claimable: '2de1ca1c.baa612',
  pending: '2de1ca1c.26a7c3',
  failed: '2de1ca1c.9338d5'
}

const WEEKDAY_KEYS = [
  '2de1ca1c.7941da',
  '2de1ca1c.2d8be2',
  '2de1ca1c.e662ff',
  '2de1ca1c.21716c',
  '2de1ca1c.1fcc29',
  '2de1ca1c.61b453',
  '2de1ca1c.3edddd'
]

const initialState = {
  loading: true,
  pageReady: false,
  submitting: false,
  monthTitle: '',
  cumulativeDays: 0,
  todaySigned: false,
  subscribed: false,
  remindTmplIds: [],
  rules: '',
  weekDays: [],
  activity: null,
  successOpen: false,
  successRewards: [],
  recordOpen: false,
  rulesOpen: false,
  recordMonth: '',
  recordCells: [],
  recordLoading: false
}

function formatWeekdayLabel(dateStr) {
  if (!dateStr) return ''
  // dayjs: 0=Sun … 6=Sat → 展示一～日（周一为首）
  const d = dayjs(dateStr).day()
  const idx = d === 0 ? 6 : d - 1
  return $t(WEEKDAY_KEYS[idx])
}

function SignInPage() {
  const { i18n } = useTranslation()
  const { isLogin } = useLogin({ autoLogin: false })
  const [state, setState] = useImmer(initialState)
  const submittingRef = useRef(false)

  const {
    loading,
    pageReady,
    submitting,
    monthTitle,
    cumulativeDays,
    todaySigned,
    subscribed,
    remindTmplIds,
    rules,
    weekDays,
    activity,
    successOpen,
    successRewards,
    recordOpen,
    rulesOpen,
    recordMonth,
    recordCells,
    recordLoading
  } = state

  const ensureLogin = useCallback(() => {
    const token = S?.getAuthToken?.()
    if (token || isLogin) return true
    showToast($t('2de1ca1c.8d2433'))
    const pages = Taro.getCurrentPages?.() || []
    const current = pages[pages.length - 1]
    const route = current?.route ? `/${current.route}` : '/subpages/member/sign-in/index'
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

  const loadRemindTemplate = useCallback(async () => {
    if (!isWeixin) {
      setState((draft) => {
        draft.remindTmplIds = []
      })
      return []
    }
    try {
      const { template_id } = await api.user.newWxaMsgTmpl({
        temp_name: 'yykweishop',
        source_type: 'member_signin'
      })
      const ids = normalizeTmplIds(template_id)
      setState((draft) => {
        draft.remindTmplIds = ids
      })
      return ids
    } catch (e) {
      console.error(e)
      setState((draft) => {
        draft.remindTmplIds = []
      })
      return []
    }
  }, [setState])

  const loadPage = useCallback(async () => {
    setState((draft) => {
      draft.loading = true
    })
    try {
      const [data] = await Promise.all([getSignPage(), loadRemindTemplate()])
      setState((draft) => {
        draft.monthTitle = data.monthTitle || ''
        draft.cumulativeDays = data.cumulativeDays || 0
        draft.todaySigned = !!data.todaySigned
        draft.subscribed = !!data.subscribed
        draft.rules = data.rules || ''
        draft.weekDays = data.weekDays || []
        draft.activity = data.activity || null
        draft.pageReady = true
        draft.loading = false
      })
    } catch (e) {
      console.error(e)
      setState((draft) => {
        draft.loading = false
        draft.pageReady = false
      })
      showToast($t('2de1ca1c.b377b8'))
    }
  }, [setState, loadRemindTemplate])

  useEffect(() => {
    Taro.setNavigationBarTitle({ title: $t('2de1ca1c.f80c5e') })
  }, [i18n.language])

  useEffect(() => {
    if (!ensureLogin()) {
      setState((draft) => {
        draft.loading = false
      })
      return
    }
    loadPage()
  }, [])

  useEffect(() => {
    if (isLogin && !pageReady && !loading) {
      loadPage()
    }
  }, [isLogin])

  const signDisabled = useMemo(() => {
    return !pageReady || loading || submitting || todaySigned
  }, [pageReady, loading, submitting, todaySigned])

  const handleSign = async () => {
    if (signDisabled || submittingRef.current) return
    if (!ensureLogin()) return
    submittingRef.current = true
    setState((draft) => {
      draft.submitting = true
    })
    try {
      const result = await submitSign()
      await loadPage()
      setState((draft) => {
        draft.successRewards = result.rewards || []
        draft.successOpen = true
        draft.submitting = false
      })
    } catch (e) {
      console.error(e)
      setState((draft) => {
        draft.submitting = false
      })
      showToast(e?.message || e?.errMsg || $t('2de1ca1c.2c2242'))
    } finally {
      submittingRef.current = false
    }
  }

  const requestSubscribe = (tmplIds) =>
    new Promise((resolve) => {
      if (!isWeixin || !Taro.requestSubscribeMessage || !tmplIds?.length) {
        resolve(false)
        return
      }
      Taro.requestSubscribeMessage({
        tmplIds,
        complete: (res) => {
          const accepted = Object.values(res || {}).some((v) => v === 'accept')
          resolve(accepted)
        },
        fail: () => resolve(false)
      })
    })

  // 不支持取消订阅：已订阅仅展示；未订阅才弹授权并回写 subscribe-callback
  const handleSubscribeRemind = async () => {
    if (!ensureLogin()) return
    if (subscribed) return
    if (!remindTmplIds.length) return

    let tmplIds = remindTmplIds.length ? remindTmplIds : await loadRemindTemplate()
    if (!tmplIds.length) {
      showToast($t('2de1ca1c.624a34'))
      return
    }
    const accepted = await requestSubscribe(tmplIds)
    if (!accepted) {
      showToast($t('2de1ca1c.088efa'))
      return
    }

    try {
      const res = await subscribeSignRemind({ templateId: tmplIds[0] || '' })
      setState((draft) => {
        draft.subscribed = !!res.subscribed
      })
      showToast($t('2de1ca1c.12de04'))
    } catch (e) {
      showToast(e?.message || $t('2de1ca1c.9f9603'))
    }
  }

  const showRemindBtn = isWeixin && remindTmplIds.length > 0
  const remindBtnText = subscribed ? $t('2de1ca1c.d81371') : $t('2de1ca1c.57b79e')

  const openMonthRecords = async (month) => {
    const target = month || dayjs().format('YYYY-MM')
    setState((draft) => {
      draft.recordOpen = true
      draft.recordMonth = target
      draft.recordLoading = true
    })
    try {
      const res = await getSignMonthRecords({ month: target })
      setState((draft) => {
        draft.recordCells = res.list || []
        draft.recordLoading = false
      })
    } catch (e) {
      setState((draft) => {
        draft.recordLoading = false
        draft.recordCells = []
      })
      showToast($t('2de1ca1c.59a838'))
    }
  }

  const isMultiRewardModal = useMemo(() => {
    const list = successRewards || []
    if (list.some((item) => item.type === 'coupon')) return true
    return list.length > 1
  }, [successRewards])

  const closeSuccessModal = () => {
    setState((draft) => {
      draft.successOpen = false
    })
  }

  const handleViewRewards = () => {
    closeSuccessModal()
    Taro.navigateTo({
      url: '/subpages/member/sign-in/reward-records'
    })
  }

  const shiftRecordMonth = (delta) => {
    const next = dayjs(`${recordMonth}-01`).add(delta, 'month').format('YYYY-MM')
    openMonthRecords(next)
  }

  // 周历无任何日常积分 → 未设置日常签到奖励（Figma 1:1097）
  const hasDailyReward = weekDays.some((d) => Number(d.points) > 0)

  const renderDayCard = (day) => {
    let body = null
    if (!hasDailyReward) {
      if (day.signed) {
        body = (
          <>
            <SpImage
              className='sign-in__day-check'
              src='sign-check_circle.png'
              width={40}
              height={40}
              mode='aspectFit'
            />
            <Text className='sign-in__day-status'>{$t('2de1ca1c.c76659')}</Text>
          </>
        )
      } else {
        body = (
          <>
            <SpImage
              className='sign-in__day-pending-icon'
              src='sign-nocheck_circle.png'
              width={40}
              height={40}
              mode='aspectFit'
            />
            <Text className='sign-in__day-pending-text'>{$t('2de1ca1c.df8169')}</Text>
          </>
        )
      }
    } else if (day.signed) {
      body = (
        <>
          <SpImage
            className='sign-in__day-check'
            src='sign-check_circle.png'
            width={40}
            height={40}
            mode='aspectFit'
          />
          <Text className='sign-in__day-points'>
            {day.display || (day.points > 0 ? `+${day.points}` : $t('2de1ca1c.c76659'))}
          </Text>
        </>
      )
    } else if (day.missed) {
      body = (
        <>
          <SpImage
            className='sign-in__day-miss-icon'
            src='sign-nocheck_circle.png'
            width={42}
            height={42}
            mode='aspectFit'
          />
          <Text className='sign-in__day-miss-text'>{$t('2de1ca1c.62ef53')}</Text>
        </>
      )
    } else {
      body = (
        <>
          <SpImage
            className='sign-in__day-coin'
            src='sign-jifen.png'
            width={40}
            height={40}
            mode='aspectFit'
          />
          <Text className='sign-in__day-points'>
            {day.points > 0 ? `+${day.points}` : ''}
          </Text>
        </>
      )
    }
    const showMissedStyle = hasDailyReward && day.missed
    return (
      <View key={day.date} className='sign-in__day'>
        <Text className='sign-in__day-weekday'>{formatWeekdayLabel(day.date)}</Text>
        <View
          className={classNames('sign-in__day-card', {
            'is-signed': day.signed,
            'is-missed': showMissedStyle,
            'is-today': day.isToday && !day.signed,
            'is-pending': !hasDailyReward && !day.signed
          })}
        >
          {body}
        </View>
        <Text
          className={classNames('sign-in__day-date', {
            'is-secondary': !day.isToday && !day.signed && !showMissedStyle
          })}
        >
          {day.isToday ? $t('2de1ca1c.296304') : ti('2de1ca1c.916985', [dayjs(day.date).date()])}
        </Text>
      </View>
    )
  }

  const resolveTierStatus = (tier) => {
    if (tier.status === 'granted') return 'granted'
    if (tier.status === 'failed') return 'failed'
    const days = activity?.cumulativeDays ?? cumulativeDays
    if (days >= tier.daysRequired) return 'claimable'
    return 'pending'
  }

  const renderTierStatus = (tier) => {
    const status = resolveTierStatus(tier)
    const text = $t(TIER_STATUS_KEYS[status] || TIER_STATUS_KEYS.pending)
    return (
      <View
        className={classNames('sign-in__tier-btn', {
          'is-granted': status === 'granted',
          'is-claimable': status === 'claimable',
          'is-pending': status === 'pending',
          'is-failed': status === 'failed'
        })}
      >
        <Text className='sign-in__tier-btn-text'>{text}</Text>
      </View>
    )
  }

  const pageTitle = $t('2de1ca1c.f80c5e')

  if (loading && !pageReady) {
    return (
      <SpPage className='sign-in' title={pageTitle}>
        <SpLoading />
      </SpPage>
    )
  }

  return (
    <SpPage className='sign-in' title={pageTitle}>
      <View className='sign-in__body'>
        <View className='sign-in__card sign-in__card--daily'>
          <View className='sign-in__daily-hd'>
            <Text className='sign-in__daily-title'>{monthTitle || $t('2de1ca1c.c9da9b')}</Text>
            {showRemindBtn && (
              <View
                className={classNames('sign-in__remind', { 'is-on': subscribed })}
                onClick={handleSubscribeRemind}
              >
                <Text className='iconfont icon-notifications_active sign-in__remind-icon' />
                <Text className='sign-in__remind-text'>{remindBtnText}</Text>
              </View>
            )}
          </View>

          <View className='sign-in__week'>{weekDays.map(renderDayCard)}</View>

          <View className='sign-in__action'>
            <View
              className={classNames('sign-in__sign-btn', {
                'is-signed': todaySigned,
                'is-disabled': signDisabled && !todaySigned
              })}
              onClick={handleSign}
            >
              <Text className='sign-in__sign-btn-text'>
                {todaySigned
                  ? $t('2de1ca1c.e81a9d')
                  : submitting
                    ? $t('2de1ca1c.a34422')
                    : $t('2de1ca1c.bb5cc4')}
              </Text>
            </View>
          </View>

          <View className='sign-in__links'>
            <Text className='sign-in__link' onClick={() => openMonthRecords()}>
              {$t('2de1ca1c.bc6ad0')}
            </Text>
            <View className='sign-in__link-divider' />
            <Text
              className='sign-in__link'
              onClick={() => {
                Taro.navigateTo({
                  url: '/subpages/member/sign-in/reward-records'
                })
              }}
            >
              {$t('2de1ca1c.a3985b')}
            </Text>
            <View className='sign-in__link-divider' />
            <Text
              className='sign-in__link'
              onClick={() =>
                setState((draft) => {
                  draft.rulesOpen = true
                })
              }
            >
              {$t('2de1ca1c.b2f04f')}
            </Text>
          </View>
        </View>

        {activity ? (
          <View className='sign-in__card sign-in__card--activity'>
            <View className='sign-in__activity-hd'>
              <View className='sign-in__activity-titles'>
                <Text className='sign-in__activity-name'>{$t('2de1ca1c.db4c5c')}</Text>
                <Text className='sign-in__activity-time'>
                  {ti('2de1ca1c.b5e0b5', [activity.startAt, activity.endAt])}
                </Text>
              </View>
              <View className='sign-in__activity-days'>
                <Text className='sign-in__activity-days-label'>{$t('2de1ca1c.a27142')}</Text>
                <Text className='sign-in__activity-days-num'>
                  {activity.cumulativeDays ?? cumulativeDays}
                </Text>
                <Text className='sign-in__activity-days-label'>{$t('2de1ca1c.249aba')}</Text>
              </View>
            </View>

            <View className='sign-in__tiers'>
              {(activity.tiers || []).map((tier) => (
                <View key={tier.id} className='sign-in__tier'>
                  <View className='sign-in__tier-left'>
                    <Text className='sign-in__tier-days'>
                      {ti('2de1ca1c.4efb30', [tier.daysRequired])}
                    </Text>
                    <View className='sign-in__tier-rewards'>
                      {(tier.rewards || []).map((reward, idx) => (
                        <View key={`${tier.id}-${idx}`} className='sign-in__tier-reward'>
                          <SpImage
                            className='sign-in__tier-reward-icon'
                            src={
                              reward.type === 'coupon' ? 'sign-coupon.png' : 'sign-jifen.png'
                            }
                            width={30}
                            height={30}
                            mode='aspectFit'
                          />
                          {reward.type === 'point' ? (
                            <>
                              <Text className='sign-in__tier-reward-name'>
                                {$t('2de1ca1c.9f68a8')}
                              </Text>
                              <Text className='sign-in__tier-reward-amount'>
                                +{reward.amount}
                              </Text>
                            </>
                          ) : (
                            <Text className='sign-in__tier-reward-name'>{reward.name}</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                  {renderTierStatus(tier)}
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>

      {/* 签到成功 / 奖励已发放 */}
      {successOpen ? (
        <View className='sign-in-modal'>
          <View className='sign-in-modal__mask' onClick={closeSuccessModal} />
          <View
            className={classNames('sign-in-modal__panel', {
              'is-multi': isMultiRewardModal
            })}
          >
            <View className='sign-in-modal__content'>
              <View className='sign-in-modal__hd'>
                <Text
                  className='iconfont icon-guanbi sign-in-modal__close'
                  onClick={closeSuccessModal}
                />
                <Text className='sign-in-modal__title'>
                  {isMultiRewardModal ? $t('2de1ca1c.1a325c') : $t('2de1ca1c.fd44c8')}
                </Text>
              </View>
              {!isMultiRewardModal ? (
                <Text className='sign-in-modal__sub'>{$t('2de1ca1c.ed9727')}</Text>
              ) : null}
              <View
                className={classNames('sign-in-modal__rewards', {
                  'is-multi': isMultiRewardModal
                })}
              >
                {(successRewards || []).length === 0 ? (
                  <View className='sign-in-modal__reward is-stack'>
                    <SpImage
                      className='sign-in-modal__reward-icon is-lg'
                      src='sign-jifen.png'
                      width={120}
                      height={120}
                      mode='aspectFit'
                    />
                    <View className='sign-in-modal__reward-point is-stack'>
                      <Text className='sign-in-modal__reward-label is-lg'>
                        {$t('2de1ca1c.9f68a8')}
                      </Text>
                      <Text className='sign-in-modal__reward-num is-lg'>+0</Text>
                    </View>
                  </View>
                ) : (
                  successRewards.map((item, idx) => (
                    <View
                      key={idx}
                      className={classNames('sign-in-modal__reward', {
                        'is-stack': !isMultiRewardModal,
                        'is-row': isMultiRewardModal
                      })}
                    >
                      <SpImage
                        className={classNames('sign-in-modal__reward-icon', {
                          'is-lg': !isMultiRewardModal,
                          'is-sm': isMultiRewardModal
                        })}
                        src={item.type === 'coupon' ? 'sign-coupon.png' : 'sign-jifen.png'}
                        width={isMultiRewardModal ? 60 : 120}
                        height={isMultiRewardModal ? 60 : 120}
                        mode='aspectFit'
                      />
                      {item.type === 'point' ? (
                        <View
                          className={classNames('sign-in-modal__reward-point', {
                            'is-stack': !isMultiRewardModal
                          })}
                        >
                          <Text
                            className={classNames('sign-in-modal__reward-label', {
                              'is-lg': !isMultiRewardModal,
                              'is-sm': isMultiRewardModal
                            })}
                          >
                            {$t('2de1ca1c.9f68a8')}
                          </Text>
                          <Text
                            className={classNames('sign-in-modal__reward-num', {
                              'is-lg': !isMultiRewardModal,
                              'is-sm': isMultiRewardModal
                            })}
                          >
                            +{item.amount}
                          </Text>
                        </View>
                      ) : (
                        <Text
                          className={classNames('sign-in-modal__reward-name', {
                            'is-sm': isMultiRewardModal
                          })}
                        >
                          {item.name}
                        </Text>
                      )}
                    </View>
                  ))
                )}
              </View>
            </View>
            {isMultiRewardModal ? (
              <View className='sign-in-modal__footer'>
                <View className='sign-in-modal__btn' onClick={handleViewRewards}>
                  <Text className='sign-in-modal__btn-text'>{$t('2de1ca1c.7c271c')}</Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      <SpFloatLayout
        className='sign-in-record-layout'
        title={$t('2de1ca1c.bc6ad0')}
        open={recordOpen}
        onClose={() =>
          setState((draft) => {
            draft.recordOpen = false
          })
        }
      >
        <View className='sign-in-record'>
          <View className='sign-in-record__month'>
            <Text
              className='at-icon at-icon-chevron-left sign-in-record__nav'
              onClick={() => shiftRecordMonth(-1)}
            />
            <Text className='sign-in-record__month-text'>
              {recordMonth
                ? ti('2de1ca1c.f63e95', [Number(recordMonth.split('-')[1])])
                : ''}
            </Text>
            <Text
              className='at-icon at-icon-chevron-right sign-in-record__nav'
              onClick={() => shiftRecordMonth(1)}
            />
          </View>
          <View className='sign-in-record__weekdays'>
            {WEEKDAY_KEYS.map((key) => (
              <Text key={key} className='sign-in-record__weekday'>
                {$t(key)}
              </Text>
            ))}
          </View>
          {recordLoading ? (
            <SpLoading />
          ) : recordCells.length === 0 ? (
            <SpNote title={$t('2de1ca1c.216dc3')} />
          ) : (
            <View className='sign-in-record__grid'>
              {recordCells.map((cell, idx) => (
                <View
                  key={idx}
                  className={classNames('sign-in-record__cell', {
                    'is-signed': cell.inMonth && cell.signed,
                    'is-empty': !cell.inMonth
                  })}
                >
                  {cell.inMonth ? (
                    <>
                      <Text
                        className={classNames('sign-in-record__day', {
                          'is-signed': cell.signed,
                          'is-muted': !cell.signed
                        })}
                      >
                        {cell.day}
                      </Text>
                      {cell.signed ? (
                        <View className='sign-in-record__signed'>
                          <SpImage
                            className='sign-in-record__check'
                            src='sign-check_circle.png'
                            width={40}
                            height={40}
                            mode='aspectFit'
                          />
                          <Text
                            className={classNames('sign-in-record__tip', {
                              'is-points': cell.points > 0
                            })}
                          >
                            {cell.display ||
                              (cell.points > 0 ? `+${cell.points}` : $t('2de1ca1c.c76659'))}
                          </Text>
                        </View>
                      ) : null}
                    </>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </View>
      </SpFloatLayout>

      <SpFloatLayout
        title={$t('2de1ca1c.b2f04f')}
        open={rulesOpen}
        onClose={() =>
          setState((draft) => {
            draft.rulesOpen = false
          })
        }
      >
        <View className='sign-in-rules'>
          {!rules ? (
            <Text className='sign-in-rules__text'>{$t('2de1ca1c.67a219')}</Text>
          ) : (
            <ScrollView className='sign-in-rules__scroll' scrollY>
              <View className='sign-in-rules__html'>
                <SpHtml content={rules} />
              </View>
            </ScrollView>
          )}
        </View>
      </SpFloatLayout>
    </SpPage>
  )
}

export default SignInPage
