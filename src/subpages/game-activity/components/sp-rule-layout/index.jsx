/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import React from 'react'
import { View, ScrollView } from '@tarojs/components'
import { AtCurtain } from 'taro-ui'
import { SpHtml } from '@/components'
import { useTranslation, $t } from '@/i18n'
import './index.scss'

const SpRuleLayout = ({ rules = '', visible = false, onClose }) => {
  useTranslation()
  return (
    <AtCurtain className='sp-rule-layout-curtain' isOpened={!!visible} onClose={onClose}>
      <View className='sp-rule-layout'>
        <View className='sp-rule-layout__title'>{$t('58fc0feb.02a217')}</View>
        <ScrollView scrollY className='sp-rule-layout__scroll'>
          <View className='sp-rule-layout__content'>
            <SpHtml content={rules || ''} />
          </View>
        </ScrollView>
      </View>
    </AtCurtain>
  )
}

export default SpRuleLayout
