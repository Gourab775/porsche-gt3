# Vary — Porsche GT3 RS 3D Showcase

Live Demo: https://vary-porsche-gt3.vercel.app

Category: Automotive / Interactive 3D Experience

Stack: React 18 · Three.js · React Three Fiber · Drei · Vite

## Overview

Vary — Porsche GT3 RS is a cinematic, scroll-driven 3D product showcase centered on a high-fidelity `porsche_gt3_rs.glb` model. The experience choreographs camera, lighting, and model transforms across six narrative stages — from hero reveal through powertrain, aerodynamics, track setup, engineering detail, to a wide-frame configuration CTA — all rendered with physically-based lighting and smooth damped motion.

Implemented with React Three Fiber and Drei, it balances visual fidelity with performance: DRACO-compressed GLB, ACES tone mapping, adaptive DPR, and motion tuned for desktop and mobile.

## Features

- **High-Fidelity 3D Model** — `porsche_gt3_rs.glb` (~19 MB) loaded via `GLTFLoader` + `DRACOLoader`, auto-scaled, grounded (`GROUND_Y`), and enhanced with env-map intensity and shadow casting
- **Scroll-Orchestrated Story** — Six `sections` driving `scrollProgress` (0→1) to interpolate rotation, position, scale, camera path, and segment lighting (key/rim/underglow + sweep light)
- **Atmospheric Rendering** — `Environment` (`preset="night"`), `fog`, `SceneLighting` with damped intensities, `Atmosphere` particles (additive blending), vignette and mesh gradients
- **Responsive Cinematic UI** — Fixed `<Canvas>` scene layer with `ScrollRail`, `floating-header`, scroll-snapped story panels, telemetry/HUD, stats/aero/feature grids, and replay flow
- **Production Rendering** — Shadows, `ACESFilmicToneMapping`, `powerPreference: high-performance`, DPR 1–1.5, DRACO decoder from gstatic

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18, React DOM |
| 3D | Three.js 0.160, @react-three/fiber 8, @react-three/drei 9 |
| Loaders | GLTFLoader, DRACOLoader (DRACO) |
| Build | Vite 6, @vitejs/plugin-react |
| Styling | Vanilla CSS (`styles.css`) |

## Project Structure

```
vary-porsche-gt3/
├── index.html              # HTML shell (#root + canvas layer)
├── main.jsx                # React entry
├── App.jsx                 # Canvas, Scene, CameraRig, models, scroll panels
├── porsche_gt3_rs.glb      # GT3 RS model (DRACO)
├── styles.css              # Editorial + cinematic styling
├── vite.config.js          # Vite + React plugin
└── package.json
```

## Getting Started

Prerequisites: Node.js 18+ and npm.

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

Open the Vite URL (http://localhost:5173) to view the experience.

## Deployment

Vite builds static assets to `dist/`:

```bash
npm run build
```

Deploy `dist/` to any static host:

- **GitHub Pages** — Publish `dist/` via `gh-pages` or Actions workflow. Live at https://vary-porsche-gt3.vercel.app
- **Vercel / Netlify / EdgeOne Pages** — Connect repo, build command `npm run build`, output `dist`
- **S3 + CloudFront / CDN** — Upload `dist/` and `porsche_gt3_rs.glb` (ensure correct MIME and range requests for large GLB)

No environment variables required. DRACO decoder is fetched from `https://www.gstatic.com/draco/versioned/decoders/1.5.7/`.

## Customization

- **Model** — Replace `porsche_gt3_rs.glb` and its import in `App.jsx` (`import modelUrl from './porsche_gt3_rs.glb?url'`); re-tune `GROUND_Y`, `BASE_RIDE_HEIGHT`, and scaling logic in `PorscheModel`
- **Narrative** — Edit `sections` array (eyebrow/title/body/align) and per-stage `stats`, `aeroFeatures`, `telemetry`, `detailCards`
- **Camera & Motion** — Adjust `CameraRig` interpolation breakpoints and `PorscheModel` scroll keyframes (0–1 ranges) plus damping factors
- **Lighting** — Tune `SceneLighting` intensities, `Environment` preset, and `Atmosphere` particle count/velocity in `App.jsx`
- **Styling** — Modify `styles.css` (panels, rail, vignette, mesh-gradient, responsive breakpoints)

## License

MIT — free for personal and commercial use.
