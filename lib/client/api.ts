// Chamada às nossas rotas /api a partir do browser. Devolve sempre { ok, error, data } (nunca lança por erro de rede).
export async function callApi(url: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) {
  try {
    const res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = (await res.json().catch(() => null)) as { success?: boolean; error?: string; id?: string } | null;
    return { ok: Boolean(res.ok && data?.success), error: data?.error, id: data?.id };
  } catch {
    return { ok: false, error: "network" as string | undefined, id: undefined };
  }
}

const MESSAGES: Record<string, string> = {
  invalid_input: "Verifique os campos e tente novamente.",
  invalid_phone: "Número inválido. Use o formato internacional, por exemplo +351 912 345 678.",
  already_exists: "Já existe um contacto com esse número.",
  name_taken: "Já existe um modelo com esse nome.",
  too_many: "Atingiu o limite máximo para este item.",
  forbidden: "Não tem permissão para esta ação.",
  unauthenticated: "A sessão expirou. Inicie sessão novamente.",
  subscription_required: "É preciso um plano ativo para esta ação.",
  network: "Sem ligação ao servidor. Tente novamente.",
};

export const errorMessage = (code?: string) => MESSAGES[code ?? ""] ?? "Não foi possível concluir a ação. Tente novamente.";
