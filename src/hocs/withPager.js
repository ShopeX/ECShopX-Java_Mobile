/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
// this.fetch 方法需要返回条数总量: { total }，用来计算页数
// this.state.page 存放page相关的状态
import { Tracker } from '@/service'
import assertClassComponent from './assertClassComponent'

export default function withPager(Component) {
  assertClassComponent('withPager', Component)

  return class WithPagerComponent extends Component {
    constructor(props) {
      super(props)
      const { pageSize = 10, pageNo = 0, pageTotal = 0 } = props || {}

      const page = {
        hasNext: true,
        isLoading: false,
        total: pageTotal,
        page_no: pageNo,
        page_size: pageSize
      }

      this.state.page = page
    }

    nextPage = async () => {
      const { page } = this.state
      if (!page.hasNext || page.isLoading) return

      // 上拉触底
      if (page.page_no > 0) {
        Tracker.dispatch('PAGE_REACH_BOTTOM')
      }
      page.isLoading = true
      this.setState({
        page
      })

      const { page_no, page_size } = page
      const curPage = page_no + 1
      try {
        const { total } = (await this.fetch({
          page_no: curPage,
          page_size
        })) || {}
        if (!total || curPage >= Math.ceil(+total / page_size)) {
          page.hasNext = false
        }
        this.setState({
          page: {
            ...page,
            total,
            page_no: curPage,
            isLoading: false
          }
        })
        return { ok: true, total }
      } catch (error) {
        // 请求失败时必须复位 loading，否则页面会永远停在“加载中”（在整页渲染 loading 的页面里就是整页空白）
        // 错误提示由 api/req 拦截器统一 toast，这里只把状态交还给调用方，避免 Promise 异常冒到事件层
        page.hasNext = false
        this.setState({
          page: {
            ...page,
            isLoading: false
          }
        })
        return { ok: false, error }
      }
    }

    resetPage(cb = () => {}) {
      const page = {
        ...(this.state.page || {}),
        page_size: 10,
        page_no: 0,
        total: 0,
        isLoading: false,
        hasNext: true
      }
      this.setState({ page }, cb)
    }
  }
}
