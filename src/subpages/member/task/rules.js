/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 *
 * 任务规则 — Figma 1300:13548
 * 无独立 API：展示列表项 task_rule（经页面参数 / 缓存传入）
 */
import React, { useEffect } from 'react'
import { useImmer } from 'use-immer'
import Taro, { getCurrentInstance } from '@tarojs/taro'
import { View, ScrollView, RichText, Text } from '@tarojs/components'
import { SpPage } from '@/components'
import { isWeb, isAlipay, htmlStringToNodeArray } from '@/utils'
import { useTranslation, $t } from '@/i18n'
import './rules.scss'

const TASK_RULE_STORAGE_KEY = 'MEMBER_TASK_RULE_HTML'

const initialState = {
  content: ''
}

function TaskRules() {
  const { i18n } = useTranslation()
  const [state, setState] = useImmer(initialState)
  const { content } = state

  useEffect(() => {
    Taro.setNavigationBarTitle({ title: $t('5534bb6e.b09129') })
  }, [i18n.language])

  useEffect(() => {
    const params = getCurrentInstance()?.router?.params || {}
    let html = ''
    try {
      html = params.content
        ? decodeURIComponent(params.content)
        : Taro.getStorageSync(TASK_RULE_STORAGE_KEY) || ''
    } catch (e) {
      html = Taro.getStorageSync(TASK_RULE_STORAGE_KEY) || ''
    }
    setState((draft) => {
      draft.content = html || ''
    })
  }, [setState])

  let _content = (content || '')
    .replace(/\s+style="[^"]*"/g, '')
    .replace(/<img/g, '<img style="width:100%;height:auto;display: block;"')

  if (isAlipay) {
    _content = htmlStringToNodeArray(_content)
  }

  return (
    <SpPage className='page-task-rules'>
      <ScrollView className='page-task-rules__scroll' scrollY>
        {!content && (
          <Text className='page-task-rules__empty'>{$t('5534bb6e.3b8bbf')}</Text>
        )}
        {!!content && isWeb && (
          <View dangerouslySetInnerHTML={{ __html: _content }} />
        )}
        {!!content && !isWeb && !isAlipay && <mp-html content={_content} />}
        {!!content && isAlipay && <RichText nodes={_content} />}
      </ScrollView>
    </SpPage>
  )
}

TaskRules.STORAGE_KEY = TASK_RULE_STORAGE_KEY

TaskRules.options = {
  addGlobalClass: true
}

export default TaskRules
