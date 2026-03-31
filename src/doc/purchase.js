/**
 * Copyright © ShopeX （http://www.shopex.cn）. All rights reserved.
 * See LICENSE file for license details.
 */
import { formatDateTime } from '@/utils'
import { $t } from '@/i18n'

export const ACTIVITY_ITEM = {
  enterpriseId: 'enterprise_id',
  employeeBeginTime: ({ employee_begin_time }) => {
    return formatDateTime(employee_begin_time)
  },
  employeeEndTime: ({ employee_end_time }) => {
    return formatDateTime(employee_end_time)
  },
  id: 'id',
  name: 'name',
  pic: 'pic',
  pages_template_id: 'pages_template_id',
  role: ({ is_employee, is_relative }) => {
    if (is_employee == 1) {
      return $t('00c5cea6.2ed392')
    } else if (is_relative == 1) {
      return $t('00c5cea6.4eca5b')
    }
  },
  isDiscountDescriptionEnabled: ({ is_discount_description_enabled }) =>
    is_discount_description_enabled == 'true',
  discountDescription: 'discount_description',
  priceDisplayConfig: 'price_display_config'
}

export const ACTIVITY_LIMIT_ITEM = {
  name: 'name',
  employeeBeginTime: ({ employee_begin_time }) => {
    return formatDateTime(employee_begin_time)
  },
  employeeEndTime: ({ employee_end_time }) => {
    return formatDateTime(employee_end_time)
  },
  limitFee: ({ fee }) => (fee?.limit_fee / 100).toFixed(2),
  aggregateFee: ({ fee }) => (fee?.aggregate_fee / 100).toFixed(2),
  leftFee: ({ fee }) => (fee?.left_fee / 100).toFixed(2)
}
