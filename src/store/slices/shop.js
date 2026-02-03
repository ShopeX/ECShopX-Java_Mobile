/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  shopInfo: {},
  salespersonInfo: {},
  zitiShop: null
}

const shopSlice = createSlice({
  name: 'shop',
  initialState,
  reducers: {
    updateShopInfo: (state, { payload }) => {
      state.shopInfo = payload
    },
    updateSalesperson: (state, { payload }) => {
      state.salespersonInfo = payload
    },
    changeZitiStore: (state, { payload }) => {
      state.zitiShop = payload
    }
  }
})

export const { updateShopInfo, updateSalesperson, changeZitiStore } = shopSlice.actions

export default shopSlice.reducer
