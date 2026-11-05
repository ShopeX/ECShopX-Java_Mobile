/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 *
 * 历史参与任务 — Figma 1381:11753（ECX-10434 participations）
 */
import React, { useEffect } from 'react'
import { useImmer } from 'use-immer'
import Taro, { useDidShow } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { SpPage, SpNote, SpImage } from '@/components'
import api from '@/api'
import doc from '@/subpages/doc'
import { pickBy, classNames } from '@/utils'
import { useTranslation, $t } from '@/i18n'
import { TASK_STATUS } from '@/subpages/doc/task'
import './history.scss'

const initialState = {
  list: [],
  loading: true
}

function TaskHistory() {
  const { i18n } = useTranslation()
  const [state, setState] = useImmer(initialState)
  const { list, loading } = state

  useEffect(() => {
    Taro.setNavigationBarTitle({ title: $t('885f128b.d00ae1') })
  }, [i18n.language])

  useDidShow(() => {
    fetchHistory()
  })

  const fetchHistory = async () => {
    setState((draft) => {
      draft.loading = true
    })
    try {
      const res = await api.task.getHistoryList({ page_no: 1, page_size: 50 })
      setState((draft) => {
        draft.list = pickBy(res.list || [], doc.task.HISTORY_ITEM)
        draft.loading = false
      })
    } catch (e) {
      setState((draft) => {
        draft.loading = false
        draft.list = []
      })
    }
  }

  return (
    <SpPage className='page-task-history'>
      {!loading && list.length === 0 && (
        <View className='page-task-history__empty'>
          <SpNote>{$t('885f128b.2f98bc')}</SpNote>
        </View>
      )}
      <View className='page-task-history__list'>
        {list.map((item) => {
          const pending = item.rewardStatus === TASK_STATUS.pending_reward
          const failed = item.rewardStatus === TASK_STATUS.reward_failed
          // 优先用接口 grant_status_text（如「奖励已发放」）
          const statusText =
            item.grantStatusText ||
            (pending
              ? $t('885f128b.e466af')
              : failed
                ? $t('2de1ca1c.9338d5')
                : $t('885f128b.1a325c'))
          return (
            <View
              className='page-task-history__item'
              key={`${item.completionId || item.taskId}_${item.finishedAt}`}
            >
              <View className='page-task-history__row-top'>
                <Text className='page-task-history__name'>{item.name}</Text>
                <Text className='page-task-history__time'>{item.finishedAt}</Text>
              </View>
              <View className='page-task-history__row-bottom'>
                <View className='page-task-history__reward-block'>
                  <Text className='page-task-history__reward-label'>
                    {$t('885f128b.897b3c')}
                  </Text>
                  <View className='page-task-history__rewards'>
                    {(item.rewards || []).map((r, idx) => (
                      <View className='page-task-history__reward' key={`hr_${idx}`}>
                        <SpImage
                          className='page-task-history__reward-icon'
                          src={r.type === 'coupon' ? 'menber_task_coupon.png' : 'menber_task_point.png'}
                          mode='aspectFit'
                        />
                        <Text className='page-task-history__reward-txt'>{r.text}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <Text
                  className={classNames('page-task-history__status', {
                    'is-pending': pending
                  })}
                >
                  {statusText}
                </Text>
              </View>
            </View>
          )
        })}
      </View>
    </SpPage>
  )
}

TaskHistory.options = {
  addGlobalClass: true
}

export default TaskHistory
