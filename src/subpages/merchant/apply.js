/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import Taro from '@tarojs/taro'
import { useEffect, useState, useMemo } from 'react'
import { ScrollView, View, Text, Image } from '@tarojs/components'
import { showToast, classNames } from '@/utils'
import { SpPage, SpLoading, SpAddress } from '@/components'
import { useSelector, useDispatch } from 'react-redux'
import { useImmer } from 'use-immer'
import api from '@/api'
import * as merchantApi from '@/api/merchant'
import S from '@/spx'
import { updateBank, updateMerchantType } from '@/store/slices/merchant'
import { useTranslation, $t, ti } from '@/i18n'
import {
  MERCHANT_TYPE,
  BANG_NAME,
  STEPTWO_TEXT_KEY,
  STEPTHREE_TEXT_KEY,
  MerchantStepKey,
  BANK_PUBLIC,
  BANK_PRIVATE
} from './consts'
import { MButton, MStep, MCell, MImgPicker, MRadio } from './comps'
import { useArea } from './hook'
import { navigateToAgreement } from './util'
import './apply.scss'

const initialState = {
  //入驻类型
  settled_type: undefined,
  //商户名称
  merchant_name: undefined,
  //统一社会信用代码
  social_credit_code_id: undefined,
  //省市区编码
  regions_id: [],
  //省市区名称
  regions: [],
  //详细地址
  address: undefined,
  //法人姓名
  legal_name: undefined,
  //法人身份证号码
  legal_cert_id: undefined,
  //银行账户类型
  bank_acct_type: BANK_PRIVATE,
  //结算银行卡号
  card_id_mask: undefined,
  //结算银行
  bank_name: undefined,
  //绑定手机号
  bank_mobile: undefined,
  //营业执照图片url
  license_url: [],
  //法人手持身份证正面url
  legal_certid_front_url: '',
  //法人手持身份证反面url
  legal_cert_id_back_url: '',
  //结算银行卡正面url
  bank_card_front_url: [],
  //联系人姓名
  contact_name: '',
  //联系人手机号
  contact_mobile: '',
  formloading: false
}

const PreviewText = ({ title, value, className }) => (
  <View className={classNames('preview-text', className)}>
    {title ? <View className='preview-text__label'>{title}：</View> : null}
    <View className='preview-text__value'>{value || '-'}</View>
  </View>
)

const PreviewImage = ({ title, src, sub, urls }) => {
  const handlePreview = () => {
    if (!src) return
    const list = (urls && urls.length ? urls : [src]).filter(Boolean)
    Taro.previewImage({
      current: src,
      urls: list
    })
  }

  return (
    <View className='preview-image'>
      {title ? <View className='preview-image__label'>{title}</View> : null}
      <View className='preview-image__box' onClick={handlePreview}>
        {src ? (
          <Image className='preview-image__img' src={src} mode='aspectFit' />
        ) : (
          <Text className='preview-image__empty'>-</Text>
        )}
      </View>
      {sub ? <View className='preview-image__sub'>{sub}</View> : null}
    </View>
  )
}

