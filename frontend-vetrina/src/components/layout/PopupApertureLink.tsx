'use client';

import { usePathname } from 'next/navigation';

export default function PopupApertureLink() {
  const pathname = usePathname();
  if (pathname !== '/') return null;
  return (
    <li>
      <a
        href='#'
        onClick={(e) => {
          e.preventDefault();
          window.dispatchEvent(new Event('luis-popup-open'));
        }}
      >
        Aperture domenicali Natale 2026
      </a>
    </li>
  );
}
