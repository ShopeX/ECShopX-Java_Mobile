/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 *
 * 会员浏览任务：落地页停留满 stay_seconds 后上报 browse-report（ECX-10467）
 * 依赖路由参数：task_id、stay（或 stay_seconds）、可选 page
 */
import { useEffect, useRef } from 'react'
import { useRouter, useDidShow, useDidHide } from '@tarojs/taro'
import api from '@/api'

function resolveReportPage(router, pageParam) {
  if (pageParam) return String(pageParam).replace(/^\//, '')
  const path = String(router?.path || '').split('?')[0]
  return path.replace(/^\//, '')
}

export default function useMemberBrowseTask() {
  const router = useRouter()
  const reportedRef = useRef(false)
  const timerRef = useRef(null)
  const startedAtRef = useRef(0)
  const accumulatedMsRef = useRef(0)

  const params = router?.params || {}
  const taskId = params.task_id
  const staySeconds = Number(params.stay ?? params.stay_seconds ?? 0)
  const pageParam = params.page

  const clearTimer = () => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const pause = () => {
    if (startedAtRef.current) {
      accumulatedMsRef.current += Date.now() - startedAtRef.current
      startedAtRef.current = 0
    }
    clearTimer()
  }

  const report = async () => {
    if (reportedRef.current || !taskId || !(staySeconds > 0)) return
    reportedRef.current = true
    const page = resolveReportPage(router, pageParam)
    try {
      await api.task.browseReport({
        task_id: Number(taskId) || taskId,
        page,
        stay_seconds: staySeconds
      })
    } catch (e) {
      // 失败允许同页再次尝试（例如弱网）
      reportedRef.current = false
      console.warn('[member-task browse-report]', e)
    }
  }

  const start = () => {
    if (reportedRef.current || !taskId || !(staySeconds > 0)) return
    clearTimer()
    startedAtRef.current = Date.now()
    const remain = Math.max(0, staySeconds * 1000 - accumulatedMsRef.current)
    timerRef.current = setTimeout(() => {
      accumulatedMsRef.current = staySeconds * 1000
      startedAtRef.current = 0
      report()
    }, remain)
  }

  useDidShow(() => {
    start()
  })

  useDidHide(() => {
    pause()
  })

  useEffect(() => {
    return () => {
      pause()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- unmount only
  }, [])
}
