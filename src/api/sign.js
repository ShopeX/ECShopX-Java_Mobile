/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 *
 * 契约：/promotion/member-signin/*（VshopAPI 会员签到）
 */
import dayjs from 'dayjs'
import { pickBy } from '@/utils'
import {
  SIGN_PAGE_MAPPING,
  SIGN_RESULT_MAPPING,
  SIGN_MONTH_DAY_MAPPING,
  SIGN_REWARD_RECORD_MAPPING,
  mapRewardItemType,
  mapTierStatus,
  formatSignTime
} from '@/doc/sign'
import req from './req'

const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const BASE = '/promotion/member-signin'

/** 兼容 { data } 二次包裹与直出 payload */
function unwrap(res) {
  if (!res || typeof res !== 'object') return {}
  if (res.data && typeof res.data === 'object' && !Array.isArray(res.data)) {
    const inner = res.data
    if (
      inner.days ||
      inner.list ||
      inner.activity !== undefined ||
      inner.signed_today !== undefined ||
      inner.enabled !== undefined ||
      inner.subscribed !== undefined ||
      inner.progress_count !== undefined ||
      inner.week_start ||
      inner.month
    ) {
      return inner
    }
  }
  return res
}

function formatTs(ts) {
  if (ts == null || ts === '') return ''
  const n = Number(ts)
  if (!Number.isNaN(n) && n > 0) {
    const ms = n < 1e12 ? n * 1000 : n
    return dayjs(ms).format('YYYY.MM.DD')
  }
  return String(ts)
}

function mapTierFromApi(tier = {}) {
  // 展示顺序对齐设计稿：优惠券在上、积分在下
  const rewards = []
  if (tier.coupon_summary && (tier.coupon_summary.title || tier.coupon_summary.id)) {
    rewards.push({
      type: 'coupon',
      name: tier.coupon_summary.title || '优惠券',
      amount: 0
    })
  }
  if (tier.points_reward) {
    rewards.push({
      type: 'point',
      name: '积分',
      amount: Number(tier.points_reward)
    })
  }
  return {
    id: String(tier.tier_count ?? ''),
    days_required: Number(tier.tier_count || 0),
    status: mapTierStatus(tier.status),
    rewards
  }
}

function composePagePayload(calendar = {}, progress = {}, reminder = {}) {
  const today = dayjs().startOf('day')
  const activityRaw = progress.activity
  const weekDays = (calendar.days || []).map((day) => {
    const date = day.date ? dayjs(day.date) : null
    const isToday = date ? date.isSame(today, 'day') : false
    const isPast = date ? date.isBefore(today, 'day') : false
    // 契约可不返回 weekday：用日期推算 1=Mon … 7=Sun
    let wd = Number(day.weekday || 0)
    if (!wd && date) {
      const d = date.day()
      wd = d === 0 ? 7 : d
    }
    return {
      date: day.date,
      weekday: WEEKDAY_LABELS[wd - 1] || '',
      is_today: isToday,
      signed: !!day.signed,
      missed: !day.signed && isPast,
      points: day.daily_points != null ? Number(day.daily_points) : 0,
      activity_seq: day.activity_seq != null ? Number(day.activity_seq) : null,
      display: day.display || null
    }
  })

  return {
    month_title: `${today.month() + 1}月签到`,
    cumulative_days: Number(
      progress.progress_count ?? activityRaw?.progress_count ?? 0
    ),
    today_signed: !!calendar.signed_today,
    // 按钮展示态：subscribed true →「已订阅」
    subscribed: !!reminder.subscribed,
    // calendar.rule_desc 为 HTML
    rules: calendar.rule_desc || '',
    week_days: weekDays,
    activity: activityRaw
      ? {
          id: activityRaw.id,
          name: activityRaw.name,
          start_at: formatTs(activityRaw.begin_time),
          end_at: formatTs(activityRaw.end_time),
          cumulative_days: Number(activityRaw.progress_count || 0),
          tiers: (activityRaw.tiers || []).map(mapTierFromApi)
        }
      : null
  }
}

function mapSignResult(data = {}) {
  const rewards = []
  if (data.daily_points > 0) {
    rewards.push({
      type: 'point',
      name: '积分',
      amount: Number(data.daily_points),
      status: 'granted'
    })
  }
  ;(data.new_grants || []).forEach((grant) => {
    ;(grant.reward_items || []).forEach((item) => {
      rewards.push({
        type: mapRewardItemType(item.type),
        name: item.title || (mapRewardItemType(item.type) === 'point' ? '积分' : '优惠券'),
        amount: item.amount != null ? Number(item.amount) : 0,
        status: 'granted'
      })
    })
  })
  return pickBy(
    {
      daily_points: data.daily_points,
      activity_seq: data.activity?.progress_count,
      rewards
    },
    SIGN_RESULT_MAPPING
  )
}

