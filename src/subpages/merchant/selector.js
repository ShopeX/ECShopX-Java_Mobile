/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import Taro, { useRouter } from '@tarojs/taro'
import { Text, View, ScrollView } from '@tarojs/components'
import { useEffect, useMemo, useRef } from 'react'
import { SpSearchBar, SpPage, SpScrollView, SpImage } from '@/components'
import api from '@/api'
import * as merchantApi from '@/api/merchant'
import { useSelector, useDispatch } from 'react-redux'
import { updateMerchantType, updateBank } from '@/store/slices/merchant'
import { useImmer } from 'use-immer'
import { classNames, showToast } from '@/utils'
import { useTranslation, $t } from '@/i18n'
import { MCell, MButton } from './comps'
import { MERCHANT_TYPE, BANG_NAME, PLACEHOLDER_SELECTOR_KEY } from './consts'
import { splitMatch } from './util'
import './selector.scss'

const initialState = {
  list: [],
  tree: [],
  name: '',
  //表示正在搜索的词
  searchingName: '',
  // 已选分类 [{ category_id, level, name }]
  selected: []
}

/** 规范化分类树，补齐 level（优先 category_level） */
const normalizeTree = (nodes = [], depth = 1) =>
  (nodes || []).map((node) => {
    const level = Number(node.category_level) || depth
    const children = normalizeTree(node.children || [], depth + 1)
    return {
      ...node,
      category_id: node.category_id,
      category_name: node.category_name,
      level,
      children
    }
  })

const toSelectItem = (node) => ({
  category_id: node.category_id,
  level: node.level,
  name: node.category_name
})

const findL2Parent = (tree, l3Id) => {
  for (const l1 of tree || []) {
    for (const l2 of l1.children || []) {
      if ((l2.children || []).some((c) => String(c.category_id) === String(l3Id))) {
        return l2
      }
    }
  }
  return null
}

const findL2Node = (tree, l2Id) => {
  for (const l1 of tree || []) {
    const found = (l1.children || []).find((l2) => String(l2.category_id) === String(l2Id))
    if (found) return found
  }
  return null
}

const upsertSelected = (list, item) => {
  const idx = list.findIndex((i) => String(i.category_id) === String(item.category_id))
  if (idx < 0) list.push(item)
}

const removeSelected = (list, id) => {
  const idx = list.findIndex((i) => String(i.category_id) === String(id))
  if (idx >= 0) list.splice(idx, 1)
}

/** 回显：父级已选时勾上全部子级；子级全选时勾上父级 */
const expandSelectionForUI = (selected = [], tree = []) => {
  const result = []
  const ids = new Set()
  selected.forEach((item) => {
    upsertSelected(result, item)
    ids.add(String(item.category_id))
  })

  selected.forEach((item) => {
    if (item.level !== 2) return
    const l2 = findL2Node(tree, item.category_id)
    ;(l2?.children || []).forEach((l3) => {
      if (!ids.has(String(l3.category_id))) {
        upsertSelected(result, toSelectItem(l3))
        ids.add(String(l3.category_id))
      }
    })
  })

  tree.forEach((l1) => {
    ;(l1.children || []).forEach((l2) => {
      const children = l2.children || []
      if (
        children.length &&
        children.every((c) => ids.has(String(c.category_id))) &&
        !ids.has(String(l2.category_id))
      ) {
        upsertSelected(result, toSelectItem(l2))
        ids.add(String(l2.category_id))
      }
    })
  })

  return result
}

/** 提交：父级已选则只保留父级（不展开存子级） */
const normalizeSelectionForSubmit = (selected = [], tree = []) => {
  const selectedIds = new Set(selected.map((s) => String(s.category_id)))
  return selected.filter((item) => {
    if (item.level !== 3) return true
    const parent = findL2Parent(tree, item.category_id)
    return !(parent && selectedIds.has(String(parent.category_id)))
  })
}

/** 勾选框：未选 / 全选 / 半选 */
const CategoryCheck = ({ status = 'unchecked', onClick }) => (
  <View
    className={classNames('category-check', {
      'is-checked': status === 'checked',
      'is-indeterminate': status === 'indeterminate'
    })}
    onClick={(e) => {
      e.stopPropagation()
      onClick && onClick()
    }}
  >
    {status === 'checked' && <Text className='iconfont icon-gou' />}
    {status === 'indeterminate' && <View className='category-check__dash' />}
  </View>
)

