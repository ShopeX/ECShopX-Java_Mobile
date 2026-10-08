/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 *
 * 会员任务中心（ECX-10436 / F-069）
 * 接口未就绪时 USE_MOCK=true 走本地 mock，对接 ECX-10434 后关闭。
 */
import req from './req'

/** 接口就绪后改为 false */
const USE_MOCK = true

const MOCK_TASKS = [
  {
    task_id: 't_consume_once',
    activity_id: 'act_1',
    name: '完成单笔消费',
    type: 'consume_once',
    desc: '任务说明最多展示两行内容',
    status: 'todo',
    sub_text: '时间条件',
    progress: { current: 0, target: 1 },
    rewards: [
      { type: 'point', text: '积分+20', value: 20 },
      { type: 'coupon', text: '3件8折券' }
    ],
    jump_url: '/pages/index',
    start_time: 1714939200,
    end_time: 1715976000,
    visible: true
  },
  {
    task_id: 't_first_order',
    activity_id: 'act_1',
    name: '完成首单',
    type: 'first_order',
    desc: '任务说明最多展示两行内容任务说明任务说最多展示两行内容',
    status: 'rewarded',
    sub_text: '05.06-05.18',
    progress: { current: 1, target: 1 },
    rewards: [
      { type: 'point', text: '积分+5', value: 5 },
      { type: 'coupon', text: '立减50券' }
    ],
    jump_url: '',
    start_time: 1714939200,
    end_time: 1715976000,
    visible: true
  },
  {
    task_id: 't_consume_sum',
    activity_id: 'act_1',
    name: '完成累计消费',
    type: 'consume_sum',
    desc:
      '任务说明展开后最多展示十行内容任务说明展开后最多展示十行内容任务说明展开后最多展示十行内容任务说明展开后最多展示十行内容任务说明展开后最多展示十行内容任务说明展开后最多展示十行内容任务说明展开后最多展示十行内容任务说明展开后最多展示十行内容任务说明展开后最多展示十行内容任务说明展开后最多',
    status: 'pending_reward',
    sub_text: '05.06-05.18',
    progress: { current: 1, target: 1 },
    rewards: [{ type: 'point', text: '积分+5', value: 5 }],
    jump_url: '',
    start_time: 1714939200,
    end_time: 1715976000,
    visible: true
  },
  {
    task_id: 't_invite_reg',
    activity_id: 'act_1',
    name: '邀请好友入会',
    type: 'invite_register',
    desc: '任务说明最多展示两行内容',
    status: 'todo',
    sub_text: '今日可领',
    progress: { current: 0, target: 1 },
    rewards: [{ type: 'coupon', text: '美妆品类10元立减券' }],
    share: {
      title: '邀请你加入会员，一起领福利',
      image_url: '',
      path: '/subpages/auth/reg'
    },
    jump_url: '',
    start_time: 1714939200,
    end_time: 1715976000,
    visible: true
  },
  {
    task_id: 't_share_order',
    activity_id: 'act_1',
    name: '分享好友下单',
    type: 'share_order',
    desc:
      '任务说明展开后最多展示十行内容任务说明展开后最多展示十行内容任务说明展开后最多展示十行内容任务说明展开后最多展示十行内容任务说明展开后最多展示十行内容任务说明展开后最多展示十行内容任务说明展开后最多展示十行内容任务说明展开后最多展示十行内容任务说明展开后最多展示十行内容任务说明展开后最多',
    status: 'signed',
    sub_text: '今日可领',
    progress: { current: 1, target: 1 },
    rewards: [
      { type: 'point', text: '积分+20', value: 20 },
      { type: 'coupon', text: '3件8折券' }
    ],
    share: {
      title: '好物分享给你',
      image_url: '',
      path: '/pages/item/espier-detail'
    },
    jump_url: '',
    start_time: 1714939200,
    end_time: 1715976000,
    visible: true
  },
  {
    task_id: 't_fav',
    activity_id: 'act_1',
    name: '收藏',
    type: 'favorite',
    desc:
      '任务说明展开后最多展示十行内容任务说明展开后最多展示十行内容任务说明展开后最多展示十行内容任务说明展开后最多展示十行内容任务说明展开后最多展示十行内容任务说明展开后最多展示十行内容任务说明展开后最多展示十行内容任务说明展开后最多展示十行内容任务说明展开后最多展示十行内容任务说明展开后最多',
    status: 'not_achieved',
    sub_text: '05.06-05.18',
    progress: { current: 0, target: 1 },
    rewards: [{ type: 'coupon', text: '满500减60元券' }],
    jump_url: '/pages/item/list',
    start_time: 1714939200,
    end_time: 1715976000,
    visible: true
  },
  {
    task_id: 't_browse',
    activity_id: 'act_1',
    name: '浏览页面',
    type: 'browse',
    desc: '任务说明最多展示两行内容',
    status: 'todo',
    sub_text: '今日可领',
    progress: { current: 0, target: 1 },
    rewards: [{ type: 'coupon', text: '美妆品类10元立减券' }],
    browse: { page_path: '/pages/index', stay_seconds: 0 },
    jump_url: '/pages/index',
    start_time: 1714939200,
    end_time: 1715976000,
    visible: true
  },
  {
    task_id: 't_signin',
    activity_id: 'act_1',
    name: '签到',
    type: 'signin',
    desc: '任务说明最多展示两行内容',
    status: 'todo',
    sub_text: '今日可领',
    progress: { current: 0, target: 3 },
    rewards: [{ type: 'coupon', text: '美妆品类10元立减券' }],
    signin: { mode: 'continuous', days: 3 },
    jump_url: '/subpages/member/sign-in/index',
    start_time: 1714939200,
    end_time: 1715976000,
    visible: true
  }
]

