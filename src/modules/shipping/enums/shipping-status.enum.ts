export enum ShippingStatus {
  PENDING = 'pending',
  CREATED = 'created',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  DELIVERY_FAILED = 'delivery_failed',
  RETURNING = 'returning',
  RETURNED = 'returned',
  CANCELLED = 'cancelled',
}

export enum CodStatus {
  PENDING = 'pending',
  COLLECTED = 'collected',
  REMITTED = 'remitted',
  CANCELLED = 'cancelled',
}

export enum ServiceType {
  STANDARD = 'standard',
  EXPRESS = 'express',
}