const Selector = () => {
  useTranslation()
  const [state, setState] = useImmer(initialState)
  const dispatch = useDispatch()
  const selectsRef = useRef()
  const {
    params: { type }
  } = useRouter()
  const isBank = type === BANG_NAME
  const isCategory = type === MERCHANT_TYPE
  const merchantType = useSelector((s) => s.merchant.merchantType)

  useEffect(() => {
    if (!isCategory) return
    loadCategoryTree()
  }, [])

  const loadCategoryTree = async () => {
    try {
      const res = await api.category.get({
        is_main_category: true,
        distributor_id: 0
      })
      const tree = normalizeTree(Array.isArray(res) ? res : res?.list || [])
      const selected = expandSelectionForUI(
        Array.isArray(merchantType) ? merchantType : [],
        tree
      )
      setState((v) => {
        v.tree = tree
        v.selected = selected
      })
    } catch (e) {
      // 请求层已 toast
    }
  }

  const fetch = async ({ pageIndex: page, pageSize }) => {
    let params = {
      page,
      page_size: pageSize
    }
    const { searchingName } = state
    if (isBank) {
      params.bank_name = searchingName
    }
    const res = await merchantApi.bank_list(params)
    await setState((v) => {
      v.list = [...v.list, ...res.list]
    })
    return {
      total: res.total_count
    }
  }

  //点击搜索框搜索
  const handleConfirm = async (val) => {
    await setState((v) => {
      v.list = []
      v.name = val
      v.searchingName = val
    })
    if (isCategory) return
    selectsRef.current.reset()
  }

  const handleClickBank = ({ bank_name }) => {
    dispatch(
      updateBank({
        name: bank_name
      })
    )
    Taro.navigateBack()
  }

  const isSelected = (category_id) =>
    state.selected.some((item) => String(item.category_id) === String(category_id))

  /** 二级：有子级时支持半选；三级仅全选/未选 */
  const getCheckStatus = (node) => {
    if (node.level === 2) {
      const children = node.children || []
      if (children.length) {
        const count = children.filter((child) => isSelected(child.category_id)).length
        if (count === 0) return 'unchecked'
        if (count === children.length) return 'checked'
        return 'indeterminate'
      }
    }
    return isSelected(node.category_id) ? 'checked' : 'unchecked'
  }

  const setSelect = (node, checked) => {
    if (node.level !== 2 && node.level !== 3) return
    setState((v) => {
      if (node.level === 2) {
        const children = node.children || []
        if (checked) {
          upsertSelected(v.selected, toSelectItem(node))
          children.forEach((child) => upsertSelected(v.selected, toSelectItem(child)))
        } else {
          removeSelected(v.selected, node.category_id)
          children.forEach((child) => removeSelected(v.selected, child.category_id))
        }
        return
      }

      // level 3：联动父级
      if (checked) {
        upsertSelected(v.selected, toSelectItem(node))
      } else {
        removeSelected(v.selected, node.category_id)
      }
      const parent = findL2Parent(v.tree, node.category_id)
      if (!parent) return
      const siblings = parent.children || []
      const allChecked =
        siblings.length > 0 &&
        siblings.every((child) =>
          v.selected.some((item) => String(item.category_id) === String(child.category_id))
        )
      if (allChecked) {
        upsertSelected(v.selected, toSelectItem(parent))
      } else {
        removeSelected(v.selected, parent.category_id)
      }
    })
  }

  const toggleSelect = (node) => {
    // 半选点击 → 全选；已全选 → 取消；未选 → 全选
    const status = getCheckStatus(node)
    setSelect(node, status !== 'checked')
  }

  const handleConfirmCategory = () => {
    const payload = normalizeSelectionForSubmit(state.selected, state.tree)
    if (!payload.length) {
      showToast($t('3c94bb91.2456c8'))
      return
    }
    dispatch(updateMerchantType(payload))
    Taro.navigateBack()
  }

  const handleSearchOff = () => {
    setState((v) => {
      v.name = ''
    })
  }

  const handleOnClear = async () => {
    await setState((v) => {
      v.name = ''
      v.list = []
      v.searchingName = ''
    })
    if (isCategory) return
    selectsRef.current.reset()
  }

  const handleOnChange = async (val) => {
    await setState((v) => {
      v.name = val
    })
  }

  const handleBlur = () => {
    setState((v) => {
      v.name = ''
    })
  }

  const renderEmpty = (
    <View className='render-empty'>
      <SpImage src='empty_goods.png' />
      <View className='title'>{$t('93c6df11.e06442')}</View>
    </View>
  )
  const { list, name, searchingName, tree, selected } = state

  const filteredTree = useMemo(() => {
    if (!searchingName) return tree
    const kw = searchingName.trim().toLowerCase()
    if (!kw) return tree
    return tree
      .map((l1) => {
        const children = (l1.children || [])
          .map((l2) => {
            const l2Match = (l2.category_name || '').toLowerCase().includes(kw)
            const l3List = (l2.children || []).filter((l3) =>
              (l3.category_name || '').toLowerCase().includes(kw)
            )
            if (l2Match || l3List.length) {
              return {
                ...l2,
                children: l2Match ? l2.children || [] : l3List
              }
            }
            return null
          })
          .filter(Boolean)
        if ((l1.category_name || '').toLowerCase().includes(kw) || children.length) {
          return { ...l1, children }
        }
        return null
      })
      .filter(Boolean)
  }, [tree, searchingName])

  const renderTitle = (item) => {
    const title = item.bank_name

    if (!searchingName) return title

    const matches = splitMatch(title, searchingName)

    return (
      <View className='flex'>
        {matches.map((item, index) => (
          <Text key={index} className={classNames({ 'primary-color': item.checked })}>
            {item.label}
          </Text>
        ))}
      </View>
    )
  }

  const renderCategoryName = (title) => {
    if (!searchingName) return title
    const matches = splitMatch(title || '', searchingName)
    return (
      <View className='flex'>
        {matches.map((item, index) => (
          <Text key={index} className={classNames({ 'primary-color': item.checked })}>
            {item.label}
          </Text>
        ))}
      </View>
    )
  }

  const renderCategoryTree = () => {
    if (!filteredTree.length) return renderEmpty

    return (
      <View className='category-tree'>
        {filteredTree.map((l1) => (
          <View key={l1.category_id} className='category-tree-group'>
            <View className='category-tree-l1'>
              <Text className='category-tree-l1__name'>{renderCategoryName(l1.category_name)}</Text>
            </View>
            {(l1.children || []).map((l2) => {
              const hasL3 = (l2.children || []).length > 0
              return (
                <View key={l2.category_id} className='category-tree-l2-wrap'>
                  <View className='category-tree-row level-2'>
                    <CategoryCheck status={getCheckStatus(l2)} onClick={() => toggleSelect(l2)} />
                    <View className='category-tree-row__main' onClick={() => toggleSelect(l2)}>
                      <Text className='category-tree-row__name'>
                        {renderCategoryName(l2.category_name)}
                      </Text>
                    </View>
                  </View>
                  {hasL3 &&
                    (l2.children || []).map((l3) => (
                      <View
                        key={l3.category_id}
                        className='category-tree-row level-3'
                        onClick={() => toggleSelect(l3)}
                      >
                        <CategoryCheck
                          status={getCheckStatus(l3)}
                          onClick={() => toggleSelect(l3)}
                        />
                        <Text className='category-tree-row__name'>
                          {renderCategoryName(l3.category_name)}
                        </Text>
                      </View>
                    ))}
                </View>
              )
            })}
          </View>
        ))}
      </View>
    )
  }

  return (
    <SpPage
      className='page-merchant-selector'
      showNavitionLeft={false}
      btnHomeEnable={false}
    >
      {/* 商户类型多选不需要搜索；银行列表仍保留搜索 */}
      {!isCategory && (
        <View className='page-merchant-selector-inputwrapper'>
          <SpSearchBar
            keyword={name}
            className='sp-page-selector-input'
            placeholder={$t(PLACEHOLDER_SELECTOR_KEY[type])}
            onConfirm={handleConfirm}
            onCancel={handleSearchOff}
            onClear={handleOnClear}
            onChange={handleOnChange}
            onBlur={handleBlur}
          />
        </View>
      )}

      {isCategory ? (
        <View className='selector-category'>
          <ScrollView scrollY className='selector-category-scroll'>
            <View className='page-merchant-selector-content'>
              <View className='card'>{renderCategoryTree()}</View>
            </View>
          </ScrollView>
          <View className='selector-category-footer'>
            <Text className='selector-category-footer__count'>
              {selected.length > 0 ? `已选 ${selected.length} 项` : '请选择二级或三级分类'}
            </Text>
            <MButton className='selector-category-footer__btn' onClick={handleConfirmCategory}>
              {$t('61e2d21a.e83a25')}
            </MButton>
          </View>
        </View>
      ) : (
        <SpScrollView
          scrollY
          fetch={fetch}
          className='selector-scroll'
          ref={selectsRef}
          renderEmpty={renderEmpty}
        >
          <View className='page-merchant-selector-content'>
            <View className='card'>
              {list.map((item, index) => (
                <MCell
                  key={index}
                  title={renderTitle(item)}
                  noselect
                  onClick={() => handleClickBank(item)}
                />
              ))}
            </View>
          </View>
        </SpScrollView>
      )}
    </SpPage>
  )
}

export default Selector