function buildMonthCells(month, days = []) {
  const dayMap = {}
  days.forEach((d) => {
    if (d?.date) dayMap[d.date] = d
  })
  const start = dayjs(`${month}-01`)
  const daysInMonth = start.daysInMonth()
  const startWeekday = start.day() === 0 ? 6 : start.day() - 1
  const cells = []
  for (let i = 0; i < startWeekday; i++) {
    cells.push({
      day: 0,
      date: '',
      signed: false,
      points: 0,
      is_future: false,
      in_month: false,
      display: null,
      day_status: ''
    })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = start.date(d).format('YYYY-MM-DD')
    const raw = dayMap[date] || {}
    const status = raw.day_status || ''
    const signed = !!raw.signed || status === 'signed'
    cells.push({
      day: d,
      date,
      signed,
      points: raw.daily_points != null ? Number(raw.daily_points) : 0,
      is_future: status === 'future',
      in_month: true,
      display: raw.display || null,
      day_status: status
    })
  }
  return cells
}

function pickApiErrorMessage(error) {
  const body = error?.res?.data
  return (
    body?.data?.message ||
    body?.msg ||
    body?.message ||
    error?.message ||
    ''
  )
}

/** 签到页聚合：周历 + 活动进度 + 提醒状态 */
export async function getSignPage(params = {}) {
  const [calendarRes, progressRes, reminderRes] = await Promise.all([
    req.get(`${BASE}/calendar`, params),
    req.get(`${BASE}/activity/progress`),
    req.get(`${BASE}/reminder`, { showError: false }).catch(() => null)
  ])
  const payload = composePagePayload(
    unwrap(calendarRes),
    unwrap(progressRes),
    unwrap(reminderRes)
  )
  return pickBy(payload, SIGN_PAGE_MAPPING)
}

/** 提交签到 */
export async function submitSign(data = {}) {
  try {
    const res = await req.post(`${BASE}/sign`, { ...data, showError: false })
    return mapSignResult(unwrap(res))
  } catch (error) {
    const status = error?.res?.statusCode
    const message = pickApiErrorMessage(error) || '签到失败，请重试'
    const err = new Error(message)
    err.res = error?.res
    err.code = status === 409 ? 'ALREADY_SIGNED' : error?.code || status
    throw err
  }
}

/** 按月查询签到记录 */
export async function getSignMonthRecords(params = {}) {
  const month = params.month || dayjs().format('YYYY-MM')
  const data = unwrap(await req.get(`${BASE}/records`, { month }))
  const list = buildMonthCells(data.month || month, data.days || [])
  return {
    month: data.month || month,
    list: list.map((item) => pickBy(item, SIGN_MONTH_DAY_MAPPING))
  }
}

/** 领奖记录 */
export async function getSignRewardRecords(params = {}) {
  const data = unwrap(
    await req.get(`${BASE}/rewards`, {
      page: params.page || 1,
      page_size: params.pageSize || params.page_size || 20,
      activity_id: params.activityId || params.activity_id
    })
  )
  return {
    list: (data.list || []).map((item) =>
      pickBy(
        {
          id: item.id,
          title: item.title,
          created_at: formatSignTime(item.created),
          rewards: (item.reward_items || []).map((r) => ({
            type: mapRewardItemType(r.type),
            name: r.title || (mapRewardItemType(r.type) === 'point' ? '积分' : '优惠券'),
            amount: r.amount != null ? Number(r.amount) : 0
          }))
        },
        SIGN_REWARD_RECORD_MAPPING
      )
    ),
    totalCount: Number(data.total_count || 0),
    page: Number(data.page || 1),
    pageSize: Number(data.page_size || 20)
  }
}

/** 漏签提醒状态 */
export async function getSignReminder() {
  const data = unwrap(await req.get(`${BASE}/reminder`))
  return {
    subscribed: !!data.subscribed
  }
}

/**
 * 订阅授权成功后回写（不支持取消订阅）
 * @param {{ templateId?: string, template_id?: string }} payload
 */
export async function subscribeSignRemind(payload = {}) {
  try {
    const data = unwrap(
      await req.post(`${BASE}/reminder/subscribe-callback`, {
        accepted: true,
        template_id: payload.templateId || payload.template_id || '',
        showError: false
      })
    )
    return {
      subscribed: !!(data.subscribed ?? true)
    }
  } catch (error) {
    const message = pickApiErrorMessage(error) || '设置失败'
    const err = new Error(message)
    err.res = error?.res
    err.code = error?.res?.statusCode
    throw err
  }
}
