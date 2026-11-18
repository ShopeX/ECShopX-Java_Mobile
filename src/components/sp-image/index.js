/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import React, { useMemo, useRef, useEffect } from 'react'
import { useImmer } from 'use-immer'
import Taro from '@tarojs/taro'
import { View, Image, Text } from '@tarojs/components'
import { classNames, isBase64 } from '@/utils'
import './index.scss'

// H5 端图片多少毫秒还没触发 onLoad 就回落到默认图，避免卡片永久空白
const H5_IMAGE_LOAD_TIMEOUT = 4000

function getImageCdnBase() {
  return process.env.APP_IMAGE_CDN || ''
}

/**
 * 清洗图片地址：接口里偶有被多余引号包裹的脏数据（如 `"https://xxx.png`），
 * 不过滤会被当成相对路径拼到 CDN 后面，最终 404。
 */
function sanitizeImageSrc(src) {
  if (typeof src !== 'string') return src
  return src.trim().replace(/^["'\s]+/, '').replace(/["'\s]+$/, '')
}

function isAbsoluteImageSrc(src) {
  if (!src || typeof src !== 'string') return false
  const trimmed = sanitizeImageSrc(src)
  return /^(https?:|\/\/|wxfile:|cloud:|data:)/i.test(trimmed)
}

/** 相对路径拼接 CDN，避免双斜杠；无 CDN 时保留以 / 开头的路径 */
function joinImageCdn(src) {
  const path = (src || 'default_img.png').replace(/^\/+/, '')
  const base = getImageCdnBase().replace(/\/+$/, '')
  if (!base) {
    return src?.startsWith('/') ? src : `/${path}`
  }
  return `${base}/${path}`
}

function resolveImageSrc(src) {
  if (!src) {
    return joinImageCdn('default_img.png')
  }
  if (isBase64(src)) {
    return src
  }
  const trimmed = sanitizeImageSrc(src)
  if (!trimmed) {
    return joinImageCdn('default_img.png')
  }
  if (/^\/\//.test(trimmed)) {
    return `https:${trimmed}`
  }
  if (isAbsoluteImageSrc(trimmed)) {
    return trimmed
  }
  return joinImageCdn(trimmed)
}

function getDiskDriver() {
  try {
    return Taro.getStorageSync('otherSetting')?.disk_driver || 'qiniu'
  } catch {
    return 'qiniu'
  }
}

/** 仅质量 + WebP，不缩放；需与 otherSetting.disk_driver 一致，否则 CDN 400 */
function appendImageProcess(url, { quality, ossWebp }) {
  if (
    url.indexOf('x-oss-process') >= 0 ||
    url.indexOf('imageView2') >= 0 ||
    url.indexOf('imageMogr2') >= 0
  ) {
    return url
  }
  const q = quality != null ? quality : 80
  const sep = url.indexOf('?') >= 0 ? '&' : '?'
  const disk = getDiskDriver()

  if (disk === 'oss') {
    const ossParams = [`quality,Q_${q}`]
    if (ossWebp !== false) {
      ossParams.push('format,webp')
    }
    return `${url}${sep}x-oss-process=image/${ossParams.join('/')}`
  }

  if (disk === 'qiniu') {
    let fop = `imageMogr2/quality/${q}`
    if (ossWebp !== false) {
      fop += '/format/webp'
    }
    return `${url}${sep}${fop}`
  }

  return url
}

function SpImage(props) {
  // 状态管理：加载成功/失败状态
  const [state, setState] = useImmer({
    loadSuccess: false,
    isError: false,
    // 原图加载不出来时回落到默认图，避免卡片一直空白
    useFallback: false
  })

  const imageRef = useRef(null)
  const isWeb = Taro.getEnv() === 'WEB'

  // H5 端不要打开 Taro 的 lazyLoad：它的实现是在 IntersectionObserver 命中前不给
  // 内层 img 赋 src，一旦观察器漏触发（快速滑动 / 容器尺寸变化）图片就永久空白，
  // 且没有任何兜底。浏览器自己的加载策略足够，这里让 src 始终有效。
  const lazyLoad = isWeb ? false : props.lazyLoad ?? false

  // 计算最终图片URL（关键：避免OSS参数乱序导致重复请求）
  const imgUrl = useMemo(() => {
    let url = resolveImageSrc(state.useFallback ? '' : props.src)
    const isOssUrl = props.isOss && /^https?:\/\//i.test(url)

    // 与 sp-img 一致：仅当前存储为 oss/qiniu 时追加处理参数（七牛 URL 拼 x-oss-process 会 400）
    if (!isBase64(url) && isOssUrl) {
      url = appendImageProcess(url, {
        quality: props.quality,
        ossWebp: props.ossWebp
      })
    }

    return url
  }, [props.src, props.isOss, props.quality, props.ossWebp, state.useFallback])

  // 换图（列表翻页 / 数据更新）时重置加载状态，否则新图不会重新走淡入
  const prevSrcRef = useRef(props.src)
  useEffect(() => {
    if (prevSrcRef.current === props.src) return
    prevSrcRef.current = props.src
    setState((draft) => {
      draft.loadSuccess = false
      draft.isError = false
      draft.useFallback = false
    })
  }, [props.src])

  // H5 兜底：onLoad 没来（元素没渲染 / 请求被吞）时不能让图片一直 opacity:0
  useEffect(() => {
    if (!isWeb || state.loadSuccess || state.isError) return undefined
    const timer = setTimeout(() => {
      setState((draft) => {
        if (draft.loadSuccess || draft.isError) return
        const innerImg = imageRef.current?.querySelector?.('img')
        // 内层 img 压根没有 src，说明 Taro 的 Image 组件没初始化，换默认图兜住
        if (!innerImg?.getAttribute?.('src')) {
          draft.useFallback = true
        }
        // 还在加载中的图也先放出来，别让骨架屏一直盖着
        draft.loadSuccess = true
      })
    }, H5_IMAGE_LOAD_TIMEOUT)
    return () => clearTimeout(timer)
  }, [imgUrl, state.loadSuccess, state.isError, isWeb])

  // 计算容器高度（基于宽高比）
  const containerHeight = useMemo(() => {
    if (props.ratio?.length === 2) {
      const [wRatio, hRatio] = props.ratio
      return (props.width * hRatio) / wRatio
    }
    return props.height
  }, [props.ratio, props.width, props.height])

  // 容器样式（确保尺寸稳定，避免布局抖动）
  const containerStyle = useMemo(() => {
    const style = {}
    if (props.width) style.width = Taro.pxTransform(props.width)
    if (containerHeight) style.height = Taro.pxTransform(containerHeight)
    return style
  }, [props.width, containerHeight])

  // 图片加载成功回调
  const handleLoad = (e) => {
    props.onLoad?.(e)
    setState((draft) => {
      draft.loadSuccess = true
      draft.isError = false
    })
  }

  // 图片加载失败回调
  const handleError = (e) => {
    props.onError?.(e)
    setState((draft) => {
      draft.isError = true
      // 原图挂了就换默认图；默认图也挂了就停在这里，别让骨架屏一直闪
      draft.loadSuccess = Boolean(draft.useFallback)
      draft.useFallback = true
    })
  }

  // 最终渲染的样式（合并基础样式和用户自定义样式）
  const imageStyle = useMemo(
    () => ({
      ...computedStyle(props), // 基础尺寸/圆角样式
      ...props.style, // 用户自定义样式
      borderRadius: Taro.pxTransform(props.circle || props.radius) // 圆角优先级：circle > radius
    }),
    [props.width, props.height, props.radius, props.style, props.circle]
  )

  // mode 修饰类（按需开启 preserveRatio）：H5 端 Taro 只给内层 img 约束了宽度（height 交给 auto），
  // 而组件样式里有 height:100%，等比素材会被拉扁；开启后按 mode 放行高度 / 设置 object-fit。
  // 默认不开，避免影响其他固定尺寸瓦片；小程序端无内层 img，原生 mode 已处理，这些选择器不命中
  const mode = props.mode || 'widthFix'
  const modeClass = props.preserveRatio
    ? `sp-image-content--${mode.replace(/([A-Z])/g, '-$1').toLowerCase()}`
    : ''

  return (
    <View
      className={classNames('sp-image-container sp-image', props.className)}
      style={{ ...containerStyle, ...props.style }}
    >
      {/* 加载占位区域（加载完成后淡出，与图片淡入过渡衔接） */}
      <View
        className={classNames('sp-image-placeholder', {
          'sp-image-placeholder--hidden': state.loadSuccess
        })}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: Taro.pxTransform(props.circle || props.radius),
          backgroundColor: props.placeholderColor
        }}
      />

      {/* 实际图片组件（加载完成后淡入） */}
      <Image
        ref={imageRef}
        className={classNames('sp-image-content', modeClass, {
          'sp-image--loaded': state.loadSuccess
        })}
        src={imgUrl}
        mode={mode}
        onLoad={handleLoad}
        onError={handleError}
        showMenuByLongpress={props.isShowMenuByLongpress ?? true}
        onClick={props.onClick}
        lazyLoad={lazyLoad}
        style={imageStyle}
      />
    </View>
  )
}

// 计算基础尺寸样式（宽高/圆角）
const computedStyle = (props) => {
  const style = {}
  if (props.width) style.width = Taro.pxTransform(props.width)
  if (props.height) style.height = Taro.pxTransform(props.height)
  if (props.radius) style.borderRadius = Taro.pxTransform(props.radius)
  return style
}

SpImage.options = {
  addGlobalClass: true
}

SpImage.defaultProps = {
  radius: 0,
  className: '',
  circle: false,
  height: '',
  lazyLoad: false,
  isOss: true,
  isShowMenuByLongpress: true,
  mode: 'widthFix',
  // H5 端按素材真实比例渲染（widthFix/heightFix/aspectFill/aspectFit），不拉伸
  preserveRatio: false,
  ratio: [],
  src: '',
  width: '',
  quality: 80, // OSS 质量 1–100
  ossWebp: true, // 输出 WebP 减小体积，设为 false 可关闭
  placeholderColor: 'transparent',
  onClick: () => {},
  onError: () => {},
  onLoad: () => {}
}

export default React.memo(SpImage)
