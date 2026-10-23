/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  // 商户类型：多选管理分类（仅 2/3 级）[{ category_id, level, name }]
  merchantType: [],
  //经营范围（已废弃，保留字段避免旧引用报错）
  businessScope: {},
  //银行
  bank: { name: '' }
}

const merchantSlice = createSlice({
  name: 'merchant',
  initialState,
  reducers: {
    updateMerchantType: (state, { payload }) => {
      state.merchantType = Array.isArray(payload) ? payload : []
    },
    updateBusinessScope: (state, { payload }) => {
      state.businessScope = payload
    },
    updateBank: (state, { payload }) => {
      state.bank = payload
    }
  }
})

export const { updateMerchantType, updateBusinessScope, updateBank } = merchantSlice.actions

export default merchantSlice.reducer
