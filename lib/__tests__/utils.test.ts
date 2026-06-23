import { describe, it, expect } from "vitest";
import {
  normalizeDomain,
  getCurrentDR,
  getTrend,
  calculateStats,
  sortDomains,
  getDRColor,
  getDRBarColor,
} from "../utils";
import type { TrackedDomain } from "../types";

function makeDomain(overrides: Partial<TrackedDomain> = {}): TrackedDomain {
  return {
    domain: "example.com",
    history: [],
    lastChecked: null,
    ...overrides,
  };
}

describe("normalizeDomain", () => {
  it("normalizes a bare domain", () => {
    expect(normalizeDomain("google.com")).toBe("google.com");
  });

  it("strips www prefix", () => {
    expect(normalizeDomain("www.google.com")).toBe("google.com");
  });

  it("strips protocol and path", () => {
    expect(normalizeDomain("https://www.google.com/search")).toBe("google.com");
  });

  it("lowercases", () => {
    expect(normalizeDomain("Google.COM")).toBe("google.com");
  });

  it("returns null for invalid input", () => {
    expect(normalizeDomain("")).toBeNull();
    expect(normalizeDomain("   ")).toBeNull();
    expect(normalizeDomain("no-dot")).toBeNull();
  });

  it("returns null for too-short domains", () => {
    expect(normalizeDomain("a.b")).toBeNull();
  });
});

describe("getCurrentDR", () => {
  it("returns null for empty history", () => {
    expect(getCurrentDR(makeDomain({ history: [] }))).toBeNull();
  });

  it("returns last history point DR", () => {
    const d = makeDomain({
      history: [
        { ts: 1, dr: 50 },
        { ts: 2, dr: 55 },
      ],
    });
    expect(getCurrentDR(d)).toBe(55);
  });
});

describe("getTrend", () => {
  it("returns null for < 2 history points", () => {
    expect(getTrend(makeDomain({ history: [{ ts: 1, dr: 50 }] }))).toBeNull();
  });

  it("detects upward trend", () => {
    const d = makeDomain({
      history: [
        { ts: 1, dr: 50 },
        { ts: 2, dr: 55 },
      ],
    });
    const trend = getTrend(d);
    expect(trend?.direction).toBe("up");
    expect(trend?.delta).toBe(5);
  });

  it("detects downward trend", () => {
    const d = makeDomain({
      history: [
        { ts: 1, dr: 60 },
        { ts: 2, dr: 50 },
      ],
    });
    const trend = getTrend(d);
    expect(trend?.direction).toBe("down");
    expect(trend?.delta).toBe(-10);
  });

  it("detects flat trend", () => {
    const d = makeDomain({
      history: [
        { ts: 1, dr: 50 },
        { ts: 2, dr: 50 },
      ],
    });
    const trend = getTrend(d);
    expect(trend?.direction).toBe("flat");
    expect(trend?.delta).toBe(0);
  });
});

describe("calculateStats", () => {
  it("handles empty array", () => {
    const stats = calculateStats([]);
    expect(stats.count).toBe(0);
    expect(stats.avg).toBeNull();
    expect(stats.max).toBeNull();
  });

  it("calculates avg and max", () => {
    const domains = [
      makeDomain({ domain: "a.com", history: [{ ts: 1, dr: 40 }] }),
      makeDomain({ domain: "b.com", history: [{ ts: 1, dr: 60 }] }),
    ];
    const stats = calculateStats(domains);
    expect(stats.count).toBe(2);
    expect(stats.avg).toBe(50);
    expect(stats.max).toBe(60);
  });

  it("ignores domains with no DR", () => {
    const domains = [
      makeDomain({ domain: "a.com", history: [] }),
      makeDomain({ domain: "b.com", history: [{ ts: 1, dr: 60 }] }),
    ];
    const stats = calculateStats(domains);
    expect(stats.count).toBe(2);
    expect(stats.avg).toBe(60);
    expect(stats.max).toBe(60);
  });
});

describe("sortDomains", () => {
  const domains = [
    makeDomain({ domain: "b.com", history: [{ ts: 1, dr: 40 }], lastChecked: 100 }),
    makeDomain({ domain: "a.com", history: [{ ts: 1, dr: 60 }], lastChecked: 200 }),
  ];

  it("sorts by DR descending", () => {
    const sorted = sortDomains(domains, "dr-desc");
    expect(sorted[0].domain).toBe("a.com");
  });

  it("sorts by DR ascending", () => {
    const sorted = sortDomains(domains, "dr-asc");
    expect(sorted[0].domain).toBe("b.com");
  });

  it("sorts by name ascending", () => {
    const sorted = sortDomains(domains, "name-asc");
    expect(sorted[0].domain).toBe("a.com");
  });

  it("sorts by updated descending", () => {
    const sorted = sortDomains(domains, "updated-desc");
    expect(sorted[0].domain).toBe("a.com");
  });
});

describe("getDRColor / getDRBarColor", () => {
  it("returns zinc for null DR", () => {
    expect(getDRColor(null).text).toBe("text-zinc-400");
    expect(getDRBarColor(null)).toBe("#d4d4d8");
  });

  it("returns emerald for high DR", () => {
    expect(getDRColor(95).text).toBe("text-emerald-700");
    expect(getDRBarColor(95)).toBe("#10b981");
  });

  it("returns red for low DR", () => {
    expect(getDRColor(5).text).toBe("text-red-700");
    expect(getDRBarColor(5)).toBe("#ef4444");
  });
});
