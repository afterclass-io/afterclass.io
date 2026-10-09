import { describe, expect, it } from "vitest";

import { Prisma } from "@/generated/prisma/client";
import {
  isForeignKeyViolation,
  isUniqueConstraintViolation,
  prismaErrorCode,
} from "./db-errors";

describe("db-errors", () => {
  const createKnownError = (code: string) =>
    new Prisma.PrismaClientKnownRequestError("m", {
      code,
      clientVersion: "test",
    });

  describe("prismaErrorCode", () => {
    it("extracts code from a real PrismaClientKnownRequestError", () => {
      expect(prismaErrorCode(createKnownError("P2002"))).toBe("P2002");
      expect(prismaErrorCode(createKnownError("P2003"))).toBe("P2003");
    });

    it("extracts code from a plain object with code", () => {
      expect(prismaErrorCode({ code: "P2002" })).toBe("P2002");
      expect(prismaErrorCode({ code: "P2003" })).toBe("P2003");
    });

    it("extracts code from an Error with an assigned code", () => {
      expect(
        prismaErrorCode(Object.assign(new Error("unique"), { code: "P2002" })),
      ).toBe("P2002");
      expect(
        prismaErrorCode(
          Object.assign(new Error("foreign key"), { code: "P2003" }),
        ),
      ).toBe("P2003");
    });

    it("returns the code string even for non-matching codes", () => {
      expect(prismaErrorCode(createKnownError("P2025"))).toBe("P2025");
      expect(prismaErrorCode({ code: "OTHER" })).toBe("OTHER");
    });

    it("returns undefined for non-string code property", () => {
      expect(prismaErrorCode({ code: 123 })).toBeUndefined();
      expect(prismaErrorCode({ code: null })).toBeUndefined();
      expect(prismaErrorCode({ code: undefined })).toBeUndefined();
      expect(prismaErrorCode({ code: {} })).toBeUndefined();
    });

    it("returns undefined for non-object or nullish values", () => {
      expect(prismaErrorCode(null)).toBeUndefined();
      expect(prismaErrorCode(undefined)).toBeUndefined();
      expect(prismaErrorCode("P2002")).toBeUndefined();
      expect(prismaErrorCode(2002)).toBeUndefined();
      expect(prismaErrorCode({})).toBeUndefined();
    });
  });

  describe("isUniqueConstraintViolation", () => {
    it("returns true for a real PrismaClientKnownRequestError with P2002", () => {
      expect(isUniqueConstraintViolation(createKnownError("P2002"))).toBe(true);
    });

    it("returns true for a plain object with code P2002", () => {
      expect(isUniqueConstraintViolation({ code: "P2002" })).toBe(true);
    });

    it("returns true for an Error with an assigned code P2002", () => {
      expect(
        isUniqueConstraintViolation(
          Object.assign(new Error("unique"), { code: "P2002" }),
        ),
      ).toBe(true);
    });

    it("returns false for non-matching codes (including P2003)", () => {
      expect(isUniqueConstraintViolation(createKnownError("P2003"))).toBe(
        false,
      );
      expect(isUniqueConstraintViolation({ code: "P2003" })).toBe(false);
      expect(isUniqueConstraintViolation({ code: "P2025" })).toBe(false);
    });

    it("returns false for non-string code property", () => {
      expect(isUniqueConstraintViolation({ code: 2002 })).toBe(false);
      expect(isUniqueConstraintViolation({ code: null })).toBe(false);
      expect(isUniqueConstraintViolation({ code: undefined })).toBe(false);
      expect(isUniqueConstraintViolation({ code: {} })).toBe(false);
    });

    it("returns false for non-object or nullish values", () => {
      expect(isUniqueConstraintViolation(null)).toBe(false);
      expect(isUniqueConstraintViolation(undefined)).toBe(false);
      expect(isUniqueConstraintViolation("P2002")).toBe(false);
      expect(isUniqueConstraintViolation(2002)).toBe(false);
      expect(isUniqueConstraintViolation({})).toBe(false);
    });
  });

  describe("isForeignKeyViolation", () => {
    it("returns true for a real PrismaClientKnownRequestError with P2003", () => {
      expect(isForeignKeyViolation(createKnownError("P2003"))).toBe(true);
    });

    it("returns true for a plain object with code P2003", () => {
      expect(isForeignKeyViolation({ code: "P2003" })).toBe(true);
    });

    it("returns true for an Error with an assigned code P2003", () => {
      expect(
        isForeignKeyViolation(
          Object.assign(new Error("fk"), { code: "P2003" }),
        ),
      ).toBe(true);
    });

    it("returns false for non-matching codes (including P2002)", () => {
      expect(isForeignKeyViolation(createKnownError("P2002"))).toBe(false);
      expect(isForeignKeyViolation({ code: "P2002" })).toBe(false);
      expect(isForeignKeyViolation({ code: "P2025" })).toBe(false);
    });

    it("returns false for non-string code property", () => {
      expect(isForeignKeyViolation({ code: 2003 })).toBe(false);
      expect(isForeignKeyViolation({ code: null })).toBe(false);
      expect(isForeignKeyViolation({ code: undefined })).toBe(false);
      expect(isForeignKeyViolation({ code: {} })).toBe(false);
    });

    it("returns false for non-object or nullish values", () => {
      expect(isForeignKeyViolation(null)).toBe(false);
      expect(isForeignKeyViolation(undefined)).toBe(false);
      expect(isForeignKeyViolation("P2003")).toBe(false);
      expect(isForeignKeyViolation(2003)).toBe(false);
      expect(isForeignKeyViolation({})).toBe(false);
    });
  });
});
