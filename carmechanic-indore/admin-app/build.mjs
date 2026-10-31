import { build } from "esbuild";
import { mkdir, copyFile } from "node:fs/promises";
const dest = new URL("../public/admin/", import.meta.url);
await mkdir(dest, { recursive: true });
await build({
  entryPoints: [new URL("src/main.mjs", import.meta.url).pathname],
  bundle: true,
  minify: true,
  format: "esm",
  target: "es2022",
  outfile: new URL("admin.js", dest).pathname,
  legalComments: "eof",
  sourcemap: false,
});
for (const name of ["index.html", "admin.css"])
  await copyFile(new URL(`src/${name}`, import.meta.url), new URL(name, dest));
console.log(
  "Built private admin interface. No backend credentials are bundled.",
);
