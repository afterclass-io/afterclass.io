import { describe, expect, it } from "vitest";
import { abbreviateVenue } from "./abbreviate-venue";

describe("abbreviateVenue", () => {
  it("abbreviates Seminar Room to SR", () => {
    expect(abbreviateVenue("SCIS1 Seminar Room 3-4")).toBe("SCIS1 SR 3-4");
    expect(abbreviateVenue("SOE/SCIS2 Seminar Room 2-1")).toBe(
      "SOE/SCIS2 SR 2-1",
    );
  });

  it("abbreviates Active Learning Classroom to ALC", () => {
    expect(abbreviateVenue("SMU Connexion Active Learning Classroom 1")).toBe(
      "SMU Connexion ALC 1",
    );
  });

  it("abbreviates Classroom to CR", () => {
    expect(abbreviateVenue("LKCSB Classroom 2-1")).toBe("LKCSB CR 2-1");
  });

  it("abbreviates Mochtar Riady Auditorium to MRA", () => {
    expect(abbreviateVenue("Mochtar Riady Auditorium")).toBe("MRA");
  });

  it("abbreviates Ngee Ann Kongsi Auditorium to NAKA", () => {
    expect(abbreviateVenue("Ngee Ann Kongsi Auditorium")).toBe("NAKA");
  });

  it("leaves unknown venues untouched", () => {
    expect(abbreviateVenue("SOE Lecture Theatre 1")).toBe(
      "SOE Lecture Theatre 1",
    );
    expect(abbreviateVenue("SPH Auditorium")).toBe("SPH Auditorium");
    expect(abbreviateVenue("TBA")).toBe("TBA");
  });
});
