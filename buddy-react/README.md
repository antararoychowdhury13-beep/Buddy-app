# Buddy — React clone

A faithful **React.js** port of the Buddy AI prototype (`/home-ai`), reproducing
the exact mobile UI: the phone frame, status bar, bottom tab bar, Ask Buddy mic
FAB, Manrope type and the full `home.css` design system — pixel-for-pixel.

## How it works

- **`src/PhoneShell.tsx`** — the React shell. It owns the phone frame, status
  bar, tab bar and FAB, and the active-tab state.
- **`src/homeai/`** — the prototype's framework-agnostic domain and renderers
  (models, mock data, engines, and the Home / Today / Ask Buddy / Life module
  views). React mounts the active module's renderer into a `ref`, so the output
  is byte-identical to the vanilla prototype.
- **`src/home.css`** — the prototype stylesheet, reused verbatim.

Data comes from the bundled mock context (no backend required), exactly as the
prototype does when its API is unreachable.

## Run

```bash
npm install
npm run dev      # http://localhost:5273
npm run build    # type-check + production build
```
