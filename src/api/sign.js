/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 *
 * 联调前使用本地 mock；接口就绪后将 USE_SIGN_MOCK 设为 false，并改用真实路径。
 */
import dayjs from 'dayjs'
import { pickBy } from '@/utils'
import {
  SIGN_PAGE_MAPPING,
  SIGN_RESULT_MAPPING,
  SIGN_MONTH_DAY_MAPPING,
  SIGN_REWARD_RECORD_MAPPING
} from '@/doc/sign'
import req from './req'

/** 联调开关：true=本地 mock，false=走真实接口 */
export const USE_SIGN_MOCK = true

const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const WEEKDAY_POINTS = [1, 1, 1, 1, 1, 5, 5]

let mockState = {
  todaySigned: false,
  remindEnabled: false,
  // mock：累计 6，签到一次到 7 天可预览「券+积分」弹窗
  cumulativeDays: 6,
  signedDates: {},
  rewardRecords: [
    {
      id: 'r1',
      title: '累计签到满3天',
      created_at: '2025-06-18 18:09:56',
      rewards: [
        { type: 'point', name: '积分', amount: 500 },
        { type: 'coupon', name: '满500减60元券', amount: 0 }
      ]
    },
    {
      id: 'r2',
      title: '签到',
      created_at: '2025-06-18 18:09:56',
      rewards: [{ type: 'point', name: '积分', amount: 10 }]
    },
    {
      id: 'r3',
      title: '签到',
      created_at: '2025-06-17 09:12:01',
      rewards: [{ type: 'point', name: '积分', amount: 10 }]
    }
  ]
}

function shanghaiNow() {
  // 业务归属统一按北京时间；dayjs 无插件时用本地偏移近似，联调以服务端为准
  return dayjs()
}

function startOfWeekMonday(d) {
  const day = d.day() // 0=Sun
  const diff = day === 0 ? -6 : 1 - day
  return d.add(diff, 'day').startOf('day')
}

function buildWeekDays(todaySigned) {
  const today = shanghaiNow().startOf('day')
  const monday = startOfWeekMonday(today)
  const todayIndex = today.diff(monday, 'day')
  const signedSet = { ...mockState.signedDates }

  // 演示数据：今天之前尽量「已签 + 漏签」各至少一天，方便预览漏签样式
  for (let i = 0; i < todayIndex; i++) {
    const key = monday.add(i, 'day').format('YYYY-MM-DD')
    if (signedSet[key] !== undefined) continue
    // 昨天漏签，更早的已签
    if (i === todayIndex - 1) {
      signedSet[key] = null
    } else {
      signedSet[key] = { seq: i + 1, points: WEEKDAY_POINTS[i] }
    }
  }

  // 周一/周二时本周过去日不足：强制「周一已签、周二漏签」便于预览
  if (todayIndex < 2) {
    const monKey = monday.format('YYYY-MM-DD')
    const tueKey = monday.add(1, 'day').format('YYYY-MM-DD')
    if (todayIndex === 0) {
      // 今天周一：仍展示周二为漏签样例（仅 mock）
      if (signedSet[tueKey] === undefined) signedSet[tueKey] = null
    } else {
      // 今天周二：周一漏签
      if (signedSet[monKey] === undefined) signedSet[monKey] = null
    }
  }

  const days = []
  for (let i = 0; i < 7; i++) {
    const date = monday.add(i, 'day')
    const key = date.format('YYYY-MM-DD')
    const isToday = date.isSame(today, 'day')
    const isPast = date.isBefore(today, 'day')
    const record = signedSet[key]
    const hasSignedRecord = !!(record && typeof record === 'object')
    let signed = isToday ? todaySigned || hasSignedRecord : hasSignedRecord
    // 过去未签，或 mock 强制漏签占位（record === null）
    let missed = (isPast && !hasSignedRecord) || (!isToday && record === null && !hasSignedRecord)
    if (signed) missed = false

    days.push({
      date: key,
      weekday: WEEKDAY_LABELS[i],
      is_today: isToday,
      signed,
      missed,
      points: WEEKDAY_POINTS[i],
      activity_seq: signed && record && record.seq != null ? record.seq : null
    })
  }
  return days
}

