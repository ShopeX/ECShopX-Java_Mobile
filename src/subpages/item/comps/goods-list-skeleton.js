/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import React from 'react'
import { View } from '@tarojs/components'
import { classNames } from '@/utils'
import './goods-list-skeleton.scss'

/**
 * 一组骨架卡片（不含列容器），供首屏双列骨架复用。
 */
export function GoodsSkeletonItems({ count = 1, prefix = 's' }) {
  return Array.from({ length: count }).map((_, idx) => (
    <View className='goods-item-wrap goods-item-wrap--skeleton' key={`goods-skeleton__${prefix}${idx}`}>
      <View className='goods-skeleton'>
        <View className='goods-skeleton__img' />
        <View className='goods-skeleton__bd'>
          <View className='goods-skeleton__line goods-skeleton__line--title' />
          <View className='goods-skeleton__line goods-skeleton__line--title goods-skeleton__line--short' />
          <View className='goods-skeleton__line goods-skeleton__line--price' />
        </View>
      </View>
    </View>
  ))
}

/**
 * 首屏骨架屏：自带双列容器。
 * 复用 .goods-list / .left-container / .right-container 的列布局，
 * 保证骨架和真实卡片左右对齐、中缝一致。
 */
function GoodsListSkeleton({ count = 6, className }) {
  const half = Math.ceil(count / 2)

  return (
    <View className={classNames('goods-list', 'goods-list--skeleton', className)}>
      <View className='left-container'>
        <GoodsSkeletonItems count={half} prefix='l' />
      </View>
      <View className='right-container'>
        <GoodsSkeletonItems count={count - half} prefix='r' />
      </View>
    </View>
  )
}

GoodsListSkeleton.options = {
  addGlobalClass: true
}

export default React.memo(GoodsListSkeleton)
