/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 *
 * 站点语言配置：归一化 / 缓存 / 解析当前生效语言（ECX-10023）
 *
 * 接口字段（Apifox project 8796324）：
 * {
 *   defaultLanguage: 'zh-CN',
 *   enabledLanguages: [{ code: 'zh-CN', name: '中文', sort: 1 }, ...],
 *   updatedAt?: number
 * }
 */
import Taro from '@tarojs/taro'
import { getLanguageSetting } from '@/api/setting'
import { normalizeStorageLang, SUPPORTED_STORAGE_LANGS, syncI18nLanguage } from '@/i18n/instance'
import { SG_LANG_USER_PREFERRED } from '@/consts'

const CACHE_KEY = 'site_language_setting'
const CACHE_TTL_MS = 60 * 1000

/** API LanguageCode → 本地存储码 */
const API_CODE_TO_STORAGE = {
  'zh-CN': 'zhcn',
  'zh-cn': 'zhcn',
  zhcn: 'zhcn',
  zh: 'zhcn',
  'zh-TW': 'zhtw',
  'zh-tw': 'zhtw',
  zhtw: 'zhtw',
  'en-CN': 'en',
  'en-US': 'en',
  'en-us': 'en',
  en: 'en',
  ar: 'ar',
  'ar-SA': 'ar',
  'ar-sa': 'ar',
  ja: 'ja',
  'ja-JP': 'ja',
  'ja-jp': 'ja',
  jp: 'ja',
  ru: 'ru',
  'ru-RU': 'ru',
  'ru-ru': 'ru'
}

function mapApiCodeToStorage(code) {
  const raw = String(code || '').trim()
  if (!raw) return ''
  if (API_CODE_TO_STORAGE[raw]) return API_CODE_TO_STORAGE[raw]
  const lower = raw.toLowerCase()
  if (API_CODE_TO_STORAGE[lower]) return API_CODE_TO_STORAGE[lower]
  return normalizeStorageLang(raw)
}

function pickPayload(raw) {
  if (!raw || typeof raw !== 'object') return {}
  // req 可能返回内层 data，也可能仍带 { code, data }
  if (raw.defaultLanguage !== undefined || raw.enabledLanguages || raw.enabled_languages) {
    return raw
  }
  if (raw.data && typeof raw.data === 'object') {
    return raw.data
  }
  return raw
}

/**
 * @returns {{
 *   defaultLanguage: string,
 *   enabledLanguages: Array<{ code: string, storageLang: string, name: string, sort: number }>,
 *   updatedAt?: number
 * }}
 */
export function normalizeLanguageSetting(raw) {
  const payload = pickPayload(raw)
  const enabledRaw = payload.enabledLanguages || payload.enabled_languages || []
  const enabledLanguages = (Array.isArray(enabledRaw) ? enabledRaw : [])
    .map((item, index) => {
      const code = item?.code || item?.id || item?.language || ''
      const storageLang = mapApiCodeToStorage(code)
      if (!storageLang || !SUPPORTED_STORAGE_LANGS.includes(storageLang)) return null
      return {
        code: String(code),
        storageLang,
        name: item?.name || '',
        sort: Number(item?.sort) || index + 1
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.sort - b.sort)

  // 无配置时 PRD：仅中文开启且为默认
  const fallbackEnabled =
    enabledLanguages.length > 0
      ? enabledLanguages
      : [{ code: 'zh-CN', storageLang: 'zhcn', name: '中文', sort: 1 }]

  const defaultStorage =
    mapApiCodeToStorage(payload.defaultLanguage || payload.default_language) ||
    fallbackEnabled[0].storageLang

  const defaultInEnabled = fallbackEnabled.some((el) => el.storageLang === defaultStorage)
    ? defaultStorage
    : fallbackEnabled[0].storageLang

  return {
    defaultLanguage: defaultInEnabled,
    enabledLanguages: fallbackEnabled,
    updatedAt: payload.updatedAt ?? payload.updated_at
  }
}

function readCache() {
  try {
    const cached = Taro.getStorageSync(CACHE_KEY)
    if (!cached || !cached.normalized || !cached.ts) return null
    if (Date.now() - cached.ts > CACHE_TTL_MS) return null
    return cached.normalized
  } catch {
    return null
  }
}

function writeCache(normalized) {
  try {
    Taro.setStorageSync(CACHE_KEY, { ts: Date.now(), normalized })
  } catch {
    // ignore
  }
}

export function clearLanguageSettingCache() {
  try {
    Taro.removeStorageSync(CACHE_KEY)
  } catch {
    // ignore
  }
}

export async function fetchLanguageSetting({ force = false } = {}) {
  if (!force) {
    const cached = readCache()
    if (cached) return cached
  }
  try {
    const res = await getLanguageSetting()
    const normalized = normalizeLanguageSetting(res)
    writeCache(normalized)
    return normalized
  } catch (err) {
    console.warn('[language-setting] fetch failed', err)
    const cached = readCache()
    if (cached) return cached
    return normalizeLanguageSetting(null)
  }
}

export function isUserLanguagePreferred() {
  return String(Taro.getStorageSync(SG_LANG_USER_PREFERRED) || '') === '1'
}

export function markUserLanguagePreferred(preferred = true) {
  if (preferred) {
    Taro.setStorageSync(SG_LANG_USER_PREFERRED, '1')
  } else {
    Taro.removeStorageSync(SG_LANG_USER_PREFERRED)
  }
}

/**
 * 解析当前应使用的存储语言码
 * - 用户主动偏好且仍在启用列表 → 保留
 * - 否则 → 站点默认语言
 */
export function resolveActiveStorageLang(setting, currentStorageLang) {
  const normalized = setting || normalizeLanguageSetting(null)
  const enabled = normalized.enabledLanguages.map((el) => el.storageLang)
  const current = normalizeStorageLang(currentStorageLang)
  if (isUserLanguagePreferred() && current && enabled.includes(current)) {
    return current
  }
  return normalized.defaultLanguage || 'zhcn'
}

export function getEnabledStorageLangs(setting) {
  const normalized = setting || normalizeLanguageSetting(null)
  return normalized.enabledLanguages.map((el) => el.storageLang)
}

/**
 * 拉取站点配置并应用到本地 lang / i18n
 * @returns {Promise<string>} 最终生效的 storageLang
 */
export async function applySiteLanguageConfig({ force = false } = {}) {
  const setting = await fetchLanguageSetting({ force })
  const current = normalizeStorageLang(Taro.getStorageSync('lang'))
  const next = resolveActiveStorageLang(setting, current)

  // 偏好语言已被关闭 → 清除偏好标记，回落默认
  if (isUserLanguagePreferred() && current && !getEnabledStorageLangs(setting).includes(current)) {
    markUserLanguagePreferred(false)
  }

  if (next && next !== current) {
    Taro.setStorageSync('lang', next)
    await syncI18nLanguage(next)
    if (Taro.eventCenter) {
      Taro.eventCenter.trigger('languageChanged', { lang: next })
    }
  } else if (next && !current) {
    Taro.setStorageSync('lang', next)
    await syncI18nLanguage(next)
  }

  return next
}
