/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import React, { Component } from 'react'
import Taro, { getCurrentInstance } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { AtSearchBar } from 'taro-ui'
import api from '@/api'
import { SpImage } from '@/components'
import { isWeb, isWeixin, isAlipay, classNames, linkPage } from '@/utils'
import { toggleTouchMove } from '@/utils/dom'
import { $t } from '@/i18n'
import { DEFAULT_NAVIGATE_HEIGHT } from '@/consts'

import './index.scss'

export default class SearchBar extends Component {
  static defaultProps = {
    isOpened: false,
    keyword: '',
    showDailog: true,
    showHotWords: true,
    history: true,
    localStorageKey: 'searchHistory',
    navigateHeight: DEFAULT_NAVIGATE_HEIGHT,
    immersive: false
  }

  constructor(props) {
    super(props)

    this.state = {
      searchValue: '',
      showSearchDailog: false,
      historyList: [],
      hotwordList: [],
      hotwordOffset: 0,
      historyExpanded: false,
      isShowAction: false
    }
  }

  static options = {
    addGlobalClass: true
  }

  componentDidMount() {
    if (process.env.TARO_ENV === 'h5') {
      toggleTouchMove(this.refs.container)
    }
  }

  handleFocusSearchHistory = (isOpened) => {
    this.props.onFocus?.()
    this.setState({
      showSearchDailog: isOpened,
      isShowAction: true,
      historyExpanded: false
    })
    Taro.getStorage({ key: this.props.localStorageKey })
      .then((res) => {
        let stringArr = res.data.split(',').filter((item) => {
          const isHave = item.trim()
          return isHave
        })
        this.setState({ historyList: stringArr })
      })
      .catch(() => {})
    if (this.props.showHotWords) {
      this.loadHotwords()
    }
  }

  loadHotwords = async () => {
    try {
      const res = await api.item.getSearchHotwords()
      const list = Array.isArray(res?.list) ? res.list : []
      this.setState({ hotwordList: list, hotwordOffset: 0 })
    } catch (e) {
      this.setState({ hotwordList: [], hotwordOffset: 0 })
    }
  }

  handleRefreshHotwords = () => {
    const { hotwordList, hotwordOffset } = this.state
    if (hotwordList.length <= 8) {
      this.loadHotwords()
      return
    }
    this.setState({ hotwordOffset: (hotwordOffset + 8) % hotwordList.length })
  }

  handleChangeSearch = (value, event) => {
    //h5中value为空 需从event里面拿值
    // value = value.replace(/\s+/g,'')
    this.props.onChange?.(isWeb ? event?.detail?.value : value)
  }

  handleClear = () => {
    this.props.onClear()
  }

  handleConfirm = (e) => {
    const keywords = e.detail.value.trim()
    if (keywords) {
      const value = Taro.getStorageSync(this.props.localStorageKey)
      let defaultValue = []
      if (value) {
        const array = value.split(',')
        if (!array.includes(keywords)) {
          array.unshift(keywords)
        }
        defaultValue = array
      } else {
        defaultValue.push(keywords)
      }
      Taro.setStorage({ key: this.props.localStorageKey, data: defaultValue.toString() })
      this.props.onConfirm(e.detail.value)
    }
    this.setState({
      showSearchDailog: false,
      isShowAction: false
    })
  }

  handleClickCancel = (isOpened) => {
    this.props.onCancel?.()
    this.setState({
      showSearchDailog: isOpened,
      isShowAction: false
    })
    this.handleClear()
  }

  handleClickDelete = () => {
    Taro.removeStorage({ key: this.props.localStorageKey }).then(() => {
      this.setState({ historyList: [], historyExpanded: false })
    })
  }

  handleExpandHistory = () => {
    this.setState({ historyExpanded: true })
  }

  handleClickTag = (item) => {
    this.props.onConfirm(item)
    this.setState({
      showSearchDailog: false,
      isShowAction: false
    })
  }

  handleClickHotItem = (item) => {
    if (item?.jump_page) {
      try {
        const jump = JSON.parse(item.jump_page)
        if (jump?.linkPage) {
          this.setState({ showSearchDailog: false, isShowAction: false })
          linkPage(jump)
          return
        }
      } catch (e) {
        // ignore
      }
    }
    const keyword = String(item?.content || '').trim()
    if (keyword) {
      this.handleClickTag(keyword)
    }
  }

  handleBlurSearch = () => {
    this.props.onBlur?.()
  }

  /** 与 SpPage body 的 padding-top 同值：custom 导航时算法与 SpPage 内一致；可传 navBarInsetPx 覆盖（如 H5 仅靠 pageConfig 自定义顶栏时） */
  resolveNavBarInsetPx() {
    const { immersive, navigateHeight, navBarInsetPx } = this.props
    if (immersive) return 0
    if (navBarInsetPx != null && navBarInsetPx !== '') return Number(navBarInsetPx) || 0

    const nh = navigateHeight ?? DEFAULT_NAVIGATE_HEIGHT
    if (getCurrentInstance()?.page?.config?.navigationStyle !== 'custom') return 0

    if (isWeixin || isAlipay) {
      try {
        const mb = Taro.getMenuButtonBoundingClientRect()
        return Math.floor(mb.bottom + (nh - mb.height) / 2)
      } catch (e) {
        return 0
      }
    }
    if (isWeb) return nh
    return 0
  }

