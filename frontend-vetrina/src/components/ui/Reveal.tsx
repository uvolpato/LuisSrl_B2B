'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Reveal allo scroll: osserva .reveal / .reveal-img e aggiunge .is-in (stesso script del prototipo).
// Rieseguito a ogni cambio pagina.
export default function Reveal() {
  const pathname = usePathname();

  useEffect(() => {
    const targets = Array.from(document.querySelectorAll('.reveal:not(.is-in), .reveal-img:not(.is-in)'));
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add('is-in');
            io.unobserve(en.target);
          }
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.1 },
    );
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  return null;
}
