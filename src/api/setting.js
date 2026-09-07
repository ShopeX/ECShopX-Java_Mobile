/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 *
 * ECX-10021 / ECX-10023：站点语言配置（用户端只读）
 * Apifox：GET /api/v1/h5app/wxapp/setting/language → 相对路径 /setting/language
 */
import req from './req'

/** 已启用语言列表（各端语言切换 UI 唯一数据源；不含已关闭语言、不含 version） */
export function getLanguageSetting(params = {}) {
  return req.get('/setting/language', {
    ...params,
    showError: false
  })
}
