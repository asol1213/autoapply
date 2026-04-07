import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "fs";
import { NextRequest } from "next/server";

vi.mock("fs");
const mockFs = vi.mocked(fs);

import { GET, POST, PATCH, DELETE } from "../app/api/applications/route";
import type { Application } from "../lib/store";

function makeApp(overrides: Partial<Application> = {}): Application {
  return {
    id: "test-1",
    pipeline: "remote",
    stage: "lead",
    company: "Acme Corp",
    role: "Engineer",
    url: "https://example.com",
    language: "en",
    jobDescription: "Build things",
    coverLetter: "",
    cvData: "",
    emailSubject: "",
    emailBody: "",
    contact: { name: "John", role: "HR", email: "j@test.com", linkedin: "", phone: "" },
    notes: "Some notes",
    nextAction: "",
    nextActionDate: null,
    skills: ["React", "TypeScript"],
    salary: "",
    tags: ["urgent", "remote"],
    activities: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    appliedAt: null,
    followUpAt: null,
    followUpDone: false,
    ...overrides,
  };
}

function mockDB(apps: Application[]) {
  mockFs.existsSync.mockReturnValue(true);
  mockFs.readFileSync.mockReturnValue(JSON.stringify(apps));
  mockFs.writeFileSync.mockImplementation(() => {});
}

function makeRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), options);
}

