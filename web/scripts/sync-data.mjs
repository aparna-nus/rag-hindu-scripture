// Simple sync: copies ../data -> ./public/data
import fs from "fs";
import path from "path";

const SRC = path.resolve(process.cwd(), "../data");
const DEST = path.resolve(process.cwd(), "./public/data");

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

copyDir(SRC, DEST);
console.log("Synced ../data -> public/data");
