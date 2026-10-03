// Liga uma conta de Instagram ou uma página do Messenger à organização de um utilizador, para a Inbox receber
// e responder nesse canal. (O WhatsApp liga-se com scripts/link-whatsapp.mjs ou pelo ecrã de definições.)
// O token é cifrado (AES-256-GCM) antes de ser gravado.
//
//   META_CHANNEL_TOKEN=... META_ACCOUNT_ID=... [META_PAGE_ID=...] \
//     node --conditions=react-server scripts/link-meta-channel.mjs <email> <INSTAGRAM|MESSENGER>
//
//   META_ACCOUNT_ID  o id que a Meta envia em entry.id: Messenger = id da PÁGINA do Facebook;
//                    Instagram = id da conta profissional do Instagram.
//   META_CHANNEL_TOKEN  token de acesso da PÁGINA (Messenger) ou da página ligada ao Instagram.
//   META_PAGE_ID     só Instagram: a página do Facebook ligada à conta (usada para enviar).
//
// Idempotente: se o canal já existir nessa organização, atualiza-o.
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { encryptSecret } from "../lib/crypto.ts";

process.loadEnvFile(".env.local");

const email = process.argv[2]?.trim().toLowerCase();
const platform = process.argv[3]?.trim().toUpperCase();
const token = process.env.META_CHANNEL_TOKEN;
const accountId = process.env.META_ACCOUNT_ID;
const pageId = process.env.META_PAGE_ID || null;

if (!email || !["INSTAGRAM", "MESSENGER"].includes(platform) || !token || !accountId) {
  console.error(
    "Uso: META_CHANNEL_TOKEN=... META_ACCOUNT_ID=... [META_PAGE_ID=...] node --conditions=react-server scripts/link-meta-channel.mjs <email> <INSTAGRAM|MESSENGER>",
  );
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL }),
});

try {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`Nenhum utilizador com o e-mail ${email}. Registe-se primeiro na app.`);
    process.exit(1);
  }

  // Um id de conta só pode pertencer a uma organização (é o que encaminha o webhook).
  const owner = await prisma.socialIntegration.findUnique({
    where: { platform_providerAccountId: { platform, providerAccountId: accountId } },
  });
  if (owner && owner.workspaceId !== user.workspaceId) {
    console.error(`A conta ${accountId} já está ligada a OUTRA organização. Nada foi alterado.`);
    process.exit(1);
  }

  const data = { accessToken: encryptSecret(token), providerAccountId: accountId, pageId, status: "ACTIVE" };
  if (owner) {
    await prisma.socialIntegration.update({ where: { id: owner.id }, data });
    console.log(`Canal ${platform} atualizado na organização ${user.workspaceId}.`);
  } else {
    await prisma.socialIntegration.create({ data: { workspaceId: user.workspaceId, platform, ...data } });
    console.log(`Canal ${platform} ligado à organização ${user.workspaceId}.`);
  }
} finally {
  await prisma.$disconnect();
}
