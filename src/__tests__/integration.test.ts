import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "fs";
import { NextRequest } from "next/server";

vi.mock("fs");
const mockFs = vi.mocked(fs);

import { GET, POST, PATCH } from "../app/api/applications/route";
import type { Application } from "../lib/store";

// Shared mutable store for integration tests
let dbStore: Application[] = [];

function setupIntegrationDB() {
  mockFs.existsSync.mockReturnValue(true);
  mockFs.readFileSync.mockImplementation(() => JSON.stringify(dbStore));
  mockFs.writeFileSync.mockImplementation((_path: fs.PathOrFileDescriptor, data: string | NodeJS.ArrayBufferView) => {
    dbStore = JSON.parse(data as string);
  });
}

function makeRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), options);
}

describe("integration tests", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    dbStore = [];
    setupIntegrationDB();
  });

  describe("full workflow: create -> update stage -> add activity -> verify", () => {
    it("complete application lifecycle", async () => {
      // Step 1: Create application
      const createRes = await POST(makeRequest("http://localhost:3000/api/applications", {
        method: "POST",
        body: JSON.stringify({
          company: "Integration Corp",
          role: "Full Stack Developer",
          pipeline: "remote",
          tags: ["test"],
        }),
      }));
      const created = await createRes.json();
      expect(created.id).toBeDefined();
      expect(created.company).toBe("Integration Corp");
      expect(created.stage).toBe("lead");
      expect(created.activities).toHaveLength(1); // Creation activity

      // Step 2: Update stage to applied
      setupIntegrationDB(); // refresh mocks with updated store
      const patchRes = await PATCH(makeRequest("http://localhost:3000/api/applications", {
        method: "PATCH",
        body: JSON.stringify({ id: created.id, stage: "applied" }),
      }));
      const patched = await patchRes.json();
      expect(patched.stage).toBe("applied");
      expect(patched.appliedAt).not.toBeNull();
      expect(patched.activities.length).toBeGreaterThan(1);

      // Step 3: Add activity note
      setupIntegrationDB();
      const activityRes = await PATCH(makeRequest("http://localhost:3000/api/applications", {
        method: "PATCH",
        body: JSON.stringify({
          id: created.id,
          newActivity: { type: "call", text: "Called the hiring manager" },
        }),
      }));
      const withActivity = await activityRes.json();
      const callActivity = withActivity.activities.find((a: { type: string }) => a.type === "call");
      expect(callActivity).toBeDefined();
      expect(callActivity.text).toBe("Called the hiring manager");

      // Step 4: Verify via GET
      setupIntegrationDB();
      const getRes = await GET(makeRequest(`http://localhost:3000/api/applications?id=${created.id}`));
      const fetched = await getRes.json();
      expect(fetched.company).toBe("Integration Corp");
      expect(fetched.stage).toBe("applied");
      expect(fetched.activities.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("search after create", () => {
    it("create app then search finds it", async () => {
      // Create
      await POST(makeRequest("http://localhost:3000/api/applications", {
        method: "POST",
        body: JSON.stringify({ company: "SearchableXYZ", role: "Dev" }),
      }));

      // Search
      setupIntegrationDB();
      const searchRes = await GET(makeRequest("http://localhost:3000/api/applications?search=searchablexyz"));
      const results = await searchRes.json();
      expect(results).toHaveLength(1);
      expect(results[0].company).toBe("SearchableXYZ");
    });

    it("create multiple apps then filter by pipeline", async () => {
      await POST(makeRequest("http://localhost:3000/api/applications", {
        method: "POST",
        body: JSON.stringify({ company: "Dubai Co", pipeline: "dubai" }),
      }));

      setupIntegrationDB();
      await POST(makeRequest("http://localhost:3000/api/applications", {
        method: "POST",
        body: JSON.stringify({ company: "Remote Co", pipeline: "remote" }),
      }));

      setupIntegrationDB();
      const dubaiRes = await GET(makeRequest("http://localhost:3000/api/applications?pipeline=dubai"));
      const dubaiApps = await dubaiRes.json();
      expect(dubaiApps).toHaveLength(1);
      expect(dubaiApps[0].company).toBe("Dubai Co");
    });

    it("create app then search by tag", async () => {
      await POST(makeRequest("http://localhost:3000/api/applications", {
        method: "POST",
        body: JSON.stringify({ company: "Tagged Corp", tags: ["priority"] }),
      }));

      setupIntegrationDB();
      const tagRes = await GET(makeRequest("http://localhost:3000/api/applications?tag=priority"));
      const tagApps = await tagRes.json();
      expect(tagApps).toHaveLength(1);
      expect(tagApps[0].company).toBe("Tagged Corp");
    });
  });

  describe("stage progression tracking", () => {
    it("tracks full pipeline progression in activity log", async () => {
      // Create
      const createRes = await POST(makeRequest("http://localhost:3000/api/applications", {
        method: "POST",
        body: JSON.stringify({ company: "Pipeline Corp" }),
      }));
      const app = await createRes.json();

      // Move through stages
      const stages = ["applied", "interview", "offer", "won"];
      for (const stage of stages) {
        setupIntegrationDB();
        await PATCH(makeRequest("http://localhost:3000/api/applications", {
          method: "PATCH",
          body: JSON.stringify({ id: app.id, stage }),
        }));
      }

      // Verify all transitions tracked
      setupIntegrationDB();
      const finalRes = await GET(makeRequest(`http://localhost:3000/api/applications?id=${app.id}`));
      const final = await finalRes.json();
      expect(final.stage).toBe("won");

      const statusChanges = final.activities.filter((a: { type: string }) => a.type === "status_change");
      expect(statusChanges).toHaveLength(4); // lead->applied, applied->interview, interview->offer, offer->won
    });
  });

  describe("bulk operations", () => {
    it("bulk update then verify all changed", async () => {
      // Create multiple apps
      const ids: string[] = [];
      for (let i = 0; i < 3; i++) {
        setupIntegrationDB();
        const res = await POST(makeRequest("http://localhost:3000/api/applications", {
          method: "POST",
          body: JSON.stringify({ company: `Bulk Corp ${i}` }),
        }));
        const data = await res.json();
        ids.push(data.id);
      }

      // Bulk update
      setupIntegrationDB();
      await POST(makeRequest("http://localhost:3000/api/applications", {
        method: "POST",
        body: JSON.stringify({ bulkAction: "updateStage", ids, stage: "applied" }),
      }));

      // Verify all changed
      setupIntegrationDB();
      const allRes = await GET(makeRequest("http://localhost:3000/api/applications"));
      const all = await allRes.json();
      for (const app of all) {
        expect(app.stage).toBe("applied");
      }
    });
  });
});
