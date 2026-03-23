import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.join(__dirname, "data", "store.json");

export function readStore() {
  const raw = fs.readFileSync(dataPath, "utf-8");
  return JSON.parse(raw);
}

export function writeStore(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

export function nextId(prefix) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}
