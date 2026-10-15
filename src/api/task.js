/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 *
 * 会员任务（VshopAPI · promotion/member-tasks）
 * - GET  /promotion/member-tasks                   任务中心列表 ECX-10434
 * - POST /promotion/member-tasks/browse-report     浏览上报 ECX-10467
 * - GET  /promotion/member-tasks/participations    历史参与分页 ECX-10434
 *
 * 任务规则专页无独立 API，用列表项 task_rule。
 */
import req from './req'

const BASE = '/promotion/member-tasks'

/** 任务中心列表（可见任务 + user_task_status） */
export function getCenterList(params = {}) {
  return req.get(BASE, params)
}

/**
 * 浏览任务进度上报（type=browse）
 * @param {{ task_id: number|string, page: string, stay_seconds: number }} params
 */
export function browseReport(params = {}) {
  return req.post(`${BASE}/browse-report`, params)
}

/**
 * 历史参与任务（分页）
 * @param {{ page_no?: number, page_size?: number }} params
 */
export function getHistoryList(params = {}) {
  return req.get(`${BASE}/participations`, {
    page_no: params.page_no ?? params.pageNo ?? 1,
    page_size: params.page_size ?? params.pageSize ?? 20
  })
}

/**
 * 兼容 entryLaunch.postCenterTask 旧调用
 * @deprecated 新任务请走 getCenterList / browseReport
 */
export function getTaskList(params = {}) {
  return req.get(`${BASE}/list`, params)
}

/**
 * 兼容旧完成上报
 * @deprecated 浏览类请用 browseReport
 */
export function completeTask(params = {}) {
  return req.post(`${BASE}/complete`, params)
}
