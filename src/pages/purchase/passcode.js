import React, { useEffect, useState } from 'react'
import { View, Text, Button, Input } from '@tarojs/components'
import { classNames, showToast } from '@/utils'
import './passcode.scss'

function PurchasePasscode({
  activityBg,
  inviteCode,
  onBindPhone,
  onRequirePolicy,
  privacyAccepted,
  isLoggedIn,
  onSubmitInviteCode
}) {
  const [passSheetVisible, setPassSheetVisible] = useState(false)
  const [manualInviteCode, setManualInviteCode] = useState('')
  const shouldUsePhoneAuth = !isLoggedIn && privacyAccepted

  useEffect(() => {
    setManualInviteCode(inviteCode || '')
  }, [inviteCode])

  const handleStart = () => {
    if (!privacyAccepted) {
      onRequirePolicy?.()
      return
    }
    if (isLoggedIn) {
      setPassSheetVisible(true)
    }
  }

  const handlePassSheetClose = () => {
    setPassSheetVisible(false)
  }

  const handlePassSheetConfirm = async () => {
    const nextInviteCode = String(manualInviteCode || '').trim()
    if (!nextInviteCode) {
      showToast('请输入入口码')
      return
    }
    const res = await onSubmitInviteCode?.(nextInviteCode)
    if (res !== false) {
      setPassSheetVisible(false)
    }
  }

  return (
    <>
      <View
        className={classNames('purchase-passcode__landing', 'purchase-passcode__landing--plain', {
          'purchase-passcode__landing--with-bg': Boolean(activityBg)
        })}
        style={activityBg ? { backgroundImage: `url(${activityBg})` } : undefined}
      >
        <View className='purchase-passcode__start-btn-wrap'>
          <Button
            className='purchase-passcode__start-btn purchase-passcode__start-btn--button'
            openType={shouldUsePhoneAuth ? 'getPhoneNumber' : undefined}
            onGetPhoneNumber={onBindPhone}
            onClick={handleStart}
          >
            <Text className='purchase-passcode__start-btn-text'>开始选购</Text>
          </Button>
        </View>
      </View>

      {isLoggedIn && passSheetVisible && (
        <>
          <View className='purchase-passcode__sheet-mask' onClick={handlePassSheetClose} />
          <View className='purchase-passcode__sheet' catchMove>
            <View className='purchase-passcode__sheet-inner' catchMove>
              <View className='purchase-passcode__sheet-handle' />
              <View className='purchase-passcode__sheet-head'>
                <Text className='purchase-passcode__sheet-title'>请输入入口码</Text>
                <View className='purchase-passcode__sheet-close' onClick={handlePassSheetClose}>
                  <Text className='purchase-passcode__sheet-close-icon'>×</Text>
                </View>
              </View>
              <View className='purchase-passcode__sheet-sub'>
                请输入活动口令码以继续
              </View>
              <Input
                className='purchase-passcode__sheet-input'
                placeholder='请输入入口码'
                placeholderClass='purchase-passcode__sheet-input-ph'
                value={manualInviteCode}
                onInput={(e) => setManualInviteCode(e.detail.value)}
              />
              <View
                className={classNames('purchase-passcode__sheet-confirm', {
                  'purchase-passcode__sheet-confirm--disabled': !manualInviteCode.trim()
                })}
                onClick={handlePassSheetConfirm}
              >
                <Text className='purchase-passcode__sheet-confirm-text'>确认</Text>
              </View>
            </View>
          </View>
        </>
      )}
    </>
  )
}

export default PurchasePasscode
