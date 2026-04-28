/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 *
 * i18next 单例：语言资源通过 subpages/i18n/resources 分包异步加载。
 */
/* eslint-disable import/no-named-as-default-member -- i18next 默认导出即实例，需调用 .use / .changeLanguage */
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

/** Taro 存储 / Redux 使用的语言码 → i18next lng */
export const STORAGE_TO_I18N = {
  zhcn: 'zh-CN',
  en: 'en',
  ar: 'ar'
}

/** i18next lng → 存储用语言码 */
export const I18N_TO_STORAGE = {
  'zh-CN': 'zhcn',
  en: 'en',
  ar: 'ar'
}

/** 可选语言顺序（与 Taro 存储 lang 一致） */
export const SUPPORTED_STORAGE_LANGS = ['zhcn', 'en', 'ar']

function isNodeCompilerContext() {
  return (
    typeof process !== 'undefined' &&
    process.versions != null &&
    typeof process.versions.node === 'string'
  )
}

function readStorageLang() {
  // readConfig（esbuild + Node）会加载本模块：勿顶层 import Taro，否则会拉取 @tarojs/runtime 并在 TARO_PLATFORM=web 时访问 window 报错。
  if (isNodeCompilerContext()) {
    return ''
  }
  try {
    const Taro = require('@tarojs/taro').default
    return Taro.getStorageSync('lang') || ''
  } catch {
    return ''
  }
}

function resolveInitialLng() {
  const stored = readStorageLang()
  if (stored && STORAGE_TO_I18N[stored]) {
    return STORAGE_TO_I18N[stored]
  }
  const env =
    typeof process !== 'undefined' && process.env && process.env.APP_DEFAULT_LANGUAGE
      ? process.env.APP_DEFAULT_LANGUAGE
      : ''
  if (env && STORAGE_TO_I18N[env]) {
    return STORAGE_TO_I18N[env]
  }
  return 'en'
}

function getTaro() {
  try {
    return require('@tarojs/taro').default
  } catch {
    return null
  }
}

function getLoadedPackageResource(storageLang) {
  const Taro = getTaro()
  if (!Taro || !Taro.__i18nResources) {
    return undefined
  }
  return Taro.__i18nResources[storageLang]
}

function loadLocalePackage() {
  const cached =
    getLoadedPackageResource('zhcn') || getLoadedPackageResource('en') || getLoadedPackageResource('ar')
  if (cached) {
    return Promise.resolve()
  }

  const Taro = getTaro()
  if (process.env.TARO_ENV === 'weapp') {
    return new Promise((resolve, reject) => {
      if (typeof __non_webpack_require__ === 'undefined') {
        reject(new Error('subPackage require is unavailable'))
        return
      }
      __non_webpack_require__('subpages/i18n/resources', () => {
        const resources = __non_webpack_require__('subpages/i18n/resources')
        Taro.__i18nResources = {
          ...(Taro.__i18nResources || {}),
          ...resources
        }
        if (resources.zhcn || resources.en || resources.ar) {
          resolve()
        } else {
          reject(new Error('i18n subPackage loaded without resources'))
        }
      })
    })
  }

  return Promise.reject(new Error('i18n subPackage resource loading is only enabled for weapp'))
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {},
    lng: resolveInitialLng(),
    fallbackLng: ['zh-CN'],
    interpolation: {
      escapeValue: false
    },
    react: {
      useSuspense: false
    },
    returnNull: false
  })
}

async function loadI18nResource(storageLang) {
  const lng = STORAGE_TO_I18N[storageLang]
  if (!lng || i18n.hasResourceBundle(lng, 'translation')) {
    return lng
  }

  await loadLocalePackage()
  const resource = getLoadedPackageResource(storageLang)
  if (!resource) {
    throw new Error(`Missing i18n resource: ${storageLang}`)
  }
  i18n.addResourceBundle(lng, 'translation', resource, true, true)
  return lng
}

/**
 * 与 Taro 存储语言对齐（zhcn / en / ar）
 * @param {string} storageLang
 */
export async function syncI18nLanguage(storageLang) {
  const lng = await loadI18nResource(storageLang)
  if (!lng) {
    return
  }
  if (i18n.language === lng) {
    return
  }
  await i18n.changeLanguage(lng)
}

export default i18n
