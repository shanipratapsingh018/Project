// Downloads the stock photos listed in tools/photos.json into public/assets/img/photos/.
// Run on a computer with normal internet access:   npm run photos
// Options:  --force   re-download files that already exist
//           --check   only report which files are missing
// Until the files exist, pages load each photo straight from Unsplash's image CDN,
// and fall back to the illustration (or hide the photo) if that fails too.
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "public", "assets", "img", "photos");
const { photos } = JSON.parse(readFileSync(join(HERE, "photos.json"), "utf8"));
const force = process.argv.includes("--force");
const check = process.argv.includes("--check");
const WIDTHS = [800, 1600];
mkdirSync(OUT, { recursive: true });

const remote = (p, w) => `https://images.unsplash.com/${p.unsplash}?fm=jpg&q=72&w=${w}&fit=max`;
let ok = 0, skipped = 0, failed = 0, missing = 0;

for (const p of photos) {
  if (p.own || p.generated) { skipped += WIDTHS.length; continue; }
  for (const w of WIDTHS) {
    const file = join(OUT, `${p.id}-${w}.jpg`);
    if (existsSync(file) && statSync(file).size > 1000 && !force) { skipped++; continue; }
    if (check) { console.log("missing", `${p.id}-${w}.jpg`); missing++; continue; }
    try {
      const res = await fetch(remote(p, w), { headers: { "User-Agent": "carmechanic-indore-site-build" } });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const type = res.headers.get("content-type") || "";
      if (!type.startsWith("image/")) throw new Error("not an image: " + type);
      const buf = Buffer.from(await res.arrayBuffer());
      writeFileSync(file, buf);
      console.log(`saved ${p.id}-${w}.jpg  (${Math.round(buf.length / 1024)} KB)  — ${p.photographer} / Unsplash`);
      ok++;
    } catch (e) {
      console.error(`FAILED ${p.id}-${w}.jpg: ${e.message}`);
      failed++;
    }
  }
}
console.log(check ? `\n${missing} file(s) missing` : `\n${ok} downloaded, ${skipped} already present, ${failed} failed`);
if (failed) process.exitCode = 1;