describe("API /api/applications", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("GET", () => {
    it("returns all applications", async () => {
      const apps = [makeApp({ id: "a1" }), makeApp({ id: "a2" })];
      mockDB(apps);

      const res = await GET(makeRequest("http://localhost:3000/api/applications"));
      const data = await res.json();
      expect(data).toHaveLength(2);
    });

    it("filters by pipeline", async () => {
      const apps = [
        makeApp({ id: "a1", pipeline: "dubai" }),
        makeApp({ id: "a2", pipeline: "remote" }),
      ];
      mockDB(apps);

      const res = await GET(makeRequest("http://localhost:3000/api/applications?pipeline=dubai"));
      const data = await res.json();
      expect(data).toHaveLength(1);
      expect(data[0].pipeline).toBe("dubai");
    });

    it("filters by tag", async () => {
      const apps = [
        makeApp({ id: "a1", tags: ["urgent"] }),
        makeApp({ id: "a2", tags: ["other"] }),
      ];
      mockDB(apps);

      const res = await GET(makeRequest("http://localhost:3000/api/applications?tag=urgent"));
      const data = await res.json();
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe("a1");
    });

    it("filters by stage", async () => {
      const apps = [
        makeApp({ id: "a1", stage: "lead" }),
        makeApp({ id: "a2", stage: "applied" }),
      ];
      mockDB(apps);

      const res = await GET(makeRequest("http://localhost:3000/api/applications?stage=applied"));
      const data = await res.json();
      expect(data).toHaveLength(1);
      expect(data[0].stage).toBe("applied");
    });

    it("search works on company name", async () => {
      const apps = [
        makeApp({ id: "a1", company: "Google" }),
        makeApp({ id: "a2", company: "Apple" }),
      ];
      mockDB(apps);

      const res = await GET(makeRequest("http://localhost:3000/api/applications?search=google"));
      const data = await res.json();
      expect(data).toHaveLength(1);
      expect(data[0].company).toBe("Google");
    });

    it("search works on role", async () => {
      const apps = [
        makeApp({ id: "a1", role: "Frontend Developer" }),
        makeApp({ id: "a2", role: "Backend Developer" }),
      ];
      mockDB(apps);

      const res = await GET(makeRequest("http://localhost:3000/api/applications?search=frontend"));
      const data = await res.json();
      expect(data).toHaveLength(1);
    });

    it("search works on contact name", async () => {
      const apps = [
        makeApp({ id: "a1", contact: { name: "Alice", role: "", email: "", linkedin: "", phone: "" } }),
        makeApp({ id: "a2", contact: { name: "Bob", role: "", email: "", linkedin: "", phone: "" } }),
      ];
      mockDB(apps);

      const res = await GET(makeRequest("http://localhost:3000/api/applications?search=alice"));
      const data = await res.json();
      expect(data).toHaveLength(1);
    });

    it("search works on tags", async () => {
      const apps = [
        makeApp({ id: "a1", tags: ["priority"] }),
        makeApp({ id: "a2", tags: ["normal"] }),
      ];
      mockDB(apps);

      const res = await GET(makeRequest("http://localhost:3000/api/applications?search=priority"));
      const data = await res.json();
      expect(data).toHaveLength(1);
    });

    it("search works on skills", async () => {
      const apps = [
        makeApp({ id: "a1", skills: ["Python"] }),
        makeApp({ id: "a2", skills: ["Java"] }),
      ];
      mockDB(apps);

      const res = await GET(makeRequest("http://localhost:3000/api/applications?search=python"));
      const data = await res.json();
      expect(data).toHaveLength(1);
    });

    it("combined filters work", async () => {
      const apps = [
        makeApp({ id: "a1", pipeline: "dubai", stage: "lead", company: "Google" }),
        makeApp({ id: "a2", pipeline: "dubai", stage: "applied", company: "Google" }),
        makeApp({ id: "a3", pipeline: "remote", stage: "lead", company: "Google" }),
      ];
      mockDB(apps);

      const res = await GET(makeRequest("http://localhost:3000/api/applications?pipeline=dubai&stage=lead&search=google"));
      const data = await res.json();
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe("a1");
    });

    it("returns single app by id", async () => {
      const apps = [makeApp({ id: "find-me", company: "Target Co" })];
      mockDB(apps);

      const res = await GET(makeRequest("http://localhost:3000/api/applications?id=find-me"));
      const data = await res.json();
      expect(data.id).toBe("find-me");
      expect(data.company).toBe("Target Co");
    });

    it("returns 404 for missing id", async () => {
      mockDB([]);

      const res = await GET(makeRequest("http://localhost:3000/api/applications?id=nonexistent"));
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("not found");
    });

    it("pipeline=all returns all apps", async () => {
      const apps = [
        makeApp({ id: "a1", pipeline: "dubai" }),
        makeApp({ id: "a2", pipeline: "remote" }),
      ];
      mockDB(apps);

      const res = await GET(makeRequest("http://localhost:3000/api/applications?pipeline=all"));
      const data = await res.json();
      expect(data).toHaveLength(2);
    });
  });

  describe("POST", () => {
    it("creates app with all fields", async () => {
      mockDB([]);

      const res = await POST(makeRequest("http://localhost:3000/api/applications", {
        method: "POST",
        body: JSON.stringify({
          company: "New Corp",
          role: "Dev",
          pipeline: "dubai",
          stage: "lead",
          tags: ["hot"],
          skills: ["React"],
        }),
      }));
      const data = await res.json();
      expect(data.company).toBe("New Corp");
      expect(data.role).toBe("Dev");
      expect(data.pipeline).toBe("dubai");
      expect(data.tags).toEqual(["hot"]);
      expect(data.skills).toEqual(["React"]);
      expect(data.id).toBeDefined();
      expect(data.activities).toHaveLength(1);
    });

    it("requires company", async () => {
      mockDB([]);

      const res = await POST(makeRequest("http://localhost:3000/api/applications", {
        method: "POST",
        body: JSON.stringify({ role: "Dev" }),
      }));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("company required");
    });

    it("rejects empty company string", async () => {
      mockDB([]);

      const res = await POST(makeRequest("http://localhost:3000/api/applications", {
        method: "POST",
        body: JSON.stringify({ company: "   " }),
      }));
      expect(res.status).toBe(400);
    });

    it("creates with default values", async () => {
      mockDB([]);

      const res = await POST(makeRequest("http://localhost:3000/api/applications", {
        method: "POST",
        body: JSON.stringify({ company: "Minimal Corp" }),
      }));
      const data = await res.json();
      expect(data.pipeline).toBe("remote");
      expect(data.stage).toBe("lead");
      expect(data.language).toBe("en");
      expect(data.appliedAt).toBeNull();
    });

    it("sets appliedAt when stage is applied", async () => {
      mockDB([]);

      const res = await POST(makeRequest("http://localhost:3000/api/applications", {
        method: "POST",
        body: JSON.stringify({ company: "Applied Corp", stage: "applied" }),
      }));
      const data = await res.json();
      expect(data.appliedAt).not.toBeNull();
    });

    it("bulk update works", async () => {
      const apps = [
        makeApp({ id: "b1", stage: "lead" }),
        makeApp({ id: "b2", stage: "lead" }),
      ];
      mockDB(apps);

      const res = await POST(makeRequest("http://localhost:3000/api/applications", {
        method: "POST",
        body: JSON.stringify({ bulkAction: "updateStage", ids: ["b1", "b2"], stage: "applied" }),
      }));
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.updated).toBe(2);
    });
  });

  describe("PATCH", () => {
    it("updates fields", async () => {
      const apps = [makeApp({ id: "p1", company: "Old Co" })];
      mockDB(apps);

      const res = await PATCH(makeRequest("http://localhost:3000/api/applications", {
        method: "PATCH",
        body: JSON.stringify({ id: "p1", company: "New Co" }),
      }));
      const data = await res.json();
      expect(data.company).toBe("New Co");
    });

    it("tracks stage changes in activity log", async () => {
      const apps = [makeApp({ id: "p2", stage: "lead", activities: [] })];
      mockDB(apps);

      const res = await PATCH(makeRequest("http://localhost:3000/api/applications", {
        method: "PATCH",
        body: JSON.stringify({ id: "p2", stage: "applied" }),
      }));
      const data = await res.json();
      expect(data.activities.length).toBeGreaterThan(0);
      const stageChange = data.activities.find((a: { type: string }) => a.type === "status_change");
      expect(stageChange).toBeDefined();
      expect(stageChange.text).toContain("lead");
      expect(stageChange.text).toContain("applied");
    });

    it("sets appliedAt on first apply", async () => {
      const apps = [makeApp({ id: "p3", stage: "lead", appliedAt: null })];
      mockDB(apps);

      const res = await PATCH(makeRequest("http://localhost:3000/api/applications", {
        method: "PATCH",
        body: JSON.stringify({ id: "p3", stage: "applied" }),
      }));
      const data = await res.json();
      expect(data.appliedAt).not.toBeNull();
      expect(data.followUpAt).not.toBeNull();
    });

    it("does not reset appliedAt on subsequent applies", async () => {
      const originalDate = "2026-01-01T00:00:00.000Z";
      const apps = [makeApp({ id: "p4", stage: "interview", appliedAt: originalDate })];
      mockDB(apps);

      const res = await PATCH(makeRequest("http://localhost:3000/api/applications", {
        method: "PATCH",
        body: JSON.stringify({ id: "p4", stage: "applied" }),
      }));
      const data = await res.json();
      expect(data.appliedAt).toBe(originalDate);
    });

    it("adds activity via newActivity", async () => {
      const apps = [makeApp({ id: "p5", activities: [] })];
      mockDB(apps);

      const res = await PATCH(makeRequest("http://localhost:3000/api/applications", {
        method: "PATCH",
        body: JSON.stringify({ id: "p5", newActivity: { type: "call", text: "Called HR" } }),
      }));
      const data = await res.json();
      const callActivity = data.activities.find((a: { type: string }) => a.type === "call");
      expect(callActivity).toBeDefined();
      expect(callActivity.text).toBe("Called HR");
    });

    it("returns 400 without id", async () => {
      mockDB([]);

      const res = await PATCH(makeRequest("http://localhost:3000/api/applications", {
        method: "PATCH",
        body: JSON.stringify({ company: "No ID" }),
      }));
      expect(res.status).toBe(400);
    });

    it("returns 404 for missing app", async () => {
      mockDB([]);

      const res = await PATCH(makeRequest("http://localhost:3000/api/applications", {
        method: "PATCH",
        body: JSON.stringify({ id: "nonexistent" }),
      }));
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE", () => {
    it("removes app", async () => {
      const apps = [makeApp({ id: "d1" }), makeApp({ id: "d2" })];
      mockDB(apps);

      const res = await DELETE(makeRequest("http://localhost:3000/api/applications", {
        method: "DELETE",
        body: JSON.stringify({ id: "d1" }),
      }));
      const data = await res.json();
      expect(data.ok).toBe(true);

      // Verify writeFileSync was called with only d2
      const written = JSON.parse(mockFs.writeFileSync.mock.calls[0][1] as string);
      expect(written).toHaveLength(1);
      expect(written[0].id).toBe("d2");
    });

    it("returns 400 without id", async () => {
      mockDB([]);

      const res = await DELETE(makeRequest("http://localhost:3000/api/applications", {
        method: "DELETE",
        body: JSON.stringify({}),
      }));
      expect(res.status).toBe(400);
    });
  });
});
