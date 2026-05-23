# Turntable

[![CI](https://github.com/GoBoldlyForward/turntable/actions/workflows/ci.yml/badge.svg)](https://github.com/GoBoldlyForward/turntable/actions/workflows/ci.yml)

A small frame-flipping image slider — point, scroll, autorotate, or wire it
to a range input. Zero dependencies, ~4 KB minified.

[Live demo →](https://goboldlyforward.github.io/turntable/)

```html
<div class="turntable">
  <ul>
    <li data-img-src="frame-0.jpg"></li>
    <li data-img-src="frame-1.jpg"></li>
    <li data-img-src="frame-2.jpg"></li>
  </ul>
</div>

<link rel="stylesheet" href="dist/turntable.css">
<script src="dist/turntable.iife.min.js"></script>
<script>
  new Turntable(".turntable", { axis: "x" });
</script>
```

## Install

```sh
npm install @goboldlyforward/turntable
```

```js
import { Turntable } from "@goboldlyforward/turntable";
import "@goboldlyforward/turntable/css";

new Turntable("#myTurntable", { axis: "scroll" });
```

For a plain script tag, use `dist/turntable.iife.min.js` (exposes `Turntable`
on `window`).

## Options

| Option        | Type                       | Default     | Description                                                                 |
| ------------- | -------------------------- | ----------- | --------------------------------------------------------------------------- |
| `axis`        | `"x"` \| `"y"` \| `"scroll"` | `"x"`       | What drives frame selection.                                                |
| `reverse`     | `boolean`                  | `false`     | Reverse the frame order.                                                    |
| `scrollStart` | `"top"` \| `"middle"` \| `"bottom"` | `"middle"` | Where in the viewport the scroll-driven cursor anchors. Only used when `axis === "scroll"`. |
| `autorotate`  | `false` \| `number`        | `false`     | Milliseconds per frame. Starts cycling on init.                             |
| `controller`  | `HTMLInputElement \| null` | `null`      | A `<input type="range">` to bind two-way: dragging it sets the frame, and frame changes update it. |

## API

```js
const t = new Turntable(elementOrSelector, options);

t.setFrame(2);       // jump to frame 2 (clamped)
t.start(150);        // begin autorotation (override interval if provided)
t.stop();            // halt autorotation
t.update();          // re-measure (call after the container resizes off-window)
t.destroy();         // remove listeners, observers, and the .active class
```

## HTML & CSS

Frame `<li>` elements declare their image via `data-img-src`; the plugin
creates the `<img>` for you using `.src` (not innerHTML, so there's no HTML
injection shape). The bundled CSS is small enough to inline:

```css
.turntable { display: inline-block; margin: 0; touch-action: none; }
.turntable > ul { padding: 0; margin: 0; }
.turntable > ul > li { list-style: none; display: none; }
.turntable > ul > li > img { width: 100%; display: block; }
.turntable > ul > li.active { display: block; }
```

`touch-action: none` keeps the page from scrolling while a finger is
scrubbing the frames.

## Performance notes

- **PointerEvents** unify mouse / touch / pen — no UA sniffing.
- **`requestAnimationFrame`** coalesces rapid pointermove and scroll events to
  one DOM write per paint.
- **`IntersectionObserver`** gates the scroll handler so an off-screen
  turntable does zero work.

## Migrating from v1 (jQuery)

The consumer HTML pattern is unchanged. The script tag and init call change:

```diff
- <script src="jquery.min.js"></script>
- <script src="turntable.js"></script>
+ <script src="dist/turntable.iife.min.js"></script>

- $('#myTurntable').turntable({ axis: 'x' });
+ new Turntable('#myTurntable', { axis: 'x' });
```

All v1 options (`axis`, `reverse`, `scrollStart`) are preserved with the
same semantics. New in v2: `autorotate`, `controller`, `setFrame()`,
`update()`, `destroy()`.

The legacy jQuery v1 is preserved on the [`v1-jquery-legacy`](https://github.com/GoBoldlyForward/turntable/tree/v1-jquery-legacy) branch.

## Development

```sh
npm install
npm test          # vitest in jsdom
npm run build     # esbuild -> dist/
```

## License

MIT. See [LICENSE](LICENSE).
