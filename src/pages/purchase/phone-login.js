import React from 'react'
import { View, Text, Button } from '@tarojs/components'
import { SpImage, SpPurchaseEnterpriseBar } from '@/components'
import { classNames } from '@/utils'
import './phone-login.scss'

function PurchasePhoneLogin({
  activityBg,
  appName,
  checked,
  onConfirm,
  onRequirePolicy,
  onBindPhone
}) {
  const handleConfirm = () => {
    if (!checked) {
      onRequirePolicy?.()
      return
    }
    onConfirm?.()
  }

  return (
    <View className='purchase-phone-auth'>
      <SpImage src={activityBg} className='purchase-phone-auth__cover-img' mode='widthFix' />
      <SpPurchaseEnterpriseBar name={appName || '企业购'} showMore={false} showSearch={false} />

      <View className='purchase-phone-auth__form-wrap'>
        <View className='purchase-phone-auth__form-card'>
          <Text className='purchase-phone-auth__form-title'>请完成身份校验</Text>
          <View className='purchase-phone-auth__field'>
            <Text className='purchase-phone-auth__hint'>请授权手机号以继续</Text>
          </View>

          <View className='purchase-phone-auth__footer'>
            <Button
              className={classNames('purchase-phone-auth__confirm', {
                'purchase-phone-auth__confirm--disabled': !checked
              })}
              openType='getPhoneNumber'
              onGetPhoneNumber={onBindPhone}
              onClick={handleConfirm}
            >
              <Text className='purchase-phone-auth__confirm-text'>授权手机号</Text>
            </Button>
          </View>
        </View>
      </View>
    </View>
  )
}

export default PurchasePhoneLogin
