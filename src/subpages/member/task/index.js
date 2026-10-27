/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 *
 * 任务中心 — Figma 1300:13737（ECX-10436 / F-069）
 */
import React, { useRef } from 'react'
import { useSelector } from 'react-redux'
import { useImmer } from 'use-immer'
import Taro, { useDidShow, useShareAppMessage } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { SpPage, SpNote } from '@/components'
import SpImage from '@/components/sp-image'
import api from '@/api'
import doc from '@/subpages/doc'
import { pickBy, thousandthFormat } from '@/utils'
import { useTranslation, $t } from '@/i18n'
import TaskItem from './comps/task-item'
import { goComplete, buildTaskShareMessage, isShareTaskType } from './goComplete'
import './index.scss'

const initialState = {
  point: 0,
  list: [],
  loading: true
}

function TaskCenter() {
  useTranslation()
  const [state, setState] = useImmer(initialState)
  const { point, list, loading } = state
  const userInfo = useSelector((s) => s.user?.userInfo)
  const shareTaskRef = useRef(null)

  useDidShow(() => {
    fetchCenter()
  })

  useShareAppMessage(() => {
    const task = shareTaskRef.current
    if (task) return buildTaskShareMessage(task)
    return {
      title: $t('4062a4c0.2488f5'),
      path: '/subpages/member/task/index'
    }
  })

  const fetchCenter = async () => {
    setState((draft) => {
      draft.loading = true
    })
    try {
      // 列表契约无积分字段，积分取会员资产
      const [res, assets] = await Promise.all([
        api.task.getCenterList(),
        api.member.memberAssets().catch(() => null)
      ])
      const nList = pickBy(res?.list || [], doc.task.TASK_ITEM)
      setState((draft) => {
        draft.point = thousandthFormat(
          assets?.point_total_count ?? assets?.point ?? res?.point ?? 0
        )
        draft.list = nList
        draft.loading = false
      })
    } catch (e) {
      setState((draft) => {
        draft.loading = false
        draft.list = []
      })
    }
  }

  const onGoRules = () => {
    // 规则无独立 API：汇总当前列表 task_rule 供规则页展示
    const html = (list || [])
      .map((item) => item.taskRule || item.desc || '')
      .filter(Boolean)
      .join('')
    try {
      Taro.setStorageSync('MEMBER_TASK_RULE_HTML', html)
    } catch (e) {
      // ignore
    }
    Taro.navigateTo({ url: '/subpages/member/task/rules' })
  }

  const onGoHistory = () => {
    Taro.navigateTo({ url: '/subpages/member/task/history' })
  }

  const onSharePrepare = (item) => {
    shareTaskRef.current = item
  }

  const onAction = async (item) => {
    if (!userInfo?.user_id) {
      Taro.showToast({ title: $t('4062a4c0.8d2433'), icon: 'none' })
      return
    }
    // 分享类已登录时由 Button open-type=share 处理；此处仅兜底
    if (isShareTaskType(item.type)) {
      shareTaskRef.current = item
    }
    await goComplete(item)
  }

  return (
    <SpPage className='page-task-center' title={$t('4062a4c0.2488f5')} scrollToTopBtn immersive>
      <View className='page-task-center__hero'>
        <SpImage src='menber_task_bg.png' mode='aspectFit' />
   
        <View className='page-task-center__rules-entry' onClick={onGoRules}>
          <SpImage className='page-task-center__rules-icon' src='menber_task_info_outline.png' mode='aspectFit' />
          <Text className='page-task-center__rules-txt'>{$t('4062a4c0.b0fae0')}</Text>
        </View>
      </View>

      <View className='page-task-center__panel'>
        <View className='page-task-center__point-bar'>
          <View className='page-task-center__point-left'>
            <Text className='page-task-center__point-label'>{$t('4062a4c0.89438c')}</Text>
            <Text className='page-task-center__point-num'>{point}</Text>
          </View>
          <View className='page-task-center__history-entry' onClick={onGoHistory}>
            <Text className='page-task-center__history-txt'>{$t('4062a4c0.d00ae1')}</Text>
            <SpImage
              className='page-task-center__history-chevron'
              src='icon-chevron.svg'
              mode='aspectFit'
            />
          </View>
        </View>

        {!loading && list.length === 0 && (
          <View className='page-task-center__empty'>
            <SpNote>{$t('4062a4c0.0589e5')}</SpNote>
          </View>
        )}

        {list.map((item) => (
          <TaskItem
            key={item.taskId}
            item={item}
            onAction={onAction}
            onSharePrepare={onSharePrepare}
            shareEnabled={!!userInfo?.user_id}
          />
        ))}
      </View>
    </SpPage>
  )
}

TaskCenter.options = {
  addGlobalClass: true
}

export default TaskCenter