const Apply = () => {
  const { i18n } = useTranslation()
  const [state, setState] = useImmer(initialState)

  const { merchantType, bank: bankName } = useSelector((state) => state.merchant)
  const mainCategoryNames = Array.isArray(merchantType)
    ? merchantType
        .map((item) => item.name)
        .filter(Boolean)
        .join('、')
    : ''

  const dispatch = useDispatch()

  const stepOptions = useMemo(
    () => [$t('3c94bb91.e48700'), '请填写企业信息', '提交审核'],
    [i18n.language]
  )

  const bankAccType = useMemo(
    () => [
      { value: BANK_PUBLIC, label: $t('3c94bb91.18ba13') },
      { value: BANK_PRIVATE, label: $t('3c94bb91.f0bf8a') }
    ],
    [i18n.language]
  )

  const [merchantOptions, setMerchantOptions] = useState([])
  // 是否同意入驻协议
  const [agreed, setAgreed] = useState(false)
  // 省市区选择（挂在页面根节点，避免 ScrollView 内 fixed 错位）
  const [addressOpened, setAddressOpened] = useState(false)

  //结算银行必填
  const banknameRequired = state.bank_acct_type == BANK_PUBLIC

  //银行绑定手机号必填
  const bankmobileRequired = state.bank_acct_type == BANK_PRIVATE

  const {
    areaList,
    onColumnChange: onAreaColumnChange,
    onChange: onAreaChange,
    selectArea
  } = useArea()

  //当前正在第几步
  const [step, setStep] = useState(1)

  const [loading, setLoading] = useState(false)

  //最后一步
  const isSubmit = step === 3

  const handleChange = (key, key2) => (value) => {
    if (key2) {
      setState((state) => {
        state[key] = value[0]
        state[key2] = value[1]
      })
    } else {
      setState((state) => {
        state[key] = value
      })
    }
  }

  useEffect(() => {
    if (bankName.name) {
      setState((state) => {
        state.bank_name = bankName.name
      })
    }
  }, [bankName])

  useEffect(() => {
    if (selectArea.length) {
      setState((state) => {
        state.regions = selectArea.map((item) => item.label)
        state.regions_id = selectArea.map((item) => item.value)
      })
    }
  }, [selectArea])

  const handleSubmit = async () => {
    const {
      settled_type,
      merchant_name,
      social_credit_code_id,
      regions,
      regions_id,
      address,
      legal_name,
      legal_cert_id,
      contact_name,
      contact_mobile,
      bank_acct_type,
      card_id_mask,
      bank_name,
      license_url,
      legal_certid_front_url,
      legal_cert_id_back_url,
      bank_card_front_url
    } = state

    setLoading(true)
    let params = {}
    //第一步
    if (step === 1) {
      const hasCategory = Array.isArray(merchantType) && merchantType.length > 0
      if (!hasCategory && !state.settled_type) {
        showToast($t('3c94bb91.a3c96f'))
        return true
      }
      if (!hasCategory || !state.settled_type) {
        showToast($t('3c94bb91.2456c8'))
        return true
      }
      if (!agreed) {
        showToast($t('4289b966.29c1bc'))
        return true
      }
      params = {
        step: 1,
        settled_type,
        main_category_selection: merchantType.map(({ category_id, level }) => ({
          category_id,
          level
        }))
      }
      //第二步保存：Figma 把营业执照 / 法人身份证 / 银行卡全部收进第 2 步，一次性采集
    } else if (step === 2) {
      if (!license_url[0]) {
        showToast('请上传营业执照照片')
        return true
      }
      if (!social_credit_code_id) {
        showToast('请输入营业执照统一社会信用代码')
        return true
      }
      if (!merchant_name) {
        showToast('请输入企业营业执照公司名称')
        return true
      }
      if (!address) {
        showToast('请输入企业营业执照注册地')
        return true
      }
      if (!legal_name) {
        showToast('请输入企业营业执照法定代表人')
        return true
      }
      if (!legal_certid_front_url) {
        showToast('请上传法人身份证人像面')
        return true
      }
      if (!legal_cert_id_back_url) {
        showToast('请上传法人身份证国徽面')
        return true
      }
      if (!legal_cert_id) {
        showToast('请输入身份证号码')
        return true
      }
      if (!contact_name) {
        showToast('请输入联系人姓名')
        return true
      }
      if (!contact_mobile) {
        showToast('请输入联系人手机号')
        return true
      }
      if (!bank_card_front_url[0]) {
        showToast('请上传收款账户银行卡')
        return true
      }
      if (banknameRequired && !bank_name) {
        showToast('请选择结算银行')
        return true
      }
      if (!card_id_mask) {
        showToast('请输入结算银行账号')
        return true
      }

      // Apifox 527211419：资料 + 证照一次提交；字段名与旧 As-Is 不同
      params = {
        step: 2,
        license_url: license_url[0],
        merchant_name,
        social_credit_code_id,
        license_registered_address: address,
        license_legal_representative: legal_name,
        legal_cert_id,
        legal_certid_front_url,
        legal_cert_id_back_url,
        contact_name,
        contact_mobile,
        bank_card_front_url: bank_card_front_url[0] || '',
        bank_acct_type: String(bank_acct_type),
        card_id_mask,
        bank_name: bank_name || '',
        bank_mobile: bank_acct_type == BANK_PRIVATE ? contact_mobile || '' : ''
      }
    } else if (step === 3) {
      // Apifox 527211420：核对页仅提交审核，body 只有 submit
      const { confirm } = await Taro.showModal({
        title: $t('7187dbd0.02d981'),
        content: $t('3c94bb91.762177'),
        showCancel: true,
        cancelText: $t('7187dbd0.625fb2'),
        confirmText: $t('61e2d21a.e83a25')
      })
      if (!confirm) {
        return true
      }

      params = {
        step: 3,
        submit: true
      }
    }
    try {
      await merchantApi.save(params)
      if (step === 3) {
        S?.delete(MerchantStepKey, true)
        Taro.redirectTo({
          url: `/subpages/merchant/audit`
        })
      }
      setLoading(false)
    } catch (e) {
      setLoading(false)
      return true
    }
  }

  const getDetail = async () => {
    const {
      main_category_selection,
      main_category_names,
      settled_type,
      merchant_name,
      social_credit_code_id,
      license_registered_address,
      license_legal_representative,
      legal_cert_id,
      bank_acct_type,
      bank_name,
      card_id_mask,
      bank_mobile,
      license_url,
      bank_card_front_url,
      legal_certid_front_url,
      legal_cert_id_back_url,
      contact_name,
      contact_mobile
    } = await merchantApi.detail()

    //有保存过才赋值
    if (Array.isArray(main_category_selection) && main_category_selection.length) {
      const names = Array.isArray(main_category_names) ? main_category_names : []
      dispatch(
        updateMerchantType(
          main_category_selection.map((item, index) => ({
            category_id: item.category_id,
            level: item.level,
            name: names[index] || ''
          }))
        )
      )
    }

    if (bank_name) {
      dispatch(
        updateBank({
          name: bank_name
        })
      )
    }

    setState((state) => {
      state.settled_type = settled_type
      state.merchant_name = merchant_name
      state.social_credit_code_id = social_credit_code_id
      state.address = license_registered_address || ''
      state.legal_name = license_legal_representative || ''
      state.legal_cert_id = legal_cert_id
      // 接口 bank_acct_type 为字符串 "1"|"2"
      state.bank_acct_type = bank_acct_type ? Number(bank_acct_type) : BANK_PRIVATE
      state.card_id_mask = card_id_mask
      state.bank_mobile = bank_mobile
      state.license_url = license_url ? [license_url] : []
      state.bank_card_front_url = bank_card_front_url ? [bank_card_front_url] : []
      state.legal_certid_front_url = legal_certid_front_url || ''
      state.legal_cert_id_back_url = legal_cert_id_back_url || ''
      state.contact_name = contact_name || ''
      state.contact_mobile = contact_mobile || ''
    })
    setState((state) => {
      state.formloading = false
    })
  }

  //点击下一步/上一步
  const handleStep = (direction) => async () => {
    let end
    if (direction === 'next') {
      end = await handleSubmit()
      setLoading(false)
      if (end) return
    }
    let nextStep = direction === 'next' ? Math.min(step + 1, 3) : Math.max(step - 1, 1)
    S?.set(MerchantStepKey, nextStep, true)
    setStep(nextStep)
  }

  //获取当前哪一步
  const getStep = async () => {
    // 与商城统一登录：无会员 token 时走会员中心（带回跳）
    if (!S?.getAuthToken()) {
      Taro.redirectTo({
        url: `/subpages/member/index?redirect_url=${encodeURIComponent('/subpages/merchant/apply')}`
      })
      return
    }
    setState((state) => {
      state.formloading = true
    })
    let step = 1
    try {
      const res = await merchantApi.getStep()
      step = res?.step ?? 1
    } catch (e) {
      step = 1
    }
    const is_audit = step == 4
    // step=4：已提交审核。无本地重申标记则进审核页；从审核页「重新申请」会写入 MerchantStepKey
    if (is_audit) {
      const storeStep = S?.get(MerchantStepKey, true)
      if (!storeStep) {
        Taro.redirectTo({ url: '/subpages/merchant/audit' })
        return
      }
      setStep(storeStep)
    } else {
      setStep(step)
    }

    //大于1才调用详情
    if (step > 1) {
      getDetail()
    } else {
      setState((state) => {
        state.formloading = false
      })
    }
    //如果是一步都没走
    if (step == 1) {
      S?.delete(MerchantStepKey, true)
    }
  }

  const getMerchatType = async () => {
    const { settled_type } = await merchantApi.getSetting()
    const options = settled_type.map((item) => {
      if (item === 'enterprise') {
        return { value: item, label: $t('3c94bb91.04c9e3') }
      } else if (item === 'soletrader') {
        return { value: item, label: $t('3c94bb91.a41061') }
      }
    })
    setMerchantOptions(options)
  }

  useEffect(() => {
    getMerchatType()
  }, [i18n.language])

  useEffect(() => {
    getStep()
    return () => {
      S?.delete(MerchantStepKey, true)
      clearMerchant()
    }
  }, [])

  const handleSwitchSelector = (type) => () => {
    Taro.navigateTo({
      url: `/subpages/merchant/selector?type=${type}`
    })
  }

  const clearMerchant = () => {
    dispatch(updateMerchantType([]))
    dispatch(updateBank({}))
  }

  const fieldName =
    state.settled_type === 'soletrader' ? $t('3c94bb91.b29725') : $t('3c94bb91.e1a437')

  return (
    <SpPage className='page-merchant-apply' navbar={false}>
      {state.formloading ? (
        <SpLoading />
      ) : (
        <View>
          <MStep options={stepOptions} step={step} />
          <ScrollView scrollY className='apply-scroll'>
            <View className='page-merchant-apply-content'>
              <View className='card'>
                {step === 1 && (
                  <View>
                    <MCell
                      title={$t('3c94bb91.4709c8')}
                      required
                      value={mainCategoryNames}
                      onClick={handleSwitchSelector(MERCHANT_TYPE)}
                    />
                    <MCell
                      title={$t('3c94bb91.82054a')}
                      required
                      mode='radio'
                      value={state.settled_type}
                      radioOptions={merchantOptions}
                      onRadioChange={handleChange('settled_type')}
                    />
                  </View>
                )}
                {step === 2 && (
                  <View className='form-vertical'>
                    {/* 企业营业执照信息 */}
                    <View className='form-section'>
                      <View className='form-section__title'>企业营业执照信息</View>
                      <MImgPicker
                        title='营业执照'
                        required
                        value={state.license_url}
                        onChange={handleChange('license_url')}
                        info={['上传营业执照照片']}
                      />
                      <View className='form-tip'>图片大小10M以内，格式png/jpg/jpeg，最多可上传1张</View>
                      <View className='form-tip'>
                        注意：如果图片像素太小，审核将无法对您的资质正确评估，因此请务必按照图片要求上传
                      </View>
                      <MCell
                        layout='vertical'
                        title='营业执照统一社会信用代码'
                        required
                        mode='input'
                        placeholder='请输入'
                        value={state.social_credit_code_id}
                        onChange={handleChange('social_credit_code_id')}
                      />
                      <MCell
                        layout='vertical'
                        title='企业营业执照公司名称'
                        required
                        mode='input'
                        placeholder='请输入'
                        value={state.merchant_name}
                        onChange={handleChange('merchant_name')}
                      />
                      <MCell
                        layout='vertical'
                        title='企业营业执照注册地'
                        required
                        mode='input'
                        placeholder='请输入'
                        value={state.address}
                        onChange={handleChange('address')}
                      />
                      <MCell
                        layout='vertical'
                        title='企业营业执照法定代表人'
                        required
                        mode='input'
                        placeholder='请输入'
                        value={state.legal_name}
                        onChange={handleChange('legal_name')}
                      />
                    </View>

                    {/* 法人代表人信息 */}
                    <View className='form-section'>
                      <View className='form-section__title'>法人代表人信息</View>
                      <MImgPicker
                        mode='idCard'
                        title='法人身份证'
                        required
                        value={[state.legal_certid_front_url, state.legal_cert_id_back_url]}
                        onChange={handleChange('legal_certid_front_url', 'legal_cert_id_back_url')}
                        info={['人像面', '国徽面']}
                      />
                      <View className='form-tip'>图片大小10M以内，格式png/jpg/jpeg，最多可上传1张。</View>
                      <View className='form-tip'>
                        注意：如果图片像素太小，审核将无法对您的资质正确评估，因此请务必按照图片要求上传。
                      </View>
                      <MCell
                        layout='vertical'
                        title='身份证号码'
                        required
                        mode='input'
                        placeholder='请输入'
                        value={state.legal_cert_id}
                        onChange={handleChange('legal_cert_id')}
                      />
                      <MCell
                        layout='vertical'
                        title='联系人姓名'
                        required
                        mode='input'
                        placeholder='请输入'
                        value={state.contact_name}
                        onChange={handleChange('contact_name')}
                      />
                      <MCell
                        layout='vertical'
                        title='联系人手机号'
                        required
                        mode='input'
                        placeholder='请输入'
                        value={state.contact_mobile}
                        onChange={handleChange('contact_mobile')}
                      />
                    </View>

                    {/* 收款账户信息 */}
                    <View className='form-section'>
                      <View className='form-section__title'>收款账户信息</View>
                      <MImgPicker
                        mode='bankCard'
                        title='收款账户银行卡'
                        required
                        value={state.bank_card_front_url}
                        onChange={handleChange('bank_card_front_url')}
                        info={['上传银行卡正面']}
                      />
                      <View className='form-tip'>图片大小10M以内，格式png/jpg/jpeg，最多可上传1张。</View>
                      <View className='form-tip'>
                        注意：如果图片像素太小，审核将无法对您的资质正确评估，因此请务必按照图片要求上传。
                      </View>
                      <MCell
                        layout='vertical'
                        title='结算银行账户类型'
                        required
                        mode='radio'
                        value={state.bank_acct_type}
                        radioOptions={bankAccType}
                        onRadioChange={handleChange('bank_acct_type')}
                      />
                      <MCell
                        layout='vertical'
                        title='结算银行'
                        required
                        value={bankName.name}
                        onClick={handleSwitchSelector(BANG_NAME)}
                      />
                      <MCell
                        layout='vertical'
                        title='结算银行账号'
                        required
                        mode='input'
                        placeholder='请输入'
                        value={state.card_id_mask}
                        onChange={handleChange('card_id_mask')}
                      />
                    </View>
                  </View>
                )}
                {step === 3 && (
                  <View className='form-vertical form-preview'>
                    {/* 企业营业执照信息 */}
                    <View className='form-section'>
                      <View className='form-section__title'>企业营业执照信息</View>
                      <PreviewImage title='营业执照' src={state.license_url[0]} />
                      <PreviewText
                        title='营业执照统一社会信用代码'
                        value={state.social_credit_code_id}
                      />
                      <PreviewText title='企业营业执照公司名称' value={state.merchant_name} />
                      <PreviewText title='企业营业执照注册地' value={state.address} />
                      <PreviewText title='企业营业执照法定代表人' value={state.legal_name} />
                    </View>

                    {/* 法人代表人信息 */}
                    <View className='form-section'>
                      <View className='form-section__title'>法人代表人信息</View>
                      <PreviewImage
                        title='法人身份证'
                        src={state.legal_certid_front_url}
                        sub='人像面'
                        urls={[state.legal_certid_front_url, state.legal_cert_id_back_url]}
                      />
                      <PreviewImage
                        src={state.legal_cert_id_back_url}
                        sub='国徽面'
                        urls={[state.legal_certid_front_url, state.legal_cert_id_back_url]}
                      />
                      <PreviewText title='身份证号码' value={state.legal_cert_id} />
                      <PreviewText title='联系人姓名' value={state.contact_name} />
                      <PreviewText title='联系人手机号' value={state.contact_mobile} />
                    </View>

                    {/* 收款账户信息 */}
                    <View className='form-section'>
                      <View className='form-section__title'>收款账户信息</View>
                      <PreviewImage title='收款账户银行卡' src={state.bank_card_front_url[0]} />
                      <PreviewText
                        title='结算银行账户类型'
                        value={state.bank_acct_type == BANK_PUBLIC ? '对公' : '对私'}
                      />
                      <View className='preview-row'>
                        <PreviewText
                          className='preview-row__item'
                          title='开户银行'
                          value={state.bank_name}
                        />
                        <PreviewText
                          className='preview-row__item'
                          title='结算银行账号'
                          value={state.card_id_mask}
                        />
                      </View>
                    </View>
                  </View>
                )}

              </View>
              {step === 1 && (
                <View className='agreement-panel'>
                  <View className='agreement-panel__title'>入驻须知</View>
                  <View className='agreement-panel__desc'>
                    请确保您充分知悉并符合以下基本入驻条件及说明，逐条确认后即可申请：
                  </View>
                  <View className='agreement-panel__agree'>
                    <MRadio checked={agreed} onClick={() => setAgreed((v) => !v)} />
                    <Text
                      className='agreement-panel__agree-text'
                      onClick={() => setAgreed((v) => !v)}
                    >
                      我已详细阅读并确认
                    </Text>
                    <Text className='agreement-panel__agree-link' onClick={navigateToAgreement}>
                      《入驻条件及说明》
                    </Text>
                  </View>
                </View>
              )}
              {step !== 1 && (
                <View className='info mt-24'>
                  <Text className='iconfont icon-info'></Text>
                  <Text className='text'>
                    {step === 2 ? ti(STEPTWO_TEXT_KEY, [fieldName]) : $t(STEPTHREE_TEXT_KEY)}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      )}

      <View className={classNames('apply-bottom', { 'has-back': step > 1 })}>
        {step > 1 && (
          <View className='apply-bottom-back' onClick={handleStep('back')}>
            返回上一步
          </View>
        )}
        <MButton className='apply-bottom-button' onClick={handleStep('next')} loading={loading}>
          {isSubmit ? '提交审核' : $t('d121a348.38ce27')}
        </MButton>
      </View>

      <SpAddress
        isOpened={addressOpened}
        onClose={() => setAddressOpened(false)}
        onChange={(selectValue) => {
          setState((draft) => {
            draft.regions = selectValue.map((d) => d.label)
            draft.regions_id = selectValue.map((d) => d.id)
          })
          setAddressOpened(false)
        }}
      />
    </SpPage>
  )
}

export default Apply
