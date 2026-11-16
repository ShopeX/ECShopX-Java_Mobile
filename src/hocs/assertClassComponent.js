/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
/**
 * 本项目里 withPager / withBackToTop / withLogin / withLoadMore / withPointitem
 * 都是通过「继承被包装组件」来注入能力的写法，所以被包装组件必须是 React 类组件。
 *
 * 坑：react-i18next 从 v15 起 withTranslation() 返回的是函数组件，
 * 一旦把它放在这些 HOC 内层（withPager(withBackToTop(withTranslation()(Page))))，
 * 派生类会丢掉 prototype.isReactComponent，React 会把类当函数组件调用，直接抛
 * "Cannot call a class as a function"，表现就是整页空白（含 ECX-11145）。
 *
 * 正确写法：把 withTranslation() 放到最外层
 *   withTranslation()(withPager(withBackToTop(Page)))
 *
 * 该断言仅开发环境生效，避免以后又写出同样的组合。
 */
export default function assertClassComponent(hocName, Component) {
  if (process.env.NODE_ENV === 'production') return
  if (Component && Component.prototype && Component.prototype.isReactComponent) return

  console.warn(
    `[${hocName}] 被包装组件不是 React 类组件，运行时会抛 "Cannot call a class as a function"（页面空白）。\n` +
      '请检查组合顺序，例如把 withTranslation() 移到最外层：withTranslation()(withPager(withBackToTop(Page)))'
  )
}
