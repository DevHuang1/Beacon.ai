import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const svg = fs.readFileSync(path.join(dir, "public/logo.svg"));
const png = await sharp(svg, { density: 300 }).png().resize(256, 256).toBuffer();
fs.writeFileSync(path.join(dir, "public/logo.png"), png);
console.log("wrote public/logo.png", png.length, "bytes");
