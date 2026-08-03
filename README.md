# Listism — a Todo app

A single-file todo app (HTML/CSS/JS in `index.html`) with task categories,
due dates, per-view filtering, search, and a mobile drawer sidebar.

## Accessibility

The app is built to pass WCAG 2.1/2.2 AA audits (axe-core, Lighthouse, WAVE).
Highlights:

- Semantic landmarks: `header` (with skip link), `nav`, `main`, `ul` task list
- Custom controls are fully keyboard-operable and ARIA-annotated:
  `role="checkbox"` toggles (Enter/Space), `role="button"` nav items,
  `role="progressbar"` progress card, `aria-expanded`/`aria-controls` drawer
- Hidden mobile sidebar uses the `inert` attribute when closed (out of tab
  order and the accessibility tree), `Escape` closes it, focus returns to the
  toggle
- Focus is managed across re-renders (checkbox keeps focus on toggle; heading
  receives focus when a task leaves the view or is deleted)
- Screen-reader live announcements (`role="status"`) for add/delete/clear/view
  changes; decorative icons are `aria-hidden`
- All text meets 4.5:1 contrast; visible focus indicators everywhere; reduced
  motion is respected via `prefers-reduced-motion`

## Auditing

```sh
npm install          # installs axe-core + puppeteer-core (dev-only)
node a11y-audit.js   # axe WCAG 2.x AA + best-practice across desktop/mobile
                     # states, plus keyboard focus & toggle smoke tests
node a11y-final.js   # axe with ALL rules (incl. experimental), duplicate-id,
                     # console-error and reduced-motion checks
```

Both scripts drive the system Chrome install headlessly; edit `CHROME` in the
scripts if your browser lives elsewhere.
