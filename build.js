// Bundles src/turntable.js to ESM, CJS, and IIFE (browser script tag), each minified.
// Also copies src/turntable.css to dist/.
import { build } from "esbuild";
import { copyFile, mkdir } from "node:fs/promises";

const entry = "src/turntable.js";
const banner = `/*! @goboldlyforward/turntable v${process.env.npm_package_version ?? "2.0.0"} | MIT | https://github.com/GoBoldlyForward/turntable */`;

const targets = [
  { format: "esm",  outfile: "dist/turntable.js",      minify: false },
  { format: "esm",  outfile: "dist/turntable.min.js",  minify: true  },
  { format: "cjs",  outfile: "dist/turntable.cjs",     minify: false },
  { format: "iife", outfile: "dist/turntable.iife.js", minify: false, globalName: "Turntable", footer: { js: "Turntable = Turntable.default ?? Turntable;" } },
  { format: "iife", outfile: "dist/turntable.iife.min.js", minify: true, globalName: "Turntable", footer: { js: "Turntable=Turntable.default??Turntable;" } },
];

await mkdir("dist", { recursive: true });

for (const t of targets) {
  await build({
    entryPoints: [entry],
    bundle: true,
    target: ["es2020"],
    banner: { js: banner },
    ...t,
  });
  process.stdout.write(`built ${t.outfile}\n`);
}

await copyFile("src/turntable.css", "dist/turntable.css");
process.stdout.write("built dist/turntable.css\n");