function buildActivity() {
  const days = mockState.cumulativeDays
  return {
    id: 'act-1',
    name: '累计签到奖励',
    start_at: '2026.09.08',
    end_at: '2026.09.22',
    cumulative_days: days,
    tiers: [
      {
        id: 't3',
        days_required: 3,
        status: days >= 3 ? 'granted' : 'pending',
        rewards: [{ type: 'point', name: '积分', amount: 100 }]
      },
      {
        id: 't7',
        days_required: 7,
        status: days >= 7 ? 'granted' : 'pending',
        rewards: [
          { type: 'coupon', name: '立减5元券', amount: 0 },
          { type: 'point', name: '积分', amount: 200 }
        ]
      },
      {
        id: 't15',
        days_required: 15,
        status: days >= 15 ? 'granted' : 'pending',
        rewards: [
          { type: 'coupon', name: '满500减60元券', amount: 0 },
          { type: 'point', name: '积分', amount: 300 }
        ]
      },
      {
        id: 't30',
        days_required: 30,
        status: days >= 30 ? 'granted' : 'pending',
        rewards: [{ type: 'coupon', name: '立减50元券', amount: 0 }]
      }
    ]
  }
}

function mockDelay(ms = 280) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function buildPagePayload() {
  const now = shanghaiNow()
  return {
    month_title: `${now.month() + 1}月签到`,
    cumulative_days: mockState.cumulativeDays,
    today_signed: mockState.todaySigned,
    remind_enabled: mockState.remindEnabled,
    rules:
      '1. 每日签到可获得对应星期积分；\n2. 活动期内累计签到可领取阶梯奖励；\n3. 漏签不重置累计次数，活动结束后不再累计。',
    week_days: buildWeekDays(mockState.todaySigned),
    activity: buildActivity()
  }
}

/** 签到页聚合：周历 + 活动进度 + 提醒状态 */
export async function getSignPage(params = {}) {
  if (USE_SIGN_MOCK) {
    await mockDelay()
    return pickBy(buildPagePayload(), SIGN_PAGE_MAPPING)
  }
  const data = await req.get('/wxapp/member/sign/page', params)
  return pickBy(data || {}, SIGN_PAGE_MAPPING)
}

/** 提交签到 */
export async function submitSign(data = {}) {
  if (USE_SIGN_MOCK) {
    await mockDelay(400)
    if (mockState.todaySigned) {
      const err = new Error('今日已签到')
      err.code = 'ALREADY_SIGNED'
      throw err
    }
    const today = shanghaiNow()
    const weekdayIndex = (() => {
      const d = today.day()
      return d === 0 ? 6 : d - 1
    })()
    const dailyPoints = WEEKDAY_POINTS[weekdayIndex]
    mockState.todaySigned = true
    mockState.cumulativeDays += 1
    const key = today.format('YYYY-MM-DD')
    mockState.signedDates[key] = {
      seq: mockState.cumulativeDays,
      points: dailyPoints
    }
    const rewards = []
    if (dailyPoints > 0) {
      rewards.push({ type: 'point', name: '积分', amount: dailyPoints, status: 'granted' })
      mockState.rewardRecords.unshift({
        id: `daily-${Date.now()}`,
        title: '签到',
        created_at: today.format('YYYY-MM-DD HH:mm:ss'),
        rewards: [{ type: 'point', name: '积分', amount: dailyPoints }]
      })
    }
    const activity = buildActivity()
    activity.tiers.forEach((tier) => {
      if (tier.status === 'granted' && tier.days_required === mockState.cumulativeDays) {
        rewards.push(
          ...tier.rewards.map((r) => ({
            ...r,
            status: 'granted'
          }))
        )
        mockState.rewardRecords.unshift({
          id: `tier-${tier.id}-${Date.now()}`,
          title: `累计签到满${tier.days_required}天`,
          created_at: today.format('YYYY-MM-DD HH:mm:ss'),
          rewards: tier.rewards
        })
      }
    })
    return pickBy(
      {
        daily_points: dailyPoints,
        activity_seq: mockState.cumulativeDays,
        rewards
      },
      SIGN_RESULT_MAPPING
    )
  }
  const res = await req.post('/wxapp/member/sign', data)
  return pickBy(res || {}, SIGN_RESULT_MAPPING)
}

