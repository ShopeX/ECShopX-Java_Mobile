/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 *
 * 会员签到字段映射（对齐 VshopAPI member-signin）
 */
import dayjs from 'dayjs'

/** API reward type: points|coupon → 页面 point|coupon */
export function mapRewardItemType(type) {
  if (type === 'points' || type === 'point') return 'point'
  if (type === 'coupon') return 'coupon'
  return type || 'point'
}

/** API tier status → 页面 status */
export function mapTierStatus(status) {
  if (status === 'granted') return 'granted'
  if (status === 'failed') return 'failed'
  // not_reached | processing
  return 'pending'
}

export function formatSignTime(created) {
  if (created == null || created === '') return ''
  if (typeof created === 'string' && created.includes('-')) return created
  const n = Number(created)
  if (!Number.isNaN(n) && n > 0) {
    const ms = n < 1e12 ? n * 1000 : n
    return dayjs(ms).format('YYYY-MM-DD HH:mm:ss')
  }
  return String(created)
}

export const SIGN_WEEK_DAY_MAPPING = {
  date: 'date',
  weekday: 'weekday',
  isToday: 'is_today',
  signed: 'signed',
  missed: 'missed',
  points: ({ points, daily_points }) =>
    Number(points != null ? points : daily_points || 0),
  activitySeq: ({ activity_seq, activitySeq }) =>
    activity_seq != null ? Number(activity_seq) : activitySeq != null ? Number(activitySeq) : null,
  display: 'display'
}

export const SIGN_TIER_MAPPING = {
  id: 'id',
  daysRequired: 'days_required',
  status: ({ status }) => mapTierStatus(status),
  rewards: ({ rewards = [] }) =>
    (rewards || []).map((item) => ({
      type: mapRewardItemType(item.type),
      name: item.name || item.title || '',
      amount: item.amount != null ? Number(item.amount) : 0
    }))
}

export const SIGN_ACTIVITY_MAPPING = {
  id: 'id',
  name: 'name',
  startAt: 'start_at',
  endAt: 'end_at',
  cumulativeDays: ({ cumulative_days, progress_count }) =>
    Number(cumulative_days != null ? cumulative_days : progress_count || 0),
  tiers: ({ tiers = [] }) =>
    (tiers || []).map((tier) => ({
      id: tier.id != null ? String(tier.id) : String(tier.tier_count ?? ''),
      daysRequired: Number(tier.days_required != null ? tier.days_required : tier.tier_count || 0),
      status: mapTierStatus(tier.status),
      rewards: (tier.rewards || []).map((item) => ({
        type: mapRewardItemType(item.type),
        name: item.name || item.title || '',
        amount: item.amount != null ? Number(item.amount) : 0
      }))
    }))
}

export const SIGN_PAGE_MAPPING = {
  monthTitle: 'month_title',
  cumulativeDays: ({ cumulative_days }) => Number(cumulative_days || 0),
  todaySigned: 'today_signed',
  subscribed: 'subscribed',
  rules: 'rules',
  weekDays: ({ week_days = [] }) =>
    (week_days || []).map((day) => ({
      date: day.date,
      weekday: day.weekday,
      isToday: !!day.is_today,
      signed: !!day.signed,
      missed: !!day.missed,
      points: Number(day.points || 0),
      activitySeq: day.activity_seq != null ? Number(day.activity_seq) : null,
      display: day.display || null
    })),
  activity: ({ activity }) => {
    if (!activity) return null
    return {
      id: activity.id,
      name: activity.name,
      startAt: activity.start_at,
      endAt: activity.end_at,
      cumulativeDays: Number(activity.cumulative_days || 0),
      tiers: (activity.tiers || []).map((tier) => ({
        id: tier.id,
        daysRequired: Number(tier.days_required || 0),
        status: mapTierStatus(tier.status),
        rewards: (tier.rewards || []).map((item) => ({
          type: mapRewardItemType(item.type),
          name: item.name || item.title || '',
          amount: item.amount != null ? Number(item.amount) : 0
        }))
      }))
    }
  }
}

export const SIGN_RESULT_MAPPING = {
  dailyPoints: ({ daily_points }) => Number(daily_points || 0),
  activitySeq: ({ activity_seq }) => (activity_seq != null ? Number(activity_seq) : null),
  rewards: ({ rewards = [] }) =>
    (rewards || []).map((item) => ({
      type: mapRewardItemType(item.type),
      name: item.name || item.title || '',
      amount: item.amount != null ? Number(item.amount) : 0,
      status: item.status || 'granted'
    }))
}

export const SIGN_MONTH_DAY_MAPPING = {
  day: 'day',
  date: 'date',
  signed: 'signed',
  points: ({ points, daily_points }) =>
    Number(points != null ? points : daily_points || 0),
  isFuture: 'is_future',
  inMonth: 'in_month',
  display: 'display',
  dayStatus: 'day_status'
}

export const SIGN_REWARD_RECORD_MAPPING = {
  id: 'id',
  title: 'title',
  createdAt: 'created_at',
  rewards: ({ rewards = [] }) =>
    (rewards || []).map((item) => ({
      type: mapRewardItemType(item.type),
      name: item.name || item.title || '',
      amount: item.amount != null ? Number(item.amount) : 0
    }))
}
