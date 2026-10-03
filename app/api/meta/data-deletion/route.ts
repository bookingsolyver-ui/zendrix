import { NextResponse } from "next/server";
import { appOrigin } from "@/lib/http/origin";
import { eraseMetaUserData } from "@/lib/meta/data-deletion";
import { parseSignedRequest } from "@/lib/meta/signed-request";
import { metaDeletionFormSchema } from "@/lib/validations/data-deletion";

// Data Deletion Callback da Meta. Configurar em: painel da app → Definições da app → Básico → "URL de callback
// de eliminação de dados" = https://<dominio>/api/meta/data-deletion
// A Meta faz POST (form) com `signed_request`; a resposta TEM de ser { url, confirmation_code }.
export async function POST(request: Request) {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) {
    console.error("[meta/data-deletion] META_APP_SECRET não está definido");
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const form = await request.formData().catch(() => null);
  const body = metaDeletionFormSchema.safeParse({ signed_request: form?.get("signed_request") });
  if (!body.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const verified = parseSignedRequest(body.data.signed_request, appSecret);
  if (!verified) return NextResponse.json({ error: "invalid_signature" }, { status: 400 });

  try {
    const { code } = await eraseMetaUserData(verified.userId);
    return NextResponse.json({
      url: `${appOrigin(request)}/en/data-deletion/status?code=${code}`,
      confirmation_code: code,
    });
  } catch (err) {
    console.error("[meta/data-deletion] falhou", err instanceof Error ? err.name : "unknown");
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}
