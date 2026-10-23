/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import req from './req'

//商户类型列表
export function type_list(params) {
  return req.get('/merchant/type/list', params)
}

//结算银行列表
export function bank_list(params) {
  return req.get('/adapay/bank/list', params)
}

//商户登陆
export function login(params) {
  return req.post('/merchant/login', params)
}

//获取当前进行到哪一步
export function getStep(params) {
  return req.get('/merchant/settlementapply/step', params)
}

const JSON_HEADER = { 'content-type': 'application/json' }

// 分步保存：step1/2/3 均为 application/json（见 Apifox 97847741）
export function save(params) {
  const { step, ...body } = params
  return req.post(`/merchant/settlementapply/${step}`, body, { header: JSON_HEADER })
}

//获取基础设置
export function getSetting(params) {
  return req.get(`/merchant/basesetting`, params)
}

//获取审核结果
export function getAuditstatus(params) {
  return req.get(`/merchant/settlementapply/auditstatus`, params)
}
//重新获取密码
export function getResetPsd() {
  return req.post(`/merchant/password/reset`)
}

//获取申请详情
export function detail() {
  return req.get(`/merchant/settlementapply/detail`)
}

//获取密码
export function getPassword() {
  return req.get(`/merchant/password/reset`)
}
