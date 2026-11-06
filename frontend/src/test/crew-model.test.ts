import { describe, expect, it } from "vitest";
import { crewRoles, humanGates } from "@/lib/crew-model";

describe("Crew explainer content boundaries", () => {
  it("keeps all five Rita role names unique and preserves her ordering", () => {
    expect(crewRoles.map(x => x.name)).toEqual(["Smith", "Watchtower", "Synthesizer", "Contrarian", "Referee"]);
    expect(new Set(crewRoles.map(x => x.id)).size).toBe(5);
  });
  it("keeps proof and human safeguards visible for every role", () => {
    for (const role of crewRoles) {
      expect(role.image).toBe(`/crew/${role.name.toLowerCase()}.svg`);
      expect(role.inSignal.length).toBeGreaterThan(30);
      expect(role.safeguard.length).toBeGreaterThan(30);
      expect(role.proof.length).toBeGreaterThan(15);
    }
  });
  it("never represents unimplemented outcomes or autonomous monitoring as live", () => {
    expect(crewRoles.find(x => x.id === "receipt")?.capability).toBe("future");
    expect(crewRoles.find(x => x.id === "watch")?.capability).toBe("partial");
    expect(humanGates.filter(x => x.implemented).map(x => x.title)).toEqual([
      "Release panel feedback", "Approve public findings",
    ]);
  });
});
