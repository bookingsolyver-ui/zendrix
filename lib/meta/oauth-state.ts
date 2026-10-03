import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";
import type { OAuthPlatform } from "@/lib/validations/meta-oauth";

// ------------------------------------------------------------------------------------------------ state (CSRF)
// O `state` vai ao Facebook e volta; também fica num cookie httpOnly. O callback só avança se coincidirem:
// sem isto, alguém podia levar a vítima a ligar a conta Meta DO ATACANTE à organização dela.
export const STATE_COOKIE = "meta_oauth_state";
export const STATE_COOKIE_PATH = "/api/meta/oauth";
export const STATE_TTL_SECONDS = 10 * 60;

export interface StatePayload {
  state: string;
  platform: OAuthPlatform;
  locale: string;
}

export const newState = () => randomBytes(24).toString("base64url");

export const encodeStateCookie = ({ state, platform, locale }: StatePayload) => `${state}.${platform}.${locale}`;

export function decodeStateCookie(value: string | undefined): StatePayload | null {
  const [state, platform, locale, ...rest] = (value ?? "").split(".");
  if (rest.length || !state || !locale || (platform !== "instagram" && platform !== "messenger")) return null;
  return { state, platform, locale };
}

export function statesMatch(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
