/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 *
 * 会员任务字段映射（ECX-10436 / F-069）
 */

/** 任务状态：todo 去完成 | pending_reward 待发奖 | rewarded 已发奖 | signed 已签到 | not_achieved 未达成 */
export const TASK_STATUS = {
  todo: 'todo',
  pending_reward: 'pending_reward',
  rewarded: 'rewarded',
  signed: 'signed',
  not_achieved: 'not_achieved'
}

export const REWARD_ITEM = {
  type: 'type',
  text: 'text',
  value: 'value'
}

export const TASK_ITEM = {
  taskId: 'task_id',
  activityId: 'activity_id',
  name: 'name',
  type: 'type',
  desc: 'desc',
  status: ({ status }) => status || TASK_STATUS.todo,
  subText: 'sub_text',
  progress: ({ progress }) => progress || { current: 0, target: 1 },
  rewards: ({ rewards = [] }) => rewards.map((r) => ({
    type: r.type,
    text: r.text,
    value: r.value
  })),
  share: ({ share }) => share || null,
  browse: ({ browse }) => browse || null,
  signin: ({ signin }) => signin || null,
  jumpUrl: 'jump_url',
  startTime: 'start_time',
  endTime: 'end_time',
  visible: ({ visible }) => visible !== false
}

export const HISTORY_ITEM = {
  taskId: 'task_id',
  name: 'name',
  finishedAt: 'finished_at',
  rewardStatus: ({ reward_status }) => reward_status || TASK_STATUS.pending_reward,
  rewards: ({ rewards = [] }) => rewards.map((r) => ({
    type: r.type,
    text: r.text,
    value: r.value
  }))
}

export const CENTER_DATA = {
  point: ({ point }) => Number(point) || 0,
  list: ({ list = [] }) => list,
  totalCount: 'total_count'
}
