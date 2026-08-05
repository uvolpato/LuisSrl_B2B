"use client";

import type { ReactNode } from "react";
import Tooltip from "./Tooltip";

interface HintProps {
  text?: string;
  children?: ReactNode;
}

function toStr(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(toStr).join("");
  return "";
}

export default function Hint({ text, children }: HintProps) {
  const tip = text ?? toStr(children);
  return (
    <Tooltip text={tip}>
      <span className="hint" tabIndex={0}>
        ?
      </span>
    </Tooltip>
  );
}
