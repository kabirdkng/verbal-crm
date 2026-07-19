import { describe, expect, it } from "vitest";
import { isWithinServiceWindow, serviceWindowExpiresAt } from "@/lib/service-window";

describe("service window", () => {
  it("is closed when there is no inbound history", () => {
    expect(isWithinServiceWindow(null)).toBe(false);
    expect(serviceWindowExpiresAt(null)).toBeNull();
  });

  it("is open within 24 hours of last inbound", () => {
    const now = new Date("2026-07-20T12:00:00.000Z");
    const inbound = new Date("2026-07-20T01:00:00.000Z");
    expect(isWithinServiceWindow(inbound, now)).toBe(true);
  });

  it("is closed after 24 hours", () => {
    const now = new Date("2026-07-21T13:00:00.000Z");
    const inbound = new Date("2026-07-20T12:00:00.000Z");
    expect(isWithinServiceWindow(inbound, now)).toBe(false);
  });
});
