/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import React from 'react'
import { View, Text, Image } from '@tarojs/components'

import './consult-modal.scss'

/**
 * 联系顾问弹框组件
 * @param {boolean} visible - 是否显示弹框
 * @param {string} type - 弹框类型：'1'-门店二维码，'2'-导购二维码
 * @param {object} data - 弹框数据
 *   - type='1': { storeName, qrcodeUrl }
 *   - type='2': { qrcodeUrl, salespersonName, salespersonAvatar }
 * @param {function} onClose - 关闭弹框回调
 */
function ConsultModal({ visible, type, data, onClose }) {
  if (!visible || !data) return null

  const handleOverlayClick = () => {
    onClose && onClose()
  }

  const handleModalClick = (e) => {
    e.stopPropagation()
  }

  return (
    <View className='consult-modal-overlay' onClick={handleOverlayClick}>
      <View className='consult-modal' onClick={handleModalClick}>
        <View className='consult-modal-content'>
          {type === '1' ? (
            <>
              <Text className='modal-title'>{data.storeName}</Text>
              <View className='qrcode-wrap'>
                <View className='qrcode-border-outer'>
                  <View className='qrcode-border-inner'>
                    <Image
                      className='qrcode-image'
                      src={data.qrcodeUrl}
                      mode='aspectFit'
                    />
                  </View>
                </View>
                <Text className='qrcode-tip'>长按识别二维码</Text>
              </View>
            </>
          ) : (
            <>
              <Text className='modal-title'>添加导购</Text>
              <View className='qrcode-wrap'>
                <View className='qrcode-border-outer'>
                  <View className='qrcode-border-inner'>
                    <Image
                      className='qrcode-image'
                      src={data.qrcodeUrl}
                      mode='aspectFit'
                    />
                  </View>
                </View>
                <Text className='qrcode-tip'>长按扫码联系您的专属顾问</Text>
              </View>
              <View className='salesperson-info'>
                <Image
                  className='salesperson-avatar'
                  src={data.salespersonAvatar}
                  mode='aspectFill'
                />
                <View className='salesperson-text'>
                  <Text className='salesperson-label'>您的顾问</Text>
                  <Text className='salesperson-name'>{data.salespersonName}</Text>
                </View>
              </View>
            </>
          )}
        </View>
        <View className='close-btn' onClick={handleOverlayClick}>
          <Text className='iconfont icon-guanbi2'></Text>
        </View>
      </View>
    </View>
  )
}

export default ConsultModal
