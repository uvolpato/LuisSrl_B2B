import type { Metadata } from "next";

/** Il token del link monouso non deve finire nel referrer verso altri siti. */
export const metadata: Metadata = {
  title: "Attiva account — Portale B2B Luis",
  referrer: "no-referrer",
};

export default function AttivaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
