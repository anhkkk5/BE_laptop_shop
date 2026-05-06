export enum ReturnStatus {
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  LABEL_GENERATED = 'label_generated',
  LABEL_GENERATION_FAILED = 'label_generation_failed',
  IN_TRANSIT = 'in_transit',
  RECEIVED_AT_WAREHOUSE = 'received_at_warehouse',
  INSPECTED = 'inspected',
  REFUND_PENDING = 'refund_pending',
  REFUNDED = 'refunded',
  RESTOCKED = 'restocked',
  CANCELLED = 'cancelled',
}

export enum ReturnReason {
  DEFECTIVE = 'defective',
  WRONG_ITEM = 'wrong_item',
  NOT_AS_DESCRIBED = 'not_as_described',
  NO_LONGER_NEEDED = 'no_longer_needed',
  BETTER_PRICE = 'better_price',
  OTHER = 'other',
}

export enum InspectionCondition {
  PERFECT = 'perfect',
  MINOR_DAMAGE = 'minor_damage',
  SIGNIFICANT_DAMAGE = 'significant_damage',
  MISSING_ITEMS = 'missing_items',
}

export enum RefundType {
  FULL_REFUND = 'full_refund',
  PARTIAL_REFUND = 'partial_refund',
  NO_REFUND = 'no_refund',
}

export enum RefundMethod {
  ORIGINAL_PAYMENT = 'original_payment',
  BANK_TRANSFER = 'bank_transfer',
  STORE_CREDIT = 'store_credit',
}

export enum RefundStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}