  render() {
    const { isFixed, keyword, showDailog, placeholder, showHotWords, history } = this.props
    const { showSearchDailog, historyList, hotwordList, hotwordOffset, historyExpanded, isShowAction } =
      this.state
    const historyNeedExpand = !historyExpanded && historyList.length > 2
    let visibleHotwords = []
    if (showHotWords && hotwordList.length) {
      if (hotwordList.length <= 8) {
        visibleHotwords = hotwordList
      } else {
        for (let i = 0; i < 8; i += 1) {
          visibleHotwords.push(hotwordList[(hotwordOffset + i) % hotwordList.length])
        }
      }
    }
    const navInsetPx = showSearchDailog ? this.resolveNavBarInsetPx() : 0
    // 与 SpPage body 一致用 padding-top 留白；高度显式给出，避免仅 bottom:0 时未撑满
    const focusOverlayStyle = showSearchDailog
      ? {
          paddingTop: `${navInsetPx}px`,
          boxSizing: 'border-box',
          ...(showDailog ? { height: '100vh' } : {})
        }
      : undefined

    return (
      <View
        className={classNames(
          'search-input',
          isFixed ? 'search-input-fixed' : null,
          showSearchDailog ? 'search-input__focus' : null,
          !showDailog && 'without-dialog'
        )}
        style={focusOverlayStyle}
      >
        {/* {微信浏览器form enter自动刷新页面} */}
        <View className='search-input__form'>
          <AtSearchBar
            className='search-input__bar'
            value={keyword}
            placeholder={!placeholder ? $t('377a1681.cd11be') : placeholder}
            actionName={$t('61e2d21a.625fb2')}
            showActionButton={isShowAction}
            onFocus={this.handleFocusSearchHistory.bind(this, true)}
            onBlur={this.handleBlurSearch.bind(this)}
            onClear={this.handleClear}
            onChange={this.handleChangeSearch.bind(this)}
            onConfirm={this.handleConfirm.bind(this)}
            onActionClick={this.handleClickCancel.bind(this, false)}
          />
        </View>
        {/* 历史搜索 */}
        {showDailog && (
          <View
            className={classNames(
              showSearchDailog ? 'search-input__history' : 'search-input__history-none'
            )}
          >
            {history !== false ? (
              <>
                <View className='search-input__history-title'>
                  <Text>{$t('7fa435fc.e8cb95')}</Text>
                  <Text className='clear-history' onClick={this.handleClickDelete.bind(this)}>
                    {$t('7fa435fc.4bf6fd')}
                  </Text>
                </View>
                <View className='search-input__history-list'>
                  <View
                    className={classNames('search-input__history-tags', {
                      'search-input__history-tags--fold': historyNeedExpand
                    })}
                  >
                    {historyList.map((item, index) => (
                      <View
                        className='search-input__history-tags__btn'
                        key={`${index}1`}
                        onClick={this.handleClickTag.bind(this, item)}
                      >
                        {item}
                      </View>
                    ))}
                  </View>
                  {historyNeedExpand ? (
                    <View
                      className='search-input__history-expand'
                      onClick={this.handleExpandHistory.bind(this)}
                    >
                      <View className='at-icon at-icon-chevron-down' />
                    </View>
                  ) : null}
                </View>
              </>
            ) : null}
            {showHotWords && visibleHotwords.length > 0 ? (
              <>
                <View className='search-input__history-title hot-title'>
                  <Text>{$t('7fa435fc.b8e4c1')}</Text>
                  <View
                    className='search-input__hot-refresh'
                    onClick={this.handleRefreshHotwords.bind(this)}
                  >
                    <View className='at-icon at-icon-reload' />
                  </View>
                </View>
                <View className='search-input__hot-list'>
                  {visibleHotwords.map((item, index) => {
                    if (item.type === 'image' && item.image_url) {
                      return (
                        <View
                          className='search-input__hot-tag search-input__hot-tag--image'
                          key={item.id || index}
                          onClick={this.handleClickHotItem.bind(this, item)}
                        >
                          <SpImage src={item.image_url} width={200} height={40} mode='aspectFit' />
                        </View>
                      )
                    }
                    return (
                      <View
                        className='search-input__hot-tag'
                        key={item.id || index}
                        style={{
                          color: item.text_color || '#333333',
                          backgroundColor: item.background_color || '#f2f2f2',
                          borderColor:
                            item.background_color && item.background_color !== '#f2f2f2'
                              ? 'transparent'
                              : 'rgba(0, 0, 0, 0.1)'
                        }}
                        onClick={this.handleClickHotItem.bind(this, item)}
                      >
                        {item.icon_url ? (
                          <SpImage
                            className='search-input__hot-tag-icon'
                            src={item.icon_url}
                            width={32}
                            height={32}
                          />
                        ) : null}
                        <Text className='search-input__hot-tag-text'>{item.content}</Text>
                      </View>
                    )
                  })}
                </View>
              </>
            ) : null}
          </View>
        )}
      </View>
    )
  }
}
