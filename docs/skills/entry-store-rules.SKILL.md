# 进店规则 Skill

> 云店进店规则说明与查阅。遇到「进店规则」「导购进店」「店铺码」「gu/dtid」「SG_GUIDE_PARAMS」等问题时，可先读本 skill 再改代码。

---

## 1. 后台配置与接口

### 1.1 接口

- **获取进店规则**：`GET /distributor/config/inRule`（前端 `api.shop.getStoreEnterRule()`）
- **校验导购进店**：`POST /distributor/config/inRule/check`（前端 `api.shop.checkStoreEnterRule(params)`），用于按导购工号查所属店铺

### 1.2 接口返回示例

```json
{
  "data": {
    "distributor_code": { "status": true, "sort": 3 },
    "shop_assistant": { "status": true, "express_time": 25, "sort": 1 },
    "shop_white": { "status": false, "sort": 4 },
    "shop_assistant_pro": { "status": true, "sort": 2 },
    "shop_lbs": true,
    "radio_type": 2,
    "default_shop": 0,
    "intro_page": "8"
  }
}
```

- **sort**：数字越小优先级越高（先执行）。后台「从上到下权重由大到小」对应 sort 升序。
- **status**：该条规则是否开启，仅 `status === true` 的规则会参与进店判断。
- **express_time**：仅 `shop_assistant` 有，导购参数保留时长（×24 小时），会写入 `SG_GUIDE_PARAMS_EXPRESSTIME`。

---

## 2. 规则类型与前端 key

| 后台名称           | rule.key           | 说明 |
|--------------------|--------------------|------|
| 店铺码进店         | `distributor_code` | 链接带 `dtid` 时，进该店铺（扫码/分享卡片） |
| 导购物料进店       | `shop_assistant`   | 链接带导购参数时，用 `checkStoreEnterRule({ work_userid })` 查导购所属店铺并进店 |
| 进入白名单店铺     | `shop_white`       | 已登录用户，进其白名单店铺 |
| 进入专属导购所属店 | `shop_assistant_pro` | 已登录用户，用 `checkStoreEnterRule()` 进专属导购归属店 |
| LBS 就近进店       | （非 rule，单独 `shop_lbs`） | 无店铺 id 时用定位进店，在 `checkStoreWhiteList(null)` 里用 lat/lng |

---

## 3. 前端执行顺序（完全按后台顺序）

- 数据来源：`state.sys.entryStoreRules`，在 `app.js` 的 `getSystemConfig` 里由接口 `enterStoreRule` 转成数组并按 **sort 升序** 排序。
- 执行位置：`src/hocs/withPageWrapper.js` 的 `checkEnterStoreRule()`。
- 逻辑：按 `entryStoreRules.filter(item => item.status)` 的顺序依次 `shift()` 执行，**先命中先 resolve，不再执行后续规则**；全部未命中时最后执行 `checkStoreWhiteList(dtid)`（可能走 LBS）。

---

## 4. 参数来源（Storage）

- **SG_ROUTER_PARAMS**（如 `routerParams`）：来自 `app.js` 的 `useDidShow` 里 `entryLaunch.getRouteParams(...)` 的写入，包含链接上的 `dtid`、`gu`、`card_id`、`from_scene`、`smid` 等。
- **SG_GUIDE_PARAMS**：当 `params.gu || params.gu_user_id` 时由 `app.js` 写入，`gu_user_id = params.gu_user_id || params.gu.split('_')[0]`（导购工号）。

进店规则里读取：

- `dtid`：`Taro.getStorageSync(SG_ROUTER_PARAMS).dtid`
- `gu_user_id`：`Taro.getStorageSync(SG_GUIDE_PARAMS).gu_user_id`  
  若需兜底（如 DidShow 未先写回），可从 `SG_ROUTER_PARAMS.gu` 解析：`gu.split('_')[0]`。

---

## 5. 各规则执行逻辑摘要

- **distributor_code**：若有 `dtid`，则 `checkStoreWhiteList(dtid)` 并 resolve；否则 `nextRule()`。
- **shop_assistant**：若无 `gu_user_id` 则 `nextRule()`；否则 `api.shop.checkStoreEnterRule({ work_userid: gu_user_id })`，有 `distributor_id` 则 `checkStoreWhiteList(该 id)` 并 resolve，否则 `nextRule()`。
- **shop_white**：未登录可先弹登录；再根据 `shopInfo.distributor_id` 或 `getUserWhiteShop()` 结果进店或 `nextRule()`。
- **shop_assistant_pro**：未登录则 `nextRule()`；否则 `api.shop.checkStoreEnterRule()`（无参），有 `distributor_id` 则 `checkStoreWhiteList(该 id)` 并 resolve，否则 `nextRule()`。

---

## 6. checkStoreWhiteList(dtid, isLocation)

- 有 `dtid`：用 `distributor_id = dtid` 调 `api.shop.getShop`，再拉导购信息、写 Redux、处理白名单/虚拟店等。
- 无 `dtid` 有 `shopInfo.distributor_id`：用该 id 调 getShop。
- 无店铺 id 且开启 `entryStoreByLBS`：用定位 lat/lng 调 getShop。
- 最终会 `dispatch(updateShopInfo(currentShopInfo))`（虚拟店时可能 `distributor_id: 0`）。

---

## 7. 分享落地页与 from_scene

- 落地页：`pages/share-land`，参数含 `from_scene` 等。
- `share-land.js` 内 `welcomeRoutes` 将 `from_scene` 映射到目标页，例如：
  - `guide_task_gucoupon` → `/subpages/guide/coupon-home/index`
  - `poster_coupon_center` → `/subpages/marketing/coupon-center`
  - `distributor_code` 对应链接带 `dtid` 的「店铺码进店」。
- 进入落地页时会 `Taro.setStorageSync(SG_ROUTER_PARAMS, routeParams)`，若有 `gu`/`gu_user_id` 会写 `SG_GUIDE_PARAMS`，再 `redirectTo` 到目标页并带上除 `from_scene` 外的参数（如 `gu`、`card_id`、`dtid`、`smid`）。

---

## 8. 相关文件

| 文件 | 作用 |
|------|------|
| `src/hocs/withPageWrapper.js` | 进店规则执行、checkStoreWhiteList、resolveInStoreRule |
| `src/app.js` | getSystemConfig 拉取 enterStoreRule、组 entryStoreRules、写 SG_* |
| `src/utils/entryLaunch.js` | getRouteParams 解析路由/场景参数 |
| `src/pages/share-land.js` | 分享落地、SG_* 写入、按 from_scene 跳转 |
| `src/store/slices/sys.js` | entryStoreRules、entryStoreByLBS、entryDefalutStore、guidderTemplateId |

---

## 9. 常见问题速查

- **客户从导购分享进店进了别的店**：看后台规则顺序是否「店铺码」在「导购物料」前；若链接带 `dtid` 且先走 distributor_code，会进 dtid 店。可调整后台规则顺序（导购物料 sort 小于店铺码）。
- **有 gu 但没走导购进店**：确认 `SG_GUIDE_PARAMS.gu_user_id` 或从 `SG_ROUTER_PARAMS.gu` 解析的工号在规则执行时已存在；若 useDidShow 异步未写回，可在进店规则里用 `routerParams.gu.split('_')[0]` 兜底。
- **进店规则不执行**：确认 `VERSION_STANDARD`、`initState`、`SG_CHECK_STORE_RULE == 0` 会触发 `resolveInStoreRule` → `checkEnterStoreRule`。
