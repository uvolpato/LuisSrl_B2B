"use client";

import type { ReactNode } from "react";
import Tooltip from "./Tooltip";

export default function DataTip({ tip, children }: { tip: string; children: ReactNode }) {
  if (!tip) return <>{children}</>;
  return <Tooltip text={tip}>{children}</Tooltip>;
}
