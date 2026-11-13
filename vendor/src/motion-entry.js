// Vendor entry: only what the app actually calls, so the bundle stays auditable.
// `motion/mini` is the DOM-only build (no React) and exports just `animate` / `animateSequence`;
// the global exposed to app.js is `MotionLib`.
export { animate, animateSequence } from 'motion/mini';
