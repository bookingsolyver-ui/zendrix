// One-off bootstrap: stores the WhatsApp token + Phone ID from .env.local as a SocialIntegration
// on the workspace of an existing user, so /api/whatsapp/connect can read them from the database.
// The token is encrypted (AES-256-GCM) before it is written.
//
// Usage: node scripts/link-whatsapp.mjs you@example.com
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { encryptSecret } from "../lib/crypto.ts";

process.loadEnvFile(".env.local");

const email = process.argv[2]?.trim().toLowerCase();
const token = process.env.META_WA_TOKEN;
const phoneId = process.env.META_PHONE_ID;

if (!email || !token || !phoneId) {
  console.error("Usage: node scripts/link-whatsapp.mjs <email>  (needs META_WA_TOKEN and META_PHONE_ID in .env.local)");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL }),
});

try {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user with email ${email}. Register in the app first.`);
    process.exit(1);
  }

  const existing = await prisma.socialIntegration.findFirst({
    where: { workspaceId: user.workspaceId, platform: "WHATSAPP" },
  });

  if (existing) {
    await prisma.socialIntegration.update({
      where: { id: existing.id },
      data: { accessToken: encryptSecret(token), providerAccountId: phoneId, status: "ACTIVE" },
    });
    console.log(`Updated WhatsApp integration for workspace ${user.workspaceId}.`);
  } else {
    await prisma.socialIntegration.create({
      data: {
        workspaceId: user.workspaceId,
        platform: "WHATSAPP",
        accessToken: encryptSecret(token),
        providerAccountId: phoneId,
      },
    });
    console.log(`Created WhatsApp integration for workspace ${user.workspaceId}.`);
  }
} finally {
  await prisma.$disconnect();
}
