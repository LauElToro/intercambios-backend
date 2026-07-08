import prisma from '../src/infrastructure/database/prisma.js';
import { UserRepository } from '../src/infrastructure/repositories/UserRepository.js';

async function main() {
  const repo = new UserRepository();
  for (const id of [6, 8]) {
    const user = await repo.findById(id);
    if (!user) continue;
    const spread = { ...user };
    const json = user.toJSON();
    console.log(`User #${id} (${user.nombre}):`);
    console.log('  spread.saldo:', (spread as { saldo?: number }).saldo);
    console.log('  toJSON.saldo:', json.saldo);
    console.log('  DB saldo:', (await prisma.user.findUnique({ where: { id }, select: { saldo: true } }))?.saldo);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
