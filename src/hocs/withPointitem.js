/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import Taro, { getCurrentInstance } from '@tarojs/taro'
import assertClassComponent from './assertClassComponent'

export default function withPointitem(Component) {
  assertClassComponent('withPointitem', Component)

  return class WithPointitemComponent extends Component {
    constructor(props) {
      super(props)
    }

    isPointitem() {
      const options = getCurrentInstance()?.params
      return options && options.type === 'pointitem'
    }

    transformUrl(url, isPointitem = false) {
      if (isPointitem) {
        return `${url}&type=pointitem`
      }
      return url
    }
  }
}
