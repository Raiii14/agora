# UI.md

Current-state visual design system. Update values in place, no history, no log.
If a visual decision is architecturally significant, record it in `context/DECISIONS.md`.

## Aesthetic

Direction: White canvas, dark ink, restrained editorial layout.
Reference: `context/DESIGN.md`

## Tokens

```css
:root {
  --bg: #ffffff;          /* page background */
  --surface: #f8fafc;     /* subtle surface background */
  --primary: #181d26;     /* main brand color */
  --accent: #1b61c9;      /* highlights, links, decorative */
  --text: #181d26;        /* primary text */
  --muted: #41454d;       /* secondary / caption text */
  --border: #dddddd;      /* border / divider */
}
```

## Type

- Font: Haas Groot Disp, Haas, sans-serif for headings; Haas, sans-serif for body.
- Scale: Large display headings, readable body copy, restrained hierarchy.
- Weight: Modest weights only; avoid heavy or overly bold headline treatment.

## Radius

- Small: 6px
- Medium: 10px
- Full: 9999px

## Spacing

- Base unit: 8px
- Scale: 12px, 16px, 24px, 32px, 96px for section spacing.

## Rules

These are the active constraints for the landing page and shared UI. Keep them aligned with `context/DESIGN.md`.

1. Hero headings must use wide containers and stay to 2-3 lines max.
2. Do not place eyebrow badges or pill labels above the main H1.
3. Primary buttons should stay pill-shaped and use the primary color.
4. Keep the page on a white background with strong dark text contrast.
5. Use simple spacing and layout breaks instead of card-heavy marketing blocks.
6. Keep display headings tight in line-height and tracking.
