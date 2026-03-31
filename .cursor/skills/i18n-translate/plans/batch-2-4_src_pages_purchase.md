# i18n 扫描结果

**扫描目录**: `/Users/lukaijie/workspace/work/shopex/smallP/ecshopx-platform/ecshopx-vshop/src/pages/purchase`
**报告文件**: `batch-2-4_src_pages_purchase.md`

## 统计

| 状态 | 数量 | 占比 |
|------|------|------|
| 未翻译完 | 0 | 0.0% |
| 已翻译 | 4 | 80.0% |
| 无需翻译 | 1 | 20.0% |
| **合计** | **5** | 100% |

## 未翻译完

（无）

## 已翻译

- `auth.js`
- `comps/comp-tabbar.js`
- `index.config.js`
- `index.js`

## 无需翻译

- `auth.config.js`

## 说明

- `index.js`：底部「身份管理」改为 `$t('e32a7439.e33d3e')`，与 `subpages/i18n/lang` 中「身份管理」英阿译文一致。
- `index.config.js`：导航标题改为空字符串，与 `auth.config` 等一致，实际标题由页面内 `setNavigationBarTitle($t('e32a7439.dc7202'))` 设置。
- `auth.js`、`comp-tabbar.js`：面向用户文案已走 `$t` / 键引用。
