/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 *
 * 会员任务字段映射（ECX-10434 MemberTaskFrontListItem / ParticipationItem）
 * 对齐 GET /promotion/member-tasks 实返结构
 */
import { $t } from '@/i18n'

/** 会员维状态：todo | pending_reward | rewarded | reward_failed */
export const TASK_STATUS = {
  todo: 'todo',
  pending_reward: 'pending_reward',
  rewarded: 'rewarded',
  reward_failed: 'reward_failed'
}

function formatTimeRange(item = {}) {
  const begin = item.begin_time_text || ''
  const end = item.end_time_text || ''
  if (begin && end) return `${begin}-${end}`
  return end || begin || ''
}

function normalizePath(path) {
  if (!path) return ''
  const s = String(path)
  return s.startsWith('/') ? s : `/${s}`
}

/**
 * API rewards: { kind: 'points'|'coupon', points?, title?, coupon_id? }
 * 兼容旧形态: { type, text, value }
 */
function mapRewardItem(r = {}) {
  const kind = r.kind || r.type
  if (kind === 'points' || kind === 'point') {
    const points = Number(r.points != null ? r.points : r.value || 0)
    return {
      type: 'point',
      text: r.text || `+${points}${$t('04a63642.9f68a8')}`,
      value: points
    }
  }
  if (kind === 'coupon') {
    return {
      type: 'coupon',
      text: r.text || r.title || '',
      value: r.coupon_id ?? r.value
    }
  }
  return {
    type: kind || 'point',
    text: r.text || r.title || '',
    value: r.value
  }
}

function mapRewardSummary(reward_summary, rewards) {
  if (Array.isArray(rewards) && rewards.length) {
    return rewards.map(mapRewardItem)
  }
  if (reward_summary) {
    return [{ type: 'point', text: reward_summary }]
  }
  return []
}

/** 任务中心卡片 */
export const TASK_ITEM = {
  taskId: 'task_id',
  name: 'name',
  /** 细类优先，供去完成路由 / 图标 */
  type: ({ type_detail, type_category }) => type_detail || type_category || '',
  typeCategory: 'type_category',
  typeDetail: 'type_detail',
  /** Figma 副标题 */
  typeLabel: 'type_label',
  /** 卡片展开多行：Admin 任务规则 HTML/文案 */
  desc: 'task_rule',
  taskRule: 'task_rule',
  status: ({ user_task_status }) => user_task_status || TASK_STATUS.todo,
  displayStatus: 'display_status',
  /** 按钮下方频次文案，缺省回退活动时间 */
  subText: (item) => item.frequency_text || formatTimeRange(item),
  frequencyType: 'frequency_type',
  frequencyPeriod: 'frequency_period',
  frequencyText: 'frequency_text',
  rewards: ({ reward_summary, rewards }) => mapRewardSummary(reward_summary, rewards),
  rewardSummary: 'reward_summary',
  share: ({ share_cover, share_title, share_jump_page, share }) => {
    if (share) return share
    if (!share_cover && !share_title && !share_jump_page) return null
    return {
      cover: share_cover || '',
      title: share_title || '',
      path: normalizePath(share_jump_page)
    }
  },
  /** 浏览任务：接口扁平 page / stay_seconds */
  browse: ({ browse, page, stay_seconds }) => {
    if (browse) return browse
    if (page == null && stay_seconds == null) return null
    return {
      /** 跳转用（带 /） */
      page_path: normalizePath(page),
      /** 上报用（与契约一致，无前导 /） */
      page: page ? String(page).replace(/^\//, '') : '',
      stay_seconds: stay_seconds != null ? Number(stay_seconds) : 0
    }
  },
  jumpUrl: ({ jump_page, jump_url, page }) =>
    normalizePath(jump_page || jump_url || page || ''),
  startTime: 'begin_time',
  endTime: 'end_time',
  beginTimeText: 'begin_time_text',
  endTimeText: 'end_time_text'
}

/**
 * 历史参与流水
 * 对齐 GET /promotion/member-tasks/participations list item：
 * completion_id / task_id / name / type_label / completed_at(_text) /
 * grant_status / user_task_status / grant_status_text / rewards[{kind,...}]
 */
export const HISTORY_ITEM = {
  completionId: 'completion_id',
  taskId: 'task_id',
  name: 'name',
  typeLabel: 'type_label',
  finishedAt: ({ completed_at_text, finished_at }) =>
    completed_at_text || finished_at || '',
  completedAt: 'completed_at',
  grantStatus: 'grant_status',
  rewardStatus: ({ user_task_status, grant_status }) => {
    if (user_task_status) return user_task_status
    if (grant_status === 'granted') return TASK_STATUS.rewarded
    if (grant_status === 'failed') return TASK_STATUS.reward_failed
    return TASK_STATUS.pending_reward
  },
  grantStatusText: 'grant_status_text',
  rewardSummary: 'reward_summary',
  rewards: ({ reward_summary, rewards }) => mapRewardSummary(reward_summary, rewards)
}

export const CENTER_DATA = {
  list: ({ list = [] }) => list,
  totalCount: 'total_count'
}
