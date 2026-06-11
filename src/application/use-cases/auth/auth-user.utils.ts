import { User } from '../../../domain/entities/User.js';

export function serializeAuthUser(user: User): Record<string, unknown> {
  if (typeof (user as { toJSON?: () => Record<string, unknown> }).toJSON === 'function') {
    return (user as { toJSON: () => Record<string, unknown> }).toJSON();
  }
  return {
    ...user,
    saldo: user.saldo,
    limite: user.limite,
  };
}
