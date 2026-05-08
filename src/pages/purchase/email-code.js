import React, { useEffect, useMemo, useState } from 'react'
import { View, Text } from '@tarojs/components'
import { SpPurchaseEnterpriseBar, SpInput, SpImage } from '@/components'
import api from '@/api'
import { getDistributorId, showToast, classNames } from '@/utils'
import './email-code.scss'

function PurchaseEmailCode({
  activityBg,
  appName,
  enterpriseId,
  onConfirm
}) {
  const [email, setEmail] = useState('')
  const [vcode, setVcode] = useState('')
  const [countdown, setCountdown] = useState(0)
  const disabled = useMemo(() => !email.trim() || !vcode.trim(), [email, vcode])
  const sendDisabled = countdown > 0

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => {
      setCountdown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const handleConfirm = () => {
    if (disabled) return
    onConfirm?.({ email: email.trim(), vcode: vcode.trim() })
  }

  const handleSendCode = async () => {
    if (sendDisabled) return
    const nextEmail = email.trim()
    if (!nextEmail) {
      showToast('请输入电子邮箱')
      return
    }
    const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailReg.test(nextEmail)) {
      showToast('请输入正确的邮箱')
      return
    }
    try {
      const params = { email: nextEmail }
      if (!enterpriseId) {
        params.distributor_id = getDistributorId()
      }
      const { status } = await api.purchase.getEmailCode(params)
      if (status) {
        showToast('发送成功')
        setCountdown(60)
      } else {
        showToast('发送失败')
      }
    } catch (e) {
      showToast(e?.message || '发送失败')
    }
  }

  return (
    <View className='purchase-email-auth'>
      <SpImage src={activityBg} className='purchase-email-auth__cover-img' mode='widthFix' />
      <SpPurchaseEnterpriseBar name={appName || '企业购'} showMore={false} showSearch={false} />

      <View className='purchase-email-auth__form-wrap'>
        <View className='purchase-email-auth__form-card'>
          <Text className='purchase-email-auth__form-title'>请完成身份校验</Text>

          <View className='purchase-email-auth__field'>
            <Text className='purchase-email-auth__field-label'>电子邮箱</Text>
            <SpInput
              className='purchase-email-auth__field-sp-input'
              placeholder='请输入电子邮箱'
              placeholderClass='purchase-email-auth__field-input-ph'
              value={email}
              onChange={setEmail}
            />
          </View>

          <View className='purchase-email-auth__field'>
            <Text className='purchase-email-auth__field-label'>邮箱验证码</Text>
            <View className='purchase-email-auth__code-row'>
              <SpInput
                className='purchase-email-auth__code-sp-input'
                placeholder='请输入邮箱验证码'
                placeholderClass='purchase-email-auth__field-input-ph'
                value={vcode}
                onChange={setVcode}
              />
              <View
                className={classNames('purchase-email-auth__code-send', {
                  'purchase-email-auth__code-send--disabled': sendDisabled
                })}
                onClick={handleSendCode}
              >
                <Text className='purchase-email-auth__code-send-text'>
                  {sendDisabled ? `${countdown}s` : '发送验证码'}
                </Text>
              </View>
            </View>
          </View>

          <View className='purchase-email-auth__footer'>
            <View
              className={`purchase-email-auth__confirm${
                disabled ? ' purchase-email-auth__confirm--disabled' : ''
              }`}
              onClick={handleConfirm}
            >
              <Text className='purchase-email-auth__confirm-text'>确认</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}

export default PurchaseEmailCode
