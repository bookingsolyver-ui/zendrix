// One-off migration: encrypts any SocialIntegration.accessToken still stored in plain text.
// Idempotent — rows that are already encrypted are skipped.
//
// Usage: node scripts/encrypt-integration-tokens.mjs
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { decryptSecret, encryptSecret, isEncryptedSecret } from "../lib/crypto.ts";

process.loadEnvFile(".env.local");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL }),
});

try {
  const rows = await prisma.socialIntegration.findMany({ select: { id: true, accessToken: true } });
  let migrated = 0;

  for (const row of rows) {
    if (isEncryptedSecret(row.accessToken)) continue;
    const encrypted = encryptSecret(row.accessToken);
    // Never overwrite the original unless the ciphertext decrypts back to it.
    if (decryptSecret(encrypted) !== row.accessToken) throw new Error(`round-trip failed for ${row.id}`);
    await prisma.socialIntegration.update({ where: { id: row.id }, data: { accessToken: encrypted } });
    migrated += 1;
  }

  console.log(`Encrypted ${migrated} token(s); ${rows.length - migrated} already encrypted.`);
} finally {
  await prisma.$disconnect();
}
