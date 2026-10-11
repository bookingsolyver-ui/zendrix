import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

// Cabeçalhos de segurança em todas as respostas. Não há CSP: o SDK do Facebook (Embedded Signup) e o Next
// injetam scripts, e uma CSP mal calibrada parte o login; avaliar à parte.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
];

const nextConfig: NextConfig = {
  // O ffmpeg (conversão das notas de voz) é um binário: fica fora do bundle e vai junto das funções que respondem a mensagens.
  serverExternalPackages: ["@ffmpeg-installer/ffmpeg"],
  outputFileTracingIncludes: {
    "/api/openwa/webhook": ["./node_modules/@ffmpeg-installer/linux-x64/**"],
    "/api/meta/webhook": ["./node_modules/@ffmpeg-installer/linux-x64/**"],
    "/api/webhooks/whatsapp": ["./node_modules/@ffmpeg-installer/linux-x64/**"],
    "/api/cron/**": ["./node_modules/@ffmpeg-installer/linux-x64/**"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  /* config options here */
};

export default withNextIntl(nextConfig);
