import React, { useMemo, useState } from 'react'
import { View, Text } from '@tarojs/components'
import { SpPurchaseEnterpriseBar, SpInput, SpImage } from '@/components'
import './account-password.scss'

function PurchaseAccountPassword({
  activityBg,
  appName,
  onConfirm,
  checked
}) {
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const disabled = useMemo(() => !account.trim() || !password.trim(), [account, password])

  const handleConfirm = () => {
    onConfirm?.({ account: account.trim(), password: password.trim(), checked })
  }

  return (
    <View className='purchase-account-auth'>
      <SpImage src={activityBg} className='purchase-account-auth__cover-img' mode='widthFix' />

      <SpPurchaseEnterpriseBar name={appName || '企业购'} showMore={false} showSearch={false} />

      <View className='purchase-account-auth__form-wrap'>
        <View className='purchase-account-auth__form-card'>
          <Text className='purchase-account-auth__form-title'>请完成身份校验</Text>

          <View className='purchase-account-auth__field'>
            <Text className='purchase-account-auth__field-label'>账号</Text>
            <SpInput
              className='purchase-account-auth__field-sp-input'
              placeholder='请输入账号'
              placeholderClass='purchase-account-auth__field-input-ph'
              adjustPosition={false}
              value={account}
              onChange={setAccount}
            />
          </View>

          <View className='purchase-account-auth__field'>
            <Text className='purchase-account-auth__field-label'>密码</Text>
            <SpInput
              className='purchase-account-auth__field-sp-input'
              placeholder='请输入密码'
              placeholderClass='purchase-account-auth__field-input-ph'
              type='password'
              adjustPosition={false}
              value={password}
              onChange={setPassword}
            />
          </View>

          <View className='purchase-account-auth__protocol'>
            <View
              className={`purchase-account-auth__confirm${
                disabled ? ' purchase-account-auth__confirm--disabled' : ''
              }`}
              onClick={handleConfirm}
            >
              <Text className='purchase-account-auth__confirm-text'>确认</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}

export default PurchaseAccountPassword
