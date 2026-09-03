import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import manifest from "./manifest";
import { size as iconSize, contentType as iconContentType } from "./icon";
import {
  size as appleIconSize,
  contentType as appleIconContentType,
} from "./apple-icon";

describe("favicon, icons and manifest", () => {
  const appDir = path.resolve(import.meta.dirname);

  describe("favicon.ico", () => {
    const faviconPath = path.join(appDir, "favicon.ico");

    it("exists and is strictly under 10 KB (10,240 bytes)", () => {
      expect(fs.existsSync(faviconPath)).toBe(true);
      const stats = fs.statSync(faviconPath);
      expect(stats.size).toBeLessThan(10240);
      expect(stats.size).toBeLessThan(10000);
    });

    it("is a valid Windows ICO file with multi-resolution standard frames", () => {
      const buf = fs.readFileSync(faviconPath);
      expect(buf.length).toBeGreaterThanOrEqual(6);

      const reserved = buf.readUInt16LE(0);
      const type = buf.readUInt16LE(2);
      const count = buf.readUInt16LE(4);

      expect(reserved).toBe(0);
      expect(type).toBe(1); // 1 = ICO
      expect(count).toBeGreaterThanOrEqual(1);

      // Verify each directory entry
      for (let i = 0; i < count; i++) {
        const entryOffset = 6 + i * 16;
        const width = buf[entryOffset] || 256;
        const height = buf[entryOffset + 1] || 256;
        const size = buf.readUInt32LE(entryOffset + 8);
        const offset = buf.readUInt32LE(entryOffset + 12);

        expect(width).toBeLessThanOrEqual(64);
        expect(height).toBeLessThanOrEqual(64);
        expect(offset + size).toBeLessThanOrEqual(buf.length);
      }
    });
  });

  describe("web manifest (src/app/manifest.ts)", () => {
    it("returns expected MetadataRoute.Manifest configuration", () => {
      const m = manifest();
      expect(m.name).toBe("AfterClass");
      expect(m.short_name).toBe("AfterClass");
      expect(m.description).toBeTruthy();
      expect(m.start_url).toBe("/");
      expect(m.display).toBe("standalone");
      expect(m.background_color).toBe("#131316");
      expect(m.theme_color).toBe("#131316");

      expect(Array.isArray(m.icons)).toBe(true);
      expect(m.icons?.length).toBeGreaterThan(0);

      const faviconIcon = m.icons?.find((i) => i.src === "/favicon.ico");
      expect(faviconIcon).toBeDefined();

      const pngIcon = m.icons?.find(
        (i) => i.type === "image/png" && i.src.includes("icon"),
      );
      expect(pngIcon).toBeDefined();
    });
  });

  describe("icon and apple-icon conventions", () => {
    it("icon.tsx exports standard 32x32 image/png metadata", () => {
      expect(iconSize).toEqual({ width: 32, height: 32 });
      expect(iconContentType).toBe("image/png");
    });

    it("apple-icon.tsx exports standard 180x180 image/png metadata", () => {
      expect(appleIconSize).toEqual({ width: 180, height: 180 });
      expect(appleIconContentType).toBe("image/png");
    });
  });
});
