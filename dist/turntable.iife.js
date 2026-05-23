/*! @goboldlyforward/turntable v2.0.0 | MIT | https://github.com/GoBoldlyForward/turntable */
var Turntable = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/turntable.js
  var turntable_exports = {};
  __export(turntable_exports, {
    Turntable: () => Turntable,
    default: () => turntable_default
  });
  var DEFAULTS = Object.freeze({
    axis: "x",
    // 'x' | 'y' | 'scroll'
    reverse: false,
    scrollStart: "middle",
    // 'top' | 'middle' | 'bottom'
    autorotate: false,
    // false | number (ms per frame)
    controller: null
    // optional HTMLInputElement (type=range)
  });
  var Turntable = class {
    constructor(element, options = {}) {
      const el = typeof element === "string" ? document.querySelector(element) : element;
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
    // --- public API ---------------------------------------------------------
    /** Force a re-measure (call after the container resizes off-window). */
    update() {
      this._divide();
    }
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
    // --- internals ----------------------------------------------------------
    _loadImages() {
      for (const li of this.items) {
        const src = li.dataset.imgSrc;
        if (!src) continue;
        const img = document.createElement("img");
        img.src = src;
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
        index: this.options.reverse ? n - 1 - i : i
      }));
    }
    _bindResize() {
      const handler = () => this._divide();
      window.addEventListener("resize", handler);
      this._listeners.push(["resize", window, handler, void 0]);
    }
    _bindPointer() {
      const handler = (e) => {
        const rect = this.element.getBoundingClientRect();
        const position = this.options.axis === "y" ? e.clientY - rect.top : e.clientX - rect.left;
        if (e.pointerType === "touch") e.preventDefault();
        this._schedule(position);
      };
      const opts = { passive: false };
      this.element.addEventListener("pointermove", handler, opts);
      this._listeners.push(["pointermove", this.element, handler, opts]);
    }
    _bindScroll() {
      this._observer = new IntersectionObserver(
        ([entry]) => {
          this._visible = entry.isIntersecting;
        },
        { threshold: 0 }
      );
      this._observer.observe(this.element);
      const handler = () => {
        if (!this._visible) return;
        const rect = this.element.getBoundingClientRect();
        const anchor = this.options.scrollStart === "top" ? 0 : this.options.scrollStart === "bottom" ? window.innerHeight : window.innerHeight / 2;
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
      this._listeners.push(["input", input, handler, void 0]);
    }
    _schedule(position) {
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
  };
  var turntable_default = Turntable;
  return __toCommonJS(turntable_exports);
})();
Turntable = Turntable.default ?? Turntable;
