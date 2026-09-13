import { describe, expect, it } from "vitest";
import { rateLimit } from "@/lib/security";

describe("rateLimit", () => {
  it("throttles after the configured window quota", () => {
    const key = `test:${crypto.randomUUID()}`;

    expect(rateLimit(key, 2, 1000).allowed).toBe(true);
    expect(rateLimit(key, 2, 1000).allowed).toBe(true);
    expect(rateLimit(key, 2, 1000).allowed).toBe(false);
  });
});
