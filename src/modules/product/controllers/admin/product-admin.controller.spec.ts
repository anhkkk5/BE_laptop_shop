import { ROLES_KEY, UserRole } from '../../../../common/constants';
import { ProductAdminController } from './product-admin.controller';

describe('ProductAdminController roles', () => {
  it('should allow ADMIN and WAREHOUSE at controller level', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, ProductAdminController);

    expect(roles).toEqual([UserRole.ADMIN, UserRole.WAREHOUSE]);
  });

  it('should keep mutating endpoints ADMIN-only', () => {
    const createRoles = Reflect.getMetadata(
      ROLES_KEY,
      ProductAdminController.prototype.create,
    );
    const updateRoles = Reflect.getMetadata(
      ROLES_KEY,
      ProductAdminController.prototype.update,
    );
    const deleteRoles = Reflect.getMetadata(
      ROLES_KEY,
      ProductAdminController.prototype.delete,
    );

    expect(createRoles).toEqual([UserRole.ADMIN]);
    expect(updateRoles).toEqual([UserRole.ADMIN]);
    expect(deleteRoles).toEqual([UserRole.ADMIN]);
  });
});
