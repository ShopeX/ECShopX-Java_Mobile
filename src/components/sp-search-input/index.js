/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import React, { useEffect, useMemo } from 'react'
import { useTranslation, $t } from '@/i18n'
import Taro, { getCurrentInstance } from '@tarojs/taro'
import { View, Text, Icon, Picker } from '@tarojs/components'
import { useImmer } from 'use-immer'
import { SpInput as AtInput } from '@/components'
import SpAddress from '../sp-address'
import './index.scss'

const initialState = {
  keywords: '',
  selectArea: [],
  isSpAddressOpened: false,
  searchConditionVis: false,
  searchCondition: ''
}
function SpSearchInput(props) {
  const { i18n } = useTranslation()
  const {
    placeholder,
    isFixTop,
    isShowArea = false,
    isShowSearchCondition = false,
    searchConditionList: searchConditionListProp,
    onConfirm = () => {},
    onSelectArea = () => {},
    onHandleSearch = () => {}
  } = props
  const searchConditionList = useMemo(() => {
    if (searchConditionListProp && searchConditionListProp.length > 0) {
      return searchConditionListProp
    }
    return [
      { label: $t('468bf441.8098e2'), value: 'phone' },
      { label: $t('468bf441.83b0d2'), value: 'custonmerName' }
    ]
  }, [searchConditionListProp, i18n.language])
  const resolvedPlaceholder = useMemo(
    () => (placeholder !== undefined && placeholder !== null ? placeholder : $t('78eb15d3.e5f71f')),
    [placeholder, i18n.language]
  )
  const [state, setState] = useImmer(initialState)

  const { keywords, selectArea, isSpAddressOpened, searchCondition, searchConditionVis } = state

  useEffect(() => {
    if (!isShowSearchCondition) return
    let searchConditionDefault = searchConditionList.length ? searchConditionList[0].value : ''
    setState((draft) => {
      draft.searchCondition = searchConditionDefault
    })
  }, [searchConditionList, isShowSearchCondition])

  const handleChangeSearch = (e) => {
    setState((draft) => {
      draft.keywords = e
    })
  }

  const handleConfirm = () => {
    if (!isShowSearchCondition) {
      onConfirm(keywords)
    } else {
      onConfirm({ key: searchCondition, keywords })
    }
  }

  // 省市区切换
  const onPickerChange = ([{ label: province }, { label: city }, { label: area }]) => {
    setState((draft) => {
      draft.selectArea = [province, city, area]
    })
    onSelectArea && onSelectArea({ type: 'area', value: [province, city, area] })
  }

  const getSearchConditionLabel = useMemo(() => {
    return searchConditionList.find((item) => item.value == searchCondition)?.label || ''
  }, [searchCondition])

  const handleSearchConditionChange = (e) => {
    let searchConditionNew = searchConditionList[e.target.value]?.value || ''
    // console.log(searchConditionNew)
    setState((draft) => {
      draft.searchCondition = searchConditionNew
    })
    console.log(searchConditionList[e.target.value], 'llllll')
    onHandleSearch(searchConditionList[e.target.value])
  }

  const handleAreaDelet = (e) => {
    e.stopPropagation()
    setState((draft) => {
      draft.selectArea = []
    })
    onSelectArea && onSelectArea({ type: 'area', value: [] })
  }

  return (
    <View className='sp-search-input'>
      {isShowArea && (
        <View
          className='area'
          onClick={() => {
            setState((draft) => {
              draft.isSpAddressOpened = true
            })
          }}
        >
          <View className='area-val'>{selectArea.join('') || $t('5663b3fe.f26489')}</View>
          {selectArea.length > 0 ? (
            <View className='iconfont icon-guanbi area-clear-icon' onClick={handleAreaDelet}></View>
          ) : (
            <View className='iconfont icon-arrowDown area-icon'></View>
          )}
        </View>
      )}
      <View className='search-input'>
        {isShowSearchCondition && (
          <>
            <Picker
              mode='selector'
              rangeKey='label'
              range={searchConditionList}
              onChange={handleSearchConditionChange}
            >
              <View
                className='search-condition'
                onClick={() => {
                  setState((draft) => {
                    draft.searchConditionVis = true
                  })
                }}
              >
                {getSearchConditionLabel}
                <View className='iconfont icon-arrowDown search-condition-icon'></View>
              </View>
            </Picker>
          </>
        )}

        {!isShowSearchCondition && <View className='iconfont icon-sousuo-01'></View>}

        <AtInput
          value={keywords}
          name='keywords'
          placeholder={resolvedPlaceholder}
          onChange={handleChangeSearch}
          onBlur={handleConfirm}
        />
      </View>

      <SpAddress
        isOpened={isSpAddressOpened}
        onClose={() => {
          setState((draft) => {
            draft.isSpAddressOpened = false
          })
        }}
        onChange={onPickerChange}
      />
    </View>
  )
}

SpSearchInput.options = {
  addGlobalClass: true
}

export default SpSearchInput
