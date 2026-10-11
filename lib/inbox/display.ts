// Some WhatsApp profile names are made only of invisible characters (zero-width spaces, the Hangul
// filler U+3164, braille blank U+2800...). String.trim() does not remove those, so such a contact
// would show up as an empty name. This keeps a name only if something visible is left.
const INVISIBLE = /[\s​-‏⁠⠀ㅤ﻿͏ᅟᅠ឴឵᠎]/g;

// Um «nome» que é só um número de telemóvel (+244 932 267 509, 00351…) também não é um nome: perfis sem nome
// chegam assim, e não deve aparecer duplicado onde há uma coluna do telemóvel.
const PHONE_LIKE = /^[\d\s+()\-.]+$/;

export function visibleName(name: string | null | undefined): string | null {
  if (!name) return null;
  if (name.replace(INVISIBLE, "").length === 0) return null;
  const trimmed = name.trim();
  return PHONE_LIKE.test(trimmed) ? null : trimmed;
}

export const NO_NAME = "Sem nome";

// Título de um contacto nas vistas em que o número já aparece noutro sítio (coluna do telemóvel, cabeçalho do chat):
// o nome, ou «Sem nome». NUNCA o número. (Instagram/Messenger não têm número: mantêm o fim do identificador.)
export function contactTitle(
  name: string | null | undefined,
  waId: string,
  platform: "WHATSAPP" | "INSTAGRAM" | "MESSENGER" = "WHATSAPP",
) {
  const visible = visibleName(name);
  if (visible) return visible;
  return platform === "WHATSAPP" ? NO_NAME : contactLabel(name, waId, platform);
}

// Para listas e seletores onde o número não aparece (Inbox, escolher um contacto): o nome, ou «Sem nome · …5509» (só
// o fim do número, para distinguir contactos sem nome sem usar o número como nome).
export function contactChoiceLabel(
  name: string | null | undefined,
  waId: string,
  platform: "WHATSAPP" | "INSTAGRAM" | "MESSENGER" = "WHATSAPP",
) {
  const visible = visibleName(name);
  if (visible) return visible;
  return platform === "WHATSAPP" ? `${NO_NAME} · …${waId.slice(-4)}` : contactLabel(name, waId, platform);
}

// The name to show for a contact: their profile name, or their phone number. Instagram and Messenger
// contacts have no phone number (and their webhooks carry no name): the end of their id is shown instead.
export function contactLabel(
  name: string | null | undefined,
  waId: string,
  platform: "WHATSAPP" | "INSTAGRAM" | "MESSENGER" = "WHATSAPP",
) {
  const visible = visibleName(name);
  if (visible) return visible;
  if (platform === "WHATSAPP") return `+${waId}`;
  return `${platform === "INSTAGRAM" ? "Instagram" : "Messenger"} …${waId.slice(-4)}`;
}
