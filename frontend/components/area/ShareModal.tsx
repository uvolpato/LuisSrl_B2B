"use client";

import { useState, useCallback, useEffect } from "react";

interface ShareOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
}

const SERVICE_ICONS = {
  email: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 9.72h-3.308l-7.227-8.26-8.502 8.26h-3.308l7.227-8.26L2.25 2.25h3.308l7.227 8.26 8.502-9.72z" />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  ),
  whatsapp: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.148-.669-1.611-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a19.856 19.856 0 0 1-2.649-.961 15.935 15.935 0 0 1-1.382-2.717 7.77 7.77 0 0 1-.085-1.382c-.117-.236-.277-.386-.447-.508a48.288 48.288 0 0 1 .488-1.522c.206-.397.393-.828.552-1.272.164-.452.28-.937.312-1.143a3.42 3.42 0 0 0-.036-.53c-.05-.207-.162-.39-.29-.555a43.115 43.115 0 0 0-1.322-.924c-.458-.176-1.014-.27-.1.565.198.238.455.55.787.913.41.457.67 1.047.787 1.727.117.68.067 1.348-.05 1.988a11.45 11.45 0 0 1-.643 2.011c-.218.462-.5.9-.81 1.234-.307.334-.726.592-1.14.748-.414.156-.864.223-1.317.223-.256 0-.485-.03-.702-.085" />
    </svg>
  ),
  copy: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
};

export function ShareModal({ isOpen, onClose, url, title }: ShareModalProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied("copied");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied("error");
      setTimeout(() => setCopied(null), 2000);
    }
  }, [url]);

  useEffect(() => {
    if (isOpen) {
      const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
      document.addEventListener("keydown", handler);
      return () => document.removeEventListener("keydown", handler);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const options: ShareOption[] = [
    {
      id: "email",
      label: "Email",
      icon: SERVICE_ICONS.email,
      href: `mailto:?subject=${encodedTitle}&body=${encodedTitle}%0A${encodedUrl}`,
    },
    {
      id: "facebook",
      label: "Facebook",
      icon: SERVICE_ICONS.facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      id: "x",
      label: "X (Twitter)",
      icon: SERVICE_ICONS.x,
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    },
    {
      id: "linkedin",
      label: "LinkedIn",
      icon: SERVICE_ICONS.linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      id: "whatsapp",
      label: "WhatsApp",
      icon: SERVICE_ICONS.whatsapp,
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    },
    {
      id: "copy",
      label: copied === "copied" ? "Link copiato" : copied === "error" ? "Copia fallita" : "Copia link",
      icon: copied === "copied" ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
      ) : SERVICE_ICONS.copy,
      onClick: handleCopy,
    },
  ];

  return (
    <div className="share-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="share-modal-title">
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="share-modal-header">
          <h2 id="share-modal-title">Condividi</h2>
          <button type="button" className="share-modal-close" onClick={onClose} aria-label="Chiudi">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="share-modal-grid">
          {options.map((opt) => (
            <a
              key={opt.id}
              className={`share-modal-btn ${opt.id}`}
              href={opt.href}
              target={opt.href ? "_blank" : undefined}
              rel={opt.href ? "noopener noreferrer" : undefined}
              onClick={(e) => {
                if (opt.onClick) {
                  e.preventDefault();
                  opt.onClick();
                }
              }}
            >
              <span className="share-modal-icon">{opt.icon}</span>
              <span className="share-modal-label">{opt.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}