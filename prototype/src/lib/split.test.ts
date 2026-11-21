import { describe, expect, it } from "vitest";
import { allocateCents } from "./split";

describe("allocateCents", () => {
  it("allocates a $60 expense exactly across three members", () => {
    const allocations = allocateCents(6000, ["alice", "bob", "charlie"]);

    expect([...allocations.values()].reduce((sum, cents) => sum + cents, 0)).toBe(6000);
    expect(allocations.get("alice")).toBe(2000);
    expect(allocations.get("bob")).toBe(2000);
    expect(allocations.get("charlie")).toBe(2000);
  });

  it("distributes a $10 remainder deterministically", () => {
    const allocations = allocateCents(1000, ["charlie", "alice", "bob"]);

    expect(allocations.get("alice")).toBe(334);
    expect(allocations.get("bob")).toBe(333);
    expect(allocations.get("charlie")).toBe(333);
    expect([...allocations.values()].reduce((sum, cents) => sum + cents, 0)).toBe(1000);
  });

  it("rejects invalid amounts and duplicate participants", () => {
    expect(() => allocateCents(0, ["alice"])).toThrow();
    expect(() => allocateCents(-100, ["alice"])).toThrow();
    expect(() => allocateCents(100, [])).toThrow();
    expect(() => allocateCents(100, ["alice", "alice"])).toThrow();
  });
});
