const fs = require('fs')
const path = require('path')

const localeDir = path.resolve(process.cwd(), 'src/subpages/i18n/locales')
const instanceSource = fs.readFileSync(path.resolve(process.cwd(), 'src/i18n/instance.js'), 'utf8')
const resourcesSource = fs.readFileSync(
  path.resolve(process.cwd(), 'src/subpages/i18n/resources.js'),
  'utf8'
)
const configSource = fs.readFileSync(path.resolve(process.cwd(), 'config/index.js'), 'utf8')
const requestSource = fs.readFileSync(path.resolve(process.cwd(), 'src/api/req.js'), 'utf8')

function loadLocale(name) {
  return JSON.parse(fs.readFileSync(path.join(localeDir, `${name}.json`), 'utf8'))
}

function interpolationTokens(value) {
  return String(value || '').match(/\$\{\d+\}/g) || []
}

const english = loadLocale('en')
const translatedLocales = {
  ja: loadLocale('ja'),
  ru: loadLocale('ru')
}

describe('Japanese and Russian locale resources', () => {
  test.each(Object.entries(translatedLocales))(
    '%s has the same keys and interpolation tokens as English',
    (locale, messages) => {
      expect(Object.keys(messages).sort()).toEqual(Object.keys(english).sort())

      for (const key of Object.keys(english)) {
        expect(interpolationTokens(messages[key]).sort()).toEqual(interpolationTokens(english[key]).sort())
      }
    }
  )

  test.each(Object.entries(translatedLocales))(
    '%s does not fall back to English for ordinary UI copy',
    (locale, messages) => {
      const ordinaryKeys = [
        '10293ac1.02cc4f',
        '10293ac1.1edff0',
        '10293ac1.479ddf',
        '61e2d21a.8bdc0a',
        '6c0659eb.62d369',
        'a2d3a891.c017be'
      ]

      for (const key of ordinaryKeys) {
        expect(messages[key]).not.toBe(english[key])
      }
    }
  )

  test('normalizes Japanese and Russian language aliases', () => {
    const { normalizeStorageLang, STORAGE_TO_I18N, I18N_TO_STORAGE } = require('../i18n/instance')

    expect(normalizeStorageLang('ja-JP')).toBe('ja')
    expect(normalizeStorageLang('jp')).toBe('ja')
    expect(normalizeStorageLang('ru-RU')).toBe('ru')
    expect(STORAGE_TO_I18N.ja).toBe('ja')
    expect(STORAGE_TO_I18N.ru).toBe('ru')
    expect(I18N_TO_STORAGE.ja).toBe('ja')
    expect(I18N_TO_STORAGE.ru).toBe('ru')
  })

  test('registers Japanese and Russian resources in runtime and build paths', () => {
    expect(resourcesSource).toMatch(/ja:\s*require\('\.\/locales\/ja\.json'\)/)
    expect(resourcesSource).toMatch(/ru:\s*require\('\.\/locales\/ru\.json'\)/)
    expect(instanceSource).toMatch(/ja:\s*'ja'/)
    expect(instanceSource).toMatch(/ru:\s*'ru'/)
    expect(configSource).toMatch(/'ja',\s*'ru'/)
    expect(requestSource).toMatch(/ja:\s*'ja-JP'/)
    expect(requestSource).toMatch(/ru:\s*'ru-RU'/)
  })
})
