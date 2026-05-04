export const API_PREFIX = 'api/v1';

export enum UserRole {
  CUSTOMER = 'customer',
  // Legacy role kept for backward compatibility. New assignments should use STAFF.
  SELLER = 'seller',
  STAFF = 'staff',
  TECHNICIAN = 'technician',
  WAREHOUSE = 'warehouse',
  ADMIN = 'admin',
}

export const ROLES_KEY = 'roles';
export const IS_PUBLIC_KEY = 'isPublic';
