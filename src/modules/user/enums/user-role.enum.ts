export enum UserRole {
  CUSTOMER = 'customer',
  // Legacy role kept for backward compatibility. New assignments should use STAFF.
  SELLER = 'seller',
  STAFF = 'staff',
  TECHNICIAN = 'technician',
  WAREHOUSE = 'warehouse',
  ADMIN = 'admin',
}
