/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import React, { useEffect, useState } from 'react'
import { View, Text } from '@tarojs/components'
import { getDrawRecords } from '@/api/game'
import Taro from '@tarojs/taro'
import { useTranslation, $t } from '@/i18n'
import dayjs from 'dayjs'
import './records.scss'

const normalizeRecord = (record = {}) => {
  const prizeType = record.prizeType || record.prize_type || ''
  const prizeTitle = record.prizeTitle || record.prize_title || ''
  const prizeValue = record.prizeValue ?? record.prize_value
  const created = record.created || record.created_at || record.createTime
  const createdTs = Number(created) > 1e12 ? Number(created) : Number(created) * 1000
  const isThanks = prizeType === 'thanks' || !prizeType
  return {
    id: record.id || record.recordId,
    prizeType,
    prizeTitle: isThanks ? $t('cb096364.8ee30c') : prizeTitle || $t('cb096364.8ee30c'),
    prizeValue,
    createdTs: createdTs || 0,
    isThanks
  }
}

const SpRecordLayout = () => {
  const { i18n } = useTranslation()
  const [records, setRecords] = useState([])
  const $instance = Taro.getCurrentInstance()
  const { params } = $instance?.router || {}
  const id = params?.id

  useEffect(() => {
    initData()
  }, [id])

  useEffect(() => {
    Taro.setNavigationBarTitle({ title: $t('c7a229df.8a69c2') })
  }, [i18n.language])

  const initData = async () => {
    if (!id) {
      console.error('加载抽奖记录失败: 缺少活动 id')
      return
    }
    try {
      const response = await getDrawRecords(id)
      const list = Array.isArray(response)
        ? response
        : response?.list || response?.data || response?.items || []
      const normalized = (list || [])
        .map(normalizeRecord)
        .sort((a, b) => b.createdTs - a.createdTs)
      setRecords(normalized)
    } catch (err) {
      console.error('加载抽奖记录失败:', err)
      setRecords([])
    }
  }

  return (
    <View className='sp-record-layout'>
      {records.length > 0 ? (
        <View className='sp-record-layout__list'>
          {records.map((record, index) => (
            <View key={record.id || index} className='sp-record-layout__item'>
              <View className='sp-record-layout__info'>
                <Text className='sp-record-layout__name'>{record.prizeTitle}</Text>
                <Text className='sp-record-layout__time'>
                  {record.createdTs
                    ? dayjs(record.createdTs).format('YYYY-MM-DD HH:mm:ss')
                    : ''}
                </Text>
              </View>
              {record.prizeType === 'points' && (
                <Text className='sp-record-layout__amount sp-record-layout__amount--points'>
                  +{record.prizeValue}
                </Text>
              )}
            </View>
          ))}
        </View>
      ) : (
        <View className='sp-record-layout__empty'>
          <Text className='sp-record-layout__empty-text'>{$t('cb096364.b60353')}</Text>
        </View>
      )}
    </View>
  )
}

export default SpRecordLayout
