import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("merges class names conditionally", () => {
    expect(cn("a", false && "b", "c")).toBe("a c");
  });

  it("dedupes tailwind classes via twMerge", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});

