import fs from "fs";
import path from "path";

export default function readJson<T = unknown>(filePath: string): T {
  const data = fs.readFileSync(path.resolve(filePath), "utf-8");
  return JSON.parse(data) as T;
}
