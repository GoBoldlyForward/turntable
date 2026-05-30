/**
 * Turntable — frame-flipping image slider driven by pointer, scroll,
 * autorotate, or a range input.
 *
 * Vanilla JS, no dependencies. Maintains the v1 HTML pattern:
 *
 *   <div class="turntable">
 *     <ul>
 *       <li data-img-src="frame-0.jpg"></li>
 *       <li data-img-src="frame-1.jpg"></li>
 *       ...
 *     </ul>
 *   </div>
 *
 *   new Turntable('.turntable', { axis: 'x' });
 */

const DEFAULTS = Object.freeze({
  axis: "x",
  reverse: false,
  scrollStart: "middle",
  autorotate: false,
  controller: null,
});

export class Turntable {
  constructor(element, options = {}) {
    const el = typeof element === "string"
      ? document.querySelector(element)
      : element;
    if (!el) throw new Error("Turntable: element not found");

    this.element = el;
    this.options = { ...DEFAULTS, ...options };
    this.items = Array.from(el.querySelectorAll(":scope > ul > li"));
    if (this.items.length === 0) {
      throw new Error("Turntable: no <li> frames inside <ul>");
    }

    this.sections = [];
    this.activeIndex = -1;
    this._rafId = null;
    this._autorotateId = null;
    this._listeners = [];
    this._observer = null;
    this._visible = true;

    this._loadImages();
    this._divide();
    this._bindResize();

    if (this.options.axis === "scroll") this._bindScroll();
    else this._bindPointer();

    if (this.options.controller) this._bindController();
    if (this.options.autorotate) this.start();

    this._setActive(0);
  }

  /** Force a re-measure (call after the container resizes off-window). */
  update() { this._divide(); }

  /** Jump to a specific frame (clamped to the visible range). */
  setFrame(index) {
    const clamped = Math.max(0, Math.min(this.items.length - 1, index | 0));
    this._setActive(clamped);
  }

  /** Begin autorotation. Uses `options.autorotate` ms, or pass an override. */
  start(intervalMs) {
    this.stop();
    const ms = intervalMs ?? this.options.autorotate;
    if (!ms) return;
    this._autorotateId = setInterval(() => {
      const next = (this.activeIndex + 1) % this.items.length;
      this._setActive(next);
    }, ms);
  }

  /** Stop autorotation. Safe to call when not running. */
  stop() {
    if (this._autorotateId) {
      clearInterval(this._autorotateId);
      this._autorotateId = null;
    }
  }

  /** Tear down listeners, observers, and active class. */
  destroy() {
    this.stop();
    for (const [type, target, handler, opts] of this._listeners) {
      target.removeEventListener(type, handler, opts);
    }
    this._listeners = [];
    if (this._rafId) cancelAnimationFrame(this._rafId);
    if (this._observer) this._observer.disconnect();
    if (this.activeIndex >= 0) {
      this.items[this.activeIndex]?.classList.remove("active");
    }
    this.activeIndex = -1;
  }

  _loadImages() {
    for (const li of this.items) {
      const src = li.dataset.imgSrc;
      if (!src) continue;
      const img = document.createElement("img");
      img.src = src;   // .src setter avoids HTML injection
      img.alt = "";
      li.replaceChildren(img);
    }
  }

  _divide() {
    let length;
    if (this.options.axis === "scroll") length = window.innerHeight;
    else if (this.options.axis === "y") length = this.element.offsetHeight;
    else length = this.element.offsetWidth;

    const n = this.items.length;
    const step = length / n;
    this.sections = this.items.map((_, i) => ({
      min: step * i,
      max: step * (i + 1),
      index: this.options.reverse ? n - 1 - i : i,
    }));
  }

  _bindResize() {
    const handler = () => this._divide();
    window.addEventListener("resize", handler);
    this._listeners.push(["resize", window, handler, undefined]);
  }

  _bindPointer() {
    const handler = (e) => {
      const rect = this.element.getBoundingClientRect();
      const position = this.options.axis === "y"
        ? e.clientY - rect.top
        : e.clientX - rect.left;
      // Prevent page scroll while scrubbing on touch.
      if (e.pointerType === "touch") e.preventDefault();
      this._schedule(position);
    };
    const opts = { passive: false };
    this.element.addEventListener("pointermove", handler, opts);
    this._listeners.push(["pointermove", this.element, handler, opts]);
  }

  _bindScroll() {
    // Gate scroll work when turntable is off-screen.
    this._observer = new IntersectionObserver(
      ([entry]) => { this._visible = entry.isIntersecting; },
      { threshold: 0 },
    );
    this._observer.observe(this.element);

    const handler = () => {
      if (!this._visible) return;
      const rect = this.element.getBoundingClientRect();
      const anchor =
        this.options.scrollStart === "top"    ? 0 :
        this.options.scrollStart === "bottom" ? window.innerHeight :
                                                window.innerHeight / 2;
      this._schedule(anchor - rect.top);
    };
    const opts = { passive: true };
    window.addEventListener("scroll", handler, opts);
    this._listeners.push(["scroll", window, handler, opts]);
  }

  _bindController() {
    const input = this.options.controller;
    input.min = "0";
    input.max = String(this.items.length - 1);
    input.step = "1";
    input.value = "0";
    const handler = () => this._setActive(Number(input.value));
    input.addEventListener("input", handler);
    this._listeners.push(["input", input, handler, undefined]);
  }

  _schedule(position) {
    // Coalesce rapid pointer/scroll events to one frame per paint.
    if (this._rafId) return;
    this._rafId = requestAnimationFrame(() => {
      this._rafId = null;
      const hit = this.sections.find((s) => position >= s.min && position <= s.max);
      if (hit) this._setActive(hit.index);
    });
  }

  _setActive(index) {
    if (index === this.activeIndex) return;
    if (this.activeIndex >= 0) {
      this.items[this.activeIndex]?.classList.remove("active");
    }
    this.items[index]?.classList.add("active");
    this.activeIndex = index;
    if (this.options.controller && Number(this.options.controller.value) !== index) {
      this.options.controller.value = String(index);
    }
  }
}

export default Turntable;
