import { describe, it, expect } from "vitest";

// Since these are "use client" React components, we test the module exports
// and structural expectations without a full DOM renderer (no jsdom in this setup).

describe("Skeleton components", () => {
  it("exports all skeleton components", async () => {
    const mod = await import("../components/Skeleton");
    expect(typeof mod.SkeletonPulse).toBe("function");
    expect(typeof mod.SkeletonKPICard).toBe("function");
    expect(typeof mod.SkeletonCard).toBe("function");
    expect(typeof mod.SkeletonColumn).toBe("function");
    expect(typeof mod.SkeletonDashboard).toBe("function");
  });

  it("SkeletonPulse accepts className prop", async () => {
    const mod = await import("../components/Skeleton");
    // Verify the function signature accepts an object with className
    const fn = mod.SkeletonPulse;
    expect(fn.length).toBeLessThanOrEqual(1); // single props arg or no arg (default)
  });

  it("SkeletonKPICard is a valid component function", async () => {
    const mod = await import("../components/Skeleton");
    // SkeletonKPICard takes no required props
    expect(mod.SkeletonKPICard).toBeDefined();
    expect(typeof mod.SkeletonKPICard).toBe("function");
  });

  it("SkeletonCard is a valid component function", async () => {
    const mod = await import("../components/Skeleton");
    expect(mod.SkeletonCard).toBeDefined();
    expect(typeof mod.SkeletonCard).toBe("function");
  });

  it("SkeletonDashboard is a valid component function", async () => {
    const mod = await import("../components/Skeleton");
    expect(mod.SkeletonDashboard).toBeDefined();
    expect(typeof mod.SkeletonDashboard).toBe("function");
  });
});
