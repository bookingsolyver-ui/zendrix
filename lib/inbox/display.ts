// Some WhatsApp profile names are made only of invisible characters (zero-width spaces, the Hangul
// filler U+3164, braille blank U+2800...). String.trim() does not remove those, so such a contact
// would show up as an empty name. This keeps a name only if something visible is left.
const INVISIBLE = /[\s​-‏⁠⠀ㅤ﻿͏ᅟᅠ឴឵᠎]/g;

export function visibleName(name: string | null | undefined): string | null {
  if (!name) return null;
  return name.replace(INVISIBLE, "").length > 0 ? name.trim() : null;
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
