// Monte la version de l'app partout où elle compte : package.json (lu par tauri.conf.json et
// affiché dans Settings) et Cargo.toml (envoyé au serveur de licences, app_version).
//   npm run bump 1.2.0
import { readFileSync, writeFileSync } from "node:fs";

const v = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(v ?? "")) {
  console.error("usage : npm run bump 1.2.0");
  process.exit(1);
}
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
pkg.version = v;
writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");
const cargo = readFileSync("src-tauri/Cargo.toml", "utf8").replace(/^version = "[^"]+"/m, `version = "${v}"`);
writeFileSync("src-tauri/Cargo.toml", cargo);
console.log(`Rago Optimizer ${v} : package.json et src-tauri/Cargo.toml mis à jour (Cargo.lock suivra au prochain build).`);
