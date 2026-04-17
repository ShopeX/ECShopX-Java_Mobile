/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 *
<<<<<<< HEAD
 * 基于 i18next + react-i18next；文案在 src/i18n/locales。
 */
import i18n, {
=======
 * 统一出口：`app.config.js`、组件等 `import { $t, useTranslation, i18n } from '@/i18n'`
 */
import { useTranslation } from 'react-i18next'
import i18n from './instance'

export { useTranslation }
export {
>>>>>>> feature/email_login_tyc
  syncI18nLanguage,
  STORAGE_TO_I18N,
  I18N_TO_STORAGE,
  SUPPORTED_STORAGE_LANGS
} from './instance'

<<<<<<< HEAD
export { i18n, syncI18nLanguage, STORAGE_TO_I18N, I18N_TO_STORAGE, SUPPORTED_STORAGE_LANGS }
export { useTranslation, Trans } from 'react-i18next'

/**
 * 当前存储侧语言码（zhcn | en | ar）
 */
export function getLocale() {
  const lng = i18n.resolvedLanguage || i18n.language || 'en'
  return I18N_TO_STORAGE[lng] || (String(lng).toLowerCase().startsWith('zh') ? 'zhcn' : 'en')
}

/**
 * 取文案（键需在 locales 中配置；组件内需调用 `useTranslation()` 以在切换语言时重渲染）
 * @param {string} key
 */
export function $t(key) {
  return i18n.t(key)
}

/** @deprecated 请使用 $t */
export const t = $t

/**
 * 占位符 ${0}、${1}… 与 args 数组对应（与历史 $iS 习惯一致）
 */
export function ti(key, args) {
  const raw = $t(key)
  if (typeof raw !== 'string' || !Array.isArray(args)) return raw
  try {
    return raw.replace(/\$\{(\d+)\}/g, (match, index) => {
      const position = parseInt(index, 10)
      return args[position] !== undefined ? String(args[position]) : match
    })
  } catch {
    return raw
  }
=======
export { i18n }
export default i18n

/** 平铺文案 */
export function $t(key, options) {
  return i18n.t(key, options)
}

/**
 * 占位符为 ${0}、${1}… 的文案（与 locales JSON 中写法一致）
 * @param {string} key
 * @param {Array<string|number>} values
 */
export function ti(key, values = []) {
  let s = i18n.t(key)
  if (!Array.isArray(values) || values.length === 0) {
    return s
  }
  values.forEach((v, i) => {
    s = String(s).split('${' + i + '}').join(v != null ? String(v) : '')
  })
  return s
>>>>>>> feature/email_login_tyc
}
