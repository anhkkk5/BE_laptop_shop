import { ROLES_KEY, UserRole } from '../../../../common/constants';
import { OrderAdminController } from './order-admin.controller';

describe('OrderAdminController roles', () => {
  it('should allow ADMIN and STAFF at controller level', () => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      OrderAdminController,
    ) as UserRole[];

    expect(roles).toEqual([UserRole.ADMIN, UserRole.STAFF]);
  });
});
