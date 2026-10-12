import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export const SUPPORTED_LOCALES = ["it", "en"] as const;

export default getRequestConfig(async () => {
  const store = await cookies();
  const requested = store.get("lang")?.value;
  const locale = requested === "en" ? "en" : "it";
  const messages = (await import("../messages/" + locale + ".json")).default;
  return { locale, messages };
});
