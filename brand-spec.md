# Luis S.r.l. — Brand Spec

**Client:** Luis S.r.l. — Bergamo, Italy
**Sector:** B2B wholesale — ceramic pots, Portuguese terracotta, garden/green industry supplies

## Color Tokens (OKLch)

```css
:root {
  --bg:      oklch(97% 0.005 80);     /* warm paper — slight cream */
  --surface: oklch(100% 0 0);          /* clean white cards */
  --fg:      oklch(22% 0.02 60);       /* deep warm charcoal */
  --muted:   oklch(52% 0.015 60);      /* warm grey secondary */
  --border:  oklch(88% 0.01 70);       /* light warm divider */
  --accent:  oklch(55% 0.14 45);       /* terracotta — primary action */
}
```

## Impronta attuale (riferimento congelato — v1 Luis)

Valori reali in produzione, spec di partenza per il tema white-label (To do #7
in `roadmap-b2b-luis.md`). Fonte: `frontend/app/globals.css:3-19`.

```css
:root {
  /* neutri caldi */
  --bg:      oklch(97% 0.005 80);   /* carta leggermente crema */
  --surface: oklch(100% 0 0);       /* bianco card */
  --fg:      oklch(22% 0.02 60);    /* testo: carbone scuro caldo */
  --muted:   oklch(52% 0.015 60);   /* secondario: grigio caldo */
  --border:  oklch(88% 0.01 70);    /* divisore caldo chiaro */

  /* accento (CTA) */
  --accent:      oklch(55% 0.14 45);  /* terracotta */
  --accent-soft: oklch(95% 0.03 45);  /* velo terracotta (fondi evidenze) */

  /* semantici */
  --danger: oklch(55% 0.18 25);   --red: oklch(55% 0.18 25);
  --ok:     oklch(55% 0.12 150);
  --amber:  oklch(60% 0.13 65);
  --blue:   oklch(55% 0.15 250);
  /* varianti -soft via color-mix(in oklch, <base> 14–16%, transparent) */

  --radius: 12px;

  --font-display: 'Iowan Old Style', 'Charter', Georgia, serif;
  --font-body:    -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  --font-mono:    ui-monospace, 'JetBrains Mono', 'SF Mono', Menlo, monospace;
}
```

Nota per il tema configurabile: tutta la UI deriva da questi token (`color-mix(in
oklch, var(--accent) …)`, link, focus, pill, badge, checkout), quindi gli override
dovranno ridimensionare anche le varianti soft.

## Font Stacks

```css
--font-display: 'Iowan Old Style', 'Charter', Georgia, serif;
--font-body:    -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
--font-mono:    ui-monospace, 'JetBrains Mono', 'SF Mono', Menlo, monospace;
```

## Layout Posture

- Serif display for headings (warmth, craftsmanship)
- Sans body for readability (clean B2B functionality)
- Terracotta accent used sparingly — eyebrow + CTA only
- Comfortable radii (10–14px) — approachable but professional
- No heavy shadows — borders and whitespace do the work
- Product imagery is the hero — generous whitespace around photos
- Clean grid layouts for catalog browsing
- Tabular numerics for prices and stock levels
