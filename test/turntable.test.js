import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Turntable } from "../src/turntable.js";

function mount(frames = 4, attrs = "") {
  const root = document.createElement("div");
  root.className = "turntable";
  root.setAttribute("style", "width: 400px; height: 300px;");
  if (attrs) root.setAttribute("style", root.getAttribute("style") + ";" + attrs);
  const ul = document.createElement("ul");
  for (let i = 0; i < frames; i++) {
    const li = document.createElement("li");
    li.dataset.imgSrc = `frame-${i}.jpg`;
    ul.appendChild(li);
  }
  root.appendChild(ul);
  document.body.appendChild(root);
  return root;
}

// jsdom returns 0 for layout reads by default — stub getBoundingClientRect
// and the offset properties so _divide() has real numbers to chew on.
function fakeLayout(el, { width = 400, height = 300, top = 0, left = 0 } = {}) {
  el.getBoundingClientRect = () => ({
    width, height, top, left,
    right: left + width, bottom: top + height,
    x: left, y: top, toJSON() { return this; },
  });
  Object.defineProperty(el, "offsetWidth",  { configurable: true, get: () => width  });
  Object.defineProperty(el, "offsetHeight", { configurable: true, get: () => height });
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("Turntable construction", () => {
  it("activates the first frame on init", () => {
    const root = mount();
    fakeLayout(root);
    const t = new Turntable(root);
    expect(root.querySelectorAll("li.active")).toHaveLength(1);
    expect(root.querySelector("li:first-child").classList.contains("active")).toBe(true);
    t.destroy();
  });

  it("loads each <li> with an <img> using the .src setter (no HTML injection)", () => {
    const root = mount(3);
    fakeLayout(root);
    root.querySelectorAll("li")[1].dataset.imgSrc = `x" onerror="window.__pwned=true`;
    const t = new Turntable(root);
    const imgs = root.querySelectorAll("li > img");
    expect(imgs).toHaveLength(3);
    expect(window.__pwned).toBeUndefined();
    expect(imgs[1].getAttribute("src")).toContain(`onerror=`); // literal, not interpreted
    t.destroy();
  });

  it("accepts a selector string", () => {
    const root = mount();
    root.id = "tt";
    fakeLayout(root);
    const t = new Turntable("#tt");
    expect(t.element).toBe(root);
    t.destroy();
  });

  it("throws when the element is missing", () => {
    expect(() => new Turntable("#nope")).toThrow(/element not found/);
  });

  it("throws when there are no frames", () => {
    const root = document.createElement("div");
    root.appendChild(document.createElement("ul"));
    document.body.appendChild(root);
    expect(() => new Turntable(root)).toThrow(/no <li> frames/);
  });
});

describe("setFrame", () => {
  it("moves the active class to the requested index", () => {
    const root = mount(5);
    fakeLayout(root);
    const t = new Turntable(root);
    t.setFrame(3);
    const lis = root.querySelectorAll("li");
    expect(lis[3].classList.contains("active")).toBe(true);
    expect(root.querySelectorAll("li.active")).toHaveLength(1);
    t.destroy();
  });

  it("clamps out-of-range indices", () => {
    const root = mount(4);
    fakeLayout(root);
    const t = new Turntable(root);
    t.setFrame(999);
    expect(root.querySelectorAll("li")[3].classList.contains("active")).toBe(true);
    t.setFrame(-10);
    expect(root.querySelectorAll("li")[0].classList.contains("active")).toBe(true);
    t.destroy();
  });
});

describe("reverse option", () => {
  it("inverts the index mapping for pointer hits", () => {
    const root = mount(4);
    fakeLayout(root); // 400px wide, 4 frames → 100px each
    const t = new Turntable(root, { reverse: true });
    expect(t.sections[0].index).toBe(3);
    expect(t.sections[3].index).toBe(0);
    t.destroy();
  });
});

describe("autorotate", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("advances frames on the configured interval and wraps", () => {
    const root = mount(3);
    fakeLayout(root);
    const t = new Turntable(root, { autorotate: 100 });
    const lis = root.querySelectorAll("li");
    expect(lis[0].classList.contains("active")).toBe(true);
    vi.advanceTimersByTime(100);
    expect(lis[1].classList.contains("active")).toBe(true);
    vi.advanceTimersByTime(100);
    expect(lis[2].classList.contains("active")).toBe(true);
    vi.advanceTimersByTime(100);
    expect(lis[0].classList.contains("active")).toBe(true);
    t.destroy();
  });

  it("stop() halts the interval", () => {
    const root = mount(3);
    fakeLayout(root);
    const t = new Turntable(root, { autorotate: 100 });
    t.stop();
    vi.advanceTimersByTime(500);
    expect(root.querySelectorAll("li")[0].classList.contains("active")).toBe(true);
    t.destroy();
  });
});

describe("controller (range input)", () => {
  it("configures min/max/step and syncs both directions", () => {
    const root = mount(5);
    fakeLayout(root);
    const input = document.createElement("input");
    input.type = "range";
    document.body.appendChild(input);

    const t = new Turntable(root, { controller: input });
    expect(input.min).toBe("0");
    expect(input.max).toBe("4");
    expect(input.step).toBe("1");
    expect(input.value).toBe("0");

    input.value = "2";
    input.dispatchEvent(new Event("input"));
    expect(root.querySelectorAll("li")[2].classList.contains("active")).toBe(true);

    t.setFrame(4);
    expect(input.value).toBe("4");

    t.destroy();
  });
});

describe("destroy", () => {
  it("removes the active class and the resize listener", () => {
    const root = mount(3);
    fakeLayout(root);
    const t = new Turntable(root);
    const removed = vi.spyOn(window, "removeEventListener");
    t.destroy();
    expect(root.querySelectorAll("li.active")).toHaveLength(0);
    const resizeCall = removed.mock.calls.find(([type]) => type === "resize");
    expect(resizeCall).toBeDefined();
    expect(typeof resizeCall[1]).toBe("function");
    removed.mockRestore();
  });

  it("stops autorotate", () => {
    vi.useFakeTimers();
    const root = mount(3);
    fakeLayout(root);
    const t = new Turntable(root, { autorotate: 50 });
    t.destroy();
    vi.advanceTimersByTime(500);
    expect(root.querySelectorAll("li.active")).toHaveLength(0);
    vi.useRealTimers();
  });
});
