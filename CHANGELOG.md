# Changelog

## 2.0.0 — 2026-05-23

Full rewrite. Drops jQuery; ships as ESM / CJS / IIFE.

### Breaking
- jQuery dependency removed. The `$.fn.turntable` plugin call is replaced by a
  class API: `new Turntable(elementOrSelector, options)`.
- Package renamed and scoped: `@goboldlyforward/turntable`. (v1 was never
  published to npm under a real name.)
- The legacy `gulp` / `browserify` toolchain is gone; replaced by a single
  esbuild step.

### Added
- `autorotate` option for hands-off frame cycling. Closes #14.
- `controller` option binds an external `<input type="range">` two-way.
  Closes #11.
- Public methods: `setFrame()`, `start()`, `stop()`, `update()`, `destroy()`.
- ESM / CJS / IIFE distribution; minified variants for ESM and IIFE.
- `dist/turntable.css` shipped alongside, with `touch-action: none` baked in
  so the page doesn't scroll while a finger is scrubbing.
- vitest test suite (13 tests) and GitHub Actions CI on Node 18 / 20 / 22.

### Changed
- PointerEvents replace the v1 mouse/touch UA-regex split — one handler,
  works for mouse + touch + pen.
- IntersectionObserver gates the scroll handler so off-screen turntables do
  zero work.
- requestAnimationFrame coalesces rapid pointermove and scroll events to one
  DOM write per paint.
- Image src is set via `.src` on a created `<img>`, not interpolated into
  `innerHTML`. No HTML-injection shape.
- `:scope > ul > li` scoping prevents accidentally grabbing nested lists in
  author markup.
- Frame selector scopes to direct children — nested lists in author markup
  no longer interfere.

### Preserved
- v1 is on the [`v1-jquery-legacy`](https://github.com/GoBoldlyForward/turntable/tree/v1-jquery-legacy)
  branch.
- Consumer HTML pattern (`<div class="turntable"><ul><li data-img-src="…">`)
  is unchanged.
- All v1 options (`axis`, `reverse`, `scrollStart`) keep their names and
  semantics.

## 1.1.1 — 2016

Initial public release (jQuery plugin). See `v1-jquery-legacy` branch.
