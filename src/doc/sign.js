/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */

export const SIGN_WEEK_DAY_MAPPING = {
  date: 'date',
  weekday: 'weekday',
  isToday: 'is_today',
  signed: 'signed',
  missed: 'missed',
  points: ({ points }) => Number(points || 0),
  activitySeq: ({ activity_seq, activitySeq }) =>
    activity_seq != null ? Number(activity_seq) : activitySeq != null ? Number(activitySeq) : null
}

export const SIGN_TIER_MAPPING = {
  id: 'id',
  daysRequired: 'days_required',
  status: 'status', // pending | granted | failed
  rewards: ({ rewards = [] }) =>
    (rewards || []).map((item) => ({
      type: item.type,
      name: item.name || '',
      amount: item.amount != null ? Number(item.amount) : 0
    }))
}

export const SIGN_ACTIVITY_MAPPING = {
  id: 'id',
  name: 'name',
  startAt: 'start_at',
  endAt: 'end_at',
  cumulativeDays: ({ cumulative_days }) => Number(cumulative_days || 0),
  tiers: ({ tiers = [] }) =>
    (tiers || []).map((tier) => ({
      id: tier.id,
      daysRequired: Number(tier.days_required || 0),
      status: tier.status || 'pending',
      rewards: (tier.rewards || []).map((item) => ({
        type: item.type,
        name: item.name || '',
        amount: item.amount != null ? Number(item.amount) : 0
      }))
    }))
}

export const SIGN_PAGE_MAPPING = {
  monthTitle: 'month_title',
  cumulativeDays: ({ cumulative_days }) => Number(cumulative_days || 0),
  todaySigned: 'today_signed',
  remindEnabled: 'remind_enabled',
  rules: 'rules',
  weekDays: ({ week_days = [] }) =>
    (week_days || []).map((day) => ({
      date: day.date,
      weekday: day.weekday,
      isToday: !!day.is_today,
      signed: !!day.signed,
      missed: !!day.missed,
      points: Number(day.points || 0),
      activitySeq: day.activity_seq != null ? Number(day.activity_seq) : null
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
        status: tier.status || 'pending',
        rewards: (tier.rewards || []).map((item) => ({
          type: item.type,
          name: item.name || '',
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
      type: item.type,
      name: item.name || '',
      amount: item.amount != null ? Number(item.amount) : 0,
      status: item.status || 'granted'
    }))
}

export const SIGN_MONTH_DAY_MAPPING = {
  day: 'day',
  date: 'date',
  signed: 'signed',
  points: ({ points }) => Number(points || 0),
  isFuture: 'is_future',
  inMonth: 'in_month'
}

export const SIGN_REWARD_RECORD_MAPPING = {
  id: 'id',
  title: 'title',
  createdAt: 'created_at',
  rewards: ({ rewards = [] }) =>
    (rewards || []).map((item) => ({
      type: item.type,
      name: item.name || '',
      amount: item.amount != null ? Number(item.amount) : 0
    }))
}
