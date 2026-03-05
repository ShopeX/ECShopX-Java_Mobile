---
name: project-handover
description: Describes ecshopx-vshop project structure, run setup, conventions, and where to find domain docs. Use when onboarding, handing over, or when the user asks about project structure, where to put code, how to add pages, or how multiple developers should work in this repo.
---

# 项目接手与协作 Skill

> 多人开发或新人接手时，先读本 skill 和 README；改具体业务（进店、文章、导购等）时再读对应业务 skill。

---

## 1. 技术栈与运行

- **框架**：Taro（多端：微信小程序、H5、支付宝等）
- **Node**：需 16.16.0（见 `package.json` engines，建议用 nvm）
- **安装**：`npm i`
- **环境**：复制 `.env.example` 为 `.env` 或 `.env.local`，填 `APP_BASE_URL`、`APP_ID` 等（见 README）
- **常用命令**：
  - 微信小程序：`npm run dev:weapp`
  - H5：`npm run dev:h5`
  - 打包：`npm run build:weapp` / `npm run build:h5`

---

## 2. 目录结构（src 下）

| 目录 | 用途 |
|------|------|
| `pages/` | 主包页面（首页、商品详情、购物车、分享落地页等） |
| `subpages/` | 分包页面，按业务拆：`guide` 导购、`store` 门店、`purchase` 内购、`member` 会员、`marketing` 营销、`salesman` 业务员、`community` 社区、`dianwu` 店务等 |
| `components/` | 公共组件（如 `sp-*` 系列） |
| `api/` | 接口封装，按模块分文件（如 `api/article.js`、`api/shop.js`） |
| `doc/` | 接口/页面字段映射与文档（如 `doc/article.js` 的 ARTICLE_ITEM） |
| `utils/` | 公共方法（如 `pickBy`、`formatTime`、`linkPage`） |
| `store/` | Redux 状态 |
| `consts/` | 常量（如 `SG_ROUTER_PARAMS`、`SG_GUIDE_PARAMS`） |
| `hocs/` | 高阶组件（如 `withPageWrapper` 进店逻辑） |

路由与分包在 **`src/app.config.js`**：`pages` 为主包，`subPackages[].root` + `pages` 为分包；新增页面需在此登记。

---

## 3. 约定（多人协作时尽量统一）

- **页面与 config**：每个页面目录下通常有 `xxx.js`（页面） + `xxx.config.js`（标题等配置）；**新增或移动页面时，同步改 `app.config.js` 的 pages/subPackages**。
- **接口**：请求写在 `api/`，返回结构若需前端映射，在 `doc/` 里用 keyMaps（如 `ARTICLE_ITEM`）统一维护。
- **环境变量**：所有 `APP_*` 在 `.env` / `.env.local`，不要写死到代码里；敏感信息不要提交。
- **业务逻辑集中处**：进店规则在 `hocs/withPageWrapper.js`、分享落地页在 `pages/share-land.js`、全局入口与路由参数在 `app.js`。

---

## 4. 业务 / 领域 Skill 放在哪

- **位置**：`docs/skills/` 下，一个领域一个文件，如 `entry-store-rules.SKILL.md`（进店规则）。
- **何时用**：改该领域功能时，让 AI 或新人先读对应 skill（如进店、导购、店铺码、文章详情），再改代码，避免漏掉接口约定或执行顺序。
- **已有**：`docs/skills/entry-store-rules.SKILL.md`（进店规则、SG_* 参数、checkStoreWhiteList 等）。

---

## 5. 常见改动检查清单

**新增/修改页面**

- [ ] 在 `src/app.config.js` 的 `pages` 或对应 `subPackages[].pages` 中登记路径
- [ ] 页面目录下有 `xxx.js` 与（如需要）`xxx.config.js`
- [ ] 若为分包，路径为相对 root 的路径（如 `recommend/detail`）

**新增接口**

- [ ] 在 `api/` 下对应模块新增方法（或新建文件）
- [ ] 若返回字段需映射，在 `doc/` 中补全 keyMaps，页面用 `pickBy(res, doc.xxx.ITEM)` 之类统一取值

**改进店/分享/导购相关**

- [ ] 先读 `docs/skills/entry-store-rules.SKILL.md`，再改 `withPageWrapper`、`share-land`、`app.js`

**需求或 bugfix 完成后留档**

- [ ] 让 AI 总结并写入 `docs/dev-log.md`（可说「记一笔」「写进 dev log」或 @ `docs/skills/dev-log-write.SKILL.md`）

---

## 6. 新人接手建议顺序

1. 看 **README**：安装、Node 版本、环境变量、运行命令。
2. 看 **本 skill**：目录、约定、检查清单。
3. 按任务看 **业务 skill**：例如做进店/店铺码 → `entry-store-rules.SKILL.md`；做文章/种草 → 若有 `article-recommend-detail` 等再读。
4. 改代码时遵守 **约定**（页面+config、api+doc、.env）。

---

## 7. 如何让 AI 用上本 Skill

- 在对话里直接 @ 本文件：`@docs/skills/project-handover.SKILL.md`。
- 或在描述任务时带上触发词：例如「接手这个项目」「新人 onboarding」「项目结构」「怎么加页面」「多人协作约定」。
- 若项目使用 Cursor 的 project skills，把本 skill 放到 `.cursor/skills/` 或在本仓库 `docs/skills/` 中保持路径，并在 AGENTS.md 或项目说明里写一句「项目约定见 docs/skills/project-handover.SKILL.md」。
