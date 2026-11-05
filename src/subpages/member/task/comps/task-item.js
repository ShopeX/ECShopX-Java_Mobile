/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import React, { useMemo, useState } from 'react'
import { View, Text, Button } from '@tarojs/components'
import { classNames } from '@/utils'
import { $t } from '@/i18n'
import { SpImage } from '@/components'
import { TASK_STATUS } from '@/subpages/doc/task'
import { isShareTaskType } from '../goComplete'
import './task-item.scss'

const TYPE_ICON = {
  consume_once: 'icon-consume.svg',
  first_order: 'icon-consume.svg',
  consume_sum: 'icon-consume.svg',
  /** 接口 type_detail */
  single_spend: 'icon-consume.svg',
  total_spend: 'icon-consume.svg',
  invite_register: 'icon-share.svg',
  share_order: 'icon-share.svg',
  favorite: 'icon-fav.svg',
  browse: 'icon-browse.svg',
  signin: 'icon-signin.svg',
  /** 新人任务 / 填写个人信息 */
  profile: 'icon-signin.svg'
}

const STATUS_META = {
  [TASK_STATUS.todo]: { key: '04a63642.05b0a1', kind: 'primary' },
  [TASK_STATUS.pending_reward]: { key: '04a63642.e466af', kind: 'outline' },
  [TASK_STATUS.rewarded]: { key: '04a63642.23ac56', kind: 'done' },
  [TASK_STATUS.reward_failed]: { key: '04a63642.274500', kind: 'disabled' }
}

function TaskItem({ item, onAction, onSharePrepare, shareEnabled }) {
  const [expanded, setExpanded] = useState(false)
  const statusMeta = STATUS_META[item.status] || STATUS_META[TASK_STATUS.todo]
  const canAction = item.status === TASK_STATUS.todo
  const typeIcon = TYPE_ICON[item.type] || 'icon-consume.svg'
  const useShareBtn = canAction && shareEnabled && isShareTaskType(item.type)

  const descNeedExpand = useMemo(() => {
    const desc = item.desc || ''
    return desc.length > 36
  }, [item.desc])

  const handleBtn = () => {
    if (!canAction) return
    onAction && onAction(item)
  }

  const handleShareClick = () => {
    onSharePrepare && onSharePrepare(item)
  }

  const btnClass = classNames('comp-task-item__btn', `is-${statusMeta.kind}`, {
    'is-clickable': canAction,
    'is-share-native': useShareBtn
  })

  return (
    <View className='comp-task-item'>
      <View className='comp-task-item__main'>
        <View className='comp-task-item__icon-wrap'>
          <SpImage className='comp-task-item__icon' src={typeIcon} mode='aspectFit' />
        </View>
        <View className='comp-task-item__body'>
          <View className='comp-task-item__title'>{item.name}</View>
          <View className='comp-task-item__rewards'>
            {(item.rewards || []).map((r, idx) => (
              <View className='comp-task-item__reward' key={`reward_${idx}`}>
                <SpImage
                  className='comp-task-item__reward-icon'
                  src={r.type === 'coupon' ? 'menber_task_coupon.png' : 'menber_task_point.png'}
                  mode='aspectFit'
                />
                <Text className='comp-task-item__reward-txt'>{r.text}</Text>
              </View>
            ))}
          </View>
          <View className='comp-task-item__desc-wrap'>
            <Text
              className={classNames('comp-task-item__desc', {
                'is-expanded': expanded
              })}
            >
              {item.desc}
            </Text>
            {descNeedExpand && (
              <View
                className='comp-task-item__expand'
                onClick={() => setExpanded((v) => !v)}
              >
                <Text className='comp-task-item__expand-txt'>
                  {expanded ? $t('04a63642.def9e9') : $t('04a63642.e2edde')}
                </Text>
                <SpImage
                  className='comp-task-item__expand-icon'
                  src={expanded ? 'icon-collapse.svg' : 'icon-expand.svg'}
                  mode='aspectFit'
                />
              </View>
            )}
          </View>
        </View>
      </View>
      <View className='comp-task-item__action'>
        {useShareBtn ? (
          <Button className={btnClass} openType='share' onClick={handleShareClick}>
            <Text className='comp-task-item__btn-txt'>{$t(statusMeta.key)}</Text>
          </Button>
        ) : (
          <View className={btnClass} onClick={handleBtn}>
            <Text className='comp-task-item__btn-txt'>{$t(statusMeta.key)}</Text>
          </View>
        )}
        {!!item.subText && (
          <Text className='comp-task-item__sub'>{item.subText}</Text>
        )}
      </View>
    </View>
  )
}

TaskItem.options = {
  addGlobalClass: true
}

export default TaskItem
