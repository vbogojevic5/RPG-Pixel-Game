import 'dotenv/config';
import { prisma } from '../db.js';

const username = process.argv[2]?.trim().toLowerCase();

if (!username) {
  console.error('Usage: npm run admin:promote -- <username>');
  process.exitCode = 1;
} else {
  const player = await prisma.player.update({
    where: { username },
    data: { role: 'admin' },
    select: { id: true, username: true, role: true },
  });
  console.log(`[admin] promoted ${player.username} (${player.id}) to ${player.role}`);
}

await prisma.$disconnect();
