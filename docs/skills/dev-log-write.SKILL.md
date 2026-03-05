---
name: dev-log-write
description: After completing a feature or bugfix in ecshopx-vshop, summarizes the change, appends an entry to docs/dev-log.md, then commits all current working tree changes (code + dev-log) in one commit so the user can finish git submit in the conversation. Use when the user says "记一笔", "写进 dev log", or when finishing a requirement/bugfix and wants it logged.
---

# 开发记录写入 Skill

> 完成需求或修完 bug 后，按本 skill 总结并**插入**写入 `docs/dev-log.md`，再将**当前工作区所有改动**（本次改的代码 + dev-log）**一次性 git commit**，大家在对话里就能完成提交，不用再去终端操作。

---

## 写入位置

- **文件**：`docs/dev-log.md`
- **位置**：在「记录区」**最上方**插入一条（即紧接 `## 记录区` 标题下方），这样阅读时最新一条在最上面。

---

## 单条格式

每条必须包含：

1. **标题行**：`### YYYY-MM-DD | 需求 | 简短标题` 或 `### YYYY-MM-DD | 修复 | 简短标题`
2. **说明**：`- **说明**：` 后一两句话写清楚做了什么（需求：功能要点；修复：问题现象 + 修改要点）。
3. **涉及**（可选）：`- **涉及**：` 主要改动的文件或模块，多个用顿号或逗号分隔。

日期用当天日期（用户未指定时）。类型只选「需求」或「修复」。

---

## 何时写入

- 用户明确说「记一笔」「写进 dev log」「总结并写入」「帮忙记录这次需求/修 bug」等 → 直接总结并追加写入。
- 用户说「需求做完了」「bug 修好了」且希望留档 → 先简短总结，再追问「要帮你写入 docs/dev-log.md 吗？」或直接写入并告知「已追加到 docs/dev-log.md」。
- 仅讨论方案、未完成代码或未明确要求记录 → 不写入。

---

## 操作步骤

1. 根据本次对话或用户描述，写出「标题」「说明」「涉及」。
2. 打开 `docs/dev-log.md`，找到「## 记录区」标题及其下一行（空行或示例注释）。
3. 在记录区**最上方**（紧跟 `## 记录区` 之后）**插入**一条，格式同上，与下一条之间留一空行。
4. **一次性提交**：先写入 dev-log 后，对**当前工作区所有改动**执行 `git add .`（或 `git add -A`）再 `git commit`。提交信息用与本条记录一致的简短说明：需求用 `feat: 简短标题`，修复用 `fix: 简短标题`。这样本次对话里改的代码和 dev-log 一起进一个 commit，无需大家再去终端提交。需请求 **git_write** 权限。
5. 回复用户时说明「已记一笔并完成提交（含本次改动）」并贴出本条内容（可选）。

不要删除或重写已有记录，只做插入。