const MOCK_HISTORY = [
  {
    task_id: 't_consume_once',
    name: '完成单笔消费',
    finished_at: '2025-06-18 18:09:56',
    reward_status: 'pending_reward',
    rewards: [
      { type: 'point', text: '积分+20', value: 20 },
      { type: 'coupon', text: '3件8折券' }
    ]
  },
  {
    task_id: 't_first_order',
    name: '完成首单',
    finished_at: '2025-06-18 18:09:56',
    reward_status: 'rewarded',
    rewards: [
      { type: 'point', text: '积分+5', value: 5 },
      { type: 'coupon', text: '立减50元券' }
    ]
  },
  {
    task_id: 't_consume_sum',
    name: '完成累计消费',
    finished_at: '2025-06-18 18:09:56',
    reward_status: 'rewarded',
    rewards: [{ type: 'point', text: '积分+5', value: 5 }]
  },
  {
    task_id: 't_invite_reg',
    name: '邀请好友入会',
    finished_at: '2025-06-18 18:09:56',
    reward_status: 'rewarded',
    rewards: [{ type: 'coupon', text: '美妆品类10元立减券' }]
  }
]

const MOCK_RULES =
  '<p>任务中心活动规则内容字体样式占位任务中心活动规则内容字体样式占位任务中心活动规则内容字体样式占位任务中心活动规则内容字体样式占位</p><p>任务中心活动规则内容字体样式占位任务中心活动规则内容字体样式占位任务中心活动规则内容字体样式占位任务中心活动规则内容字体样式占位任务中心活动规则内容字体样式占位任务中心活动规则内容字体样式占位</p><p>任务中心活动规则内容字体样式占位任务中心活动规则内容字体样式占位任务中心活动规则内容字体样式占位任务中心活动规则内容字体样式占位</p>'

const delay = (data, ms = 200) =>
  new Promise((resolve) => {
    setTimeout(() => resolve(data), ms)
  })

/** 任务中心列表（可见 + 活动期内） */
export function getCenterList(params = {}) {
  if (USE_MOCK) {
    return delay({
      point: 2467,
      list: MOCK_TASKS.filter((t) => t.visible !== false),
      total_count: MOCK_TASKS.length
    })
  }
  return req.get('/member/task/center', params)
}

/** 历史参与任务 */
export function getHistoryList(params = {}) {
  if (USE_MOCK) {
    return delay({
      list: MOCK_HISTORY,
      total_count: MOCK_HISTORY.length
    })
  }
  return req.get('/member/task/history', params)
}

/** 任务规则文案 */
export function getRules(params = {}) {
  if (USE_MOCK) {
    return delay({ content: MOCK_RULES })
  }
  return req.get('/member/task/rules', params)
}

/** 完成任务上报（需携带 task_id，防跨任务归因） */
export function completeTask(params = {}) {
  if (USE_MOCK) {
    return delay({ success: true, status: 'pending_reward' })
  }
  return req.post('/member/task/complete', params)
}

/**
 * 兼容 entryLaunch.postCenterTask 旧调用
 * 返回结构：{ rule_list: [...] }
 */
export function getTaskList(params = {}) {
  if (USE_MOCK) {
    return delay({
      rule_list: MOCK_TASKS.map((t) => ({
        id: t.task_id,
        activity_id: t.activity_id,
        done: t.status === 'todo' || t.status === 'not_achieved' ? 0 : 1,
        special_type: t.type,
        binding_items: '[]',
        binding_distributors: '[]',
        common_condition: {
          page_delay: t.browse?.stay_seconds || 0
        }
      }))
    })
  }
  return req.get('/member/task/list', params)
}
