import { ROLES_KEY, UserRole } from '../../../../common/constants';
import { ProductAdminController } from './product-admin.controller';

type ControllerMethod = (...args: unknown[]) => unknown;

function getControllerMethod(
  methodName: 'create' | 'update' | 'delete',
): ControllerMethod {
  const descriptor = Object.getOwnPropertyDescriptor(
    ProductAdminController.prototype,
    methodName,
  );
  const methodValue: unknown = descriptor?.value;

  if (typeof methodValue !== 'function') {
    throw new Error(`Method ${methodName} not found`);
  }

  return methodValue as ControllerMethod;
}

describe('ProductAdminController roles', () => {
  it('should allow ADMIN, WAREHOUSE and SELLER at controller level', () => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      ProductAdminController,
    ) as UserRole[];

    expect(roles).toEqual([
      UserRole.ADMIN,
      UserRole.WAREHOUSE,
      UserRole.SELLER,
    ]);
  });

  it('should allow ADMIN and SELLER on mutating endpoints', () => {
    const createMethod = getControllerMethod('create');
    const updateMethod = getControllerMethod('update');
    const deleteMethod = getControllerMethod('delete');

    const createRoles = Reflect.getMetadata(
      ROLES_KEY,
      createMethod,
    ) as UserRole[];
    const updateRoles = Reflect.getMetadata(
      ROLES_KEY,
      updateMethod,
    ) as UserRole[];
    const deleteRoles = Reflect.getMetadata(
      ROLES_KEY,
      deleteMethod,
    ) as UserRole[];

    expect(createRoles).toEqual([UserRole.ADMIN, UserRole.SELLER]);
    expect(updateRoles).toEqual([UserRole.ADMIN, UserRole.SELLER]);
    expect(deleteRoles).toEqual([UserRole.ADMIN, UserRole.SELLER]);
  });
});
