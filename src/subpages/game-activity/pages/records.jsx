/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import React, { useEffect, useState } from 'react'
import { View, Text } from '@tarojs/components'
import { getDrawRecords } from '@/api/game'
import Taro from '@tarojs/taro'
import { SpLoading } from '@/components'
import { useTranslation, $t } from '@/i18n'
import dayjs from 'dayjs'
import './records.scss'

const normalizeRecord = (record = {}) => {
  const prizeType = record.prizeType || record.prize_type || ''
  const prizeTitle = record.prizeTitle || record.prize_title || ''
  const prizeValue = record.prizeValue ?? record.prize_value
  const created = record.created || record.created_at || record.createTime
  const createdTs = Number(created) > 1e12 ? Number(created) : Number(created) * 1000
  const isThanks =
    prizeType === 'thanks' ||
    record.isWin === false ||
    (!prizeType && !prizeTitle)

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
  const [loading, setLoading] = useState(true)
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
      setRecords([])
      setLoading(false)
      return
    }
    setLoading(true)
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
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <View className='sp-record-layout sp-record-layout--loading'>
        <SpLoading>{$t('c7a229df.26b5bd')}</SpLoading>
      </View>
    )
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
              {record.prizeType === 'points' && !record.isThanks && (
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
