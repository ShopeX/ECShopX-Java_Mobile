/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 *
 * 会员任务字段映射（ECX-10434 / MemberTaskFrontListItem）
 */

/** 会员维状态：todo | pending_reward | rewarded | reward_failed */
export const TASK_STATUS = {
  todo: 'todo',
  pending_reward: 'pending_reward',
  rewarded: 'rewarded',
  reward_failed: 'reward_failed',
  /** 旧 mock 态，兼容历史页 */
  signed: 'signed',
  not_achieved: 'not_achieved'
}

export const REWARD_ITEM = {
  type: 'type',
  text: 'text',
  value: 'value'
}

function formatSubText(item = {}) {
  const begin = item.begin_time_text || ''
  const end = item.end_time_text || ''
  if (begin && end) return `${begin}-${end}`
  return end || begin || ''
}

/** 列表项：契约字段 → 页面字段 */
export const TASK_ITEM = {
  taskId: 'task_id',
  name: 'name',
  /** 细类优先，供去完成路由 / 图标 */
  type: ({ type_detail, type_category }) => type_detail || type_category || '',
  typeCategory: 'type_category',
  typeDetail: 'type_detail',
  typeLabel: 'type_label',
  desc: ({ type_label, reward_summary }) => type_label || reward_summary || '',
  status: ({ user_task_status, status }) =>
    user_task_status || status || TASK_STATUS.todo,
  displayStatus: 'display_status',
  subText: (item) => formatSubText(item),
  /** 契约为 reward_summary 文案；UI 仍按 rewards[] 渲染 */
  rewards: ({ reward_summary, rewards }) => {
    if (Array.isArray(rewards) && rewards.length) {
      return rewards.map((r) => ({
        type: r.type,
        text: r.text,
        value: r.value
      }))
    }
    if (reward_summary) {
      return [{ type: 'point', text: reward_summary }]
    }
    return []
  },
  rewardSummary: 'reward_summary',
  share: ({ share }) => share || null,
  browse: ({ browse }) => browse || null,
  signin: ({ signin }) => signin || null,
  jumpUrl: ({ jump_page, jump_url }) => jump_page || jump_url || '',
  startTime: ({ begin_time, start_time }) => begin_time ?? start_time,
  endTime: ({ end_time }) => end_time,
  beginTimeText: 'begin_time_text',
  endTimeText: 'end_time_text'
}

export const HISTORY_ITEM = {
  taskId: 'task_id',
  name: 'name',
  finishedAt: 'finished_at',
  rewardStatus: ({ reward_status, user_task_status }) =>
    reward_status || user_task_status || TASK_STATUS.pending_reward,
  rewards: ({ rewards = [], reward_summary }) => {
    if (Array.isArray(rewards) && rewards.length) {
      return rewards.map((r) => ({
        type: r.type,
        text: r.text,
        value: r.value
      }))
    }
    if (reward_summary) {
      return [{ type: 'point', text: reward_summary }]
    }
    return []
  }
}

export const CENTER_DATA = {
  list: ({ list = [] }) => list,
  totalCount: 'total_count'
}