/** 按月查询签到记录 */
export async function getSignMonthRecords(params = {}) {
  const month = params.month || shanghaiNow().format('YYYY-MM')
  if (USE_SIGN_MOCK) {
    await mockDelay()
    const start = dayjs(`${month}-01`)
    const daysInMonth = start.daysInMonth()
    const today = shanghaiNow().startOf('day')
    // 对齐周一开头：补齐上月末
    const startWeekday = start.day() === 0 ? 6 : start.day() - 1
    // 演示：本月部分日期已签（含积分 / 已签文案），贴近设计稿 1:303
    const demoSigned = {}
    if (month === today.format('YYYY-MM')) {
      const seedSigned = (offset, points, seq) => {
        const date = today.subtract(offset, 'day')
        if (date.format('YYYY-MM') !== month) return
        demoSigned[date.format('YYYY-MM-DD')] = { points, seq }
      }
      // 有积分
      seedSigned(1, 1, 1)
      seedSigned(2, 1, 2)
      seedSigned(3, 5, 3)
      seedSigned(5, 1, 4)
      seedSigned(6, 1, 5)
      seedSigned(7, 10, 6)
      // 「已签」无积分展示
      seedSigned(8, 0, 7)
      seedSigned(10, 0, 8)
      seedSigned(11, 0, 9)
      seedSigned(12, 0, 10)
    }
    const cells = []
    for (let i = 0; i < startWeekday; i++) {
      cells.push({
        day: 0,
        date: '',
        signed: false,
        points: 0,
        is_future: false,
        in_month: false
      })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date = start.date(d)
      const key = date.format('YYYY-MM-DD')
      const isFuture = date.isAfter(today, 'day')
      const record = mockState.signedDates[key] || demoSigned[key]
      const hasSignedRecord = !!(record && typeof record === 'object')
      const isToday = date.isSame(today, 'day')
      const signed = isToday
        ? mockState.todaySigned || hasSignedRecord
        : hasSignedRecord && !isFuture
      cells.push({
        day: d,
        date: key,
        signed: !!signed && !isFuture,
        points: signed
          ? record?.points != null
            ? record.points
            : WEEKDAY_POINTS[(date.day() + 6) % 7]
          : 0,
        is_future: isFuture,
        in_month: true
      })
    }
    return {
      month,
      list: cells.map((item) => pickBy(item, SIGN_MONTH_DAY_MAPPING))
    }
  }
  const data = await req.get('/wxapp/member/sign/month', params)
  return {
    month: data?.month || month,
    list: (data?.list || []).map((item) => pickBy(item, SIGN_MONTH_DAY_MAPPING))
  }
}

/** 领奖记录 */
export async function getSignRewardRecords(params = {}) {
  if (USE_SIGN_MOCK) {
    await mockDelay()
    return {
      list: mockState.rewardRecords.map((item) => pickBy(item, SIGN_REWARD_RECORD_MAPPING))
    }
  }
  const data = await req.get('/wxapp/member/sign/reward-records', params)
  return {
    list: (data?.list || []).map((item) => pickBy(item, SIGN_REWARD_RECORD_MAPPING))
  }
}

/** 漏签提醒开关 */
export async function updateSignRemind(payload = {}) {
  const enabled = !!payload.enabled
  if (USE_SIGN_MOCK) {
    await mockDelay(200)
    mockState.remindEnabled = enabled
    return { remind_enabled: mockState.remindEnabled }
  }
  const data = await req.post('/wxapp/member/sign/remind', payload)
  return { remind_enabled: !!(data?.remind_enabled ?? enabled) }
}
