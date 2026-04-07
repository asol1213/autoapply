import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "fs";

vi.mock("fs");
const mockFs = vi.mocked(fs);

import {
  getApplications,
  getApplication,
  saveApplication,
  deleteApplication,
  bulkUpdateStage,
  type Application,
} from "../lib/store";

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
    contact: { name: "", role: "", email: "", linkedin: "", phone: "" },
    notes: "",
    nextAction: "",
    nextActionDate: null,
    skills: [],
    salary: "",
    tags: [],
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

describe("store advanced", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("concurrent reads", () => {
    it("multiple getApplications calls return same data", () => {
      const apps = [makeApp({ id: "a1" }), makeApp({ id: "a2" })];
      mockDB(apps);

      const r1 = getApplications();
      const r2 = getApplications();
      expect(r1).toHaveLength(2);
      expect(r2).toHaveLength(2);
      expect(r1[0].id).toBe(r2[0].id);
    });

    it("getApplication during getApplications", () => {
      const apps = [makeApp({ id: "find" })];
      mockDB(apps);

      const all = getApplications();
      const single = getApplication("find");
      expect(all).toHaveLength(1);
      expect(single?.id).toBe("find");
    });
  });

  describe("large dataset", () => {
    it("handles 100+ applications", () => {
      const apps: Application[] = [];
      for (let i = 0; i < 150; i++) {
        apps.push(makeApp({
          id: `app-${i}`,
          updatedAt: new Date(2026, 0, 1, 0, 0, i).toISOString(),
        }));
      }
      mockDB(apps);

      const result = getApplications();
      expect(result).toHaveLength(150);
      // Should be sorted by updatedAt descending
      const first = new Date(result[0].updatedAt).getTime();
      const last = new Date(result[result.length - 1].updatedAt).getTime();
      expect(first).toBeGreaterThanOrEqual(last);
    });

    it("finds app in large dataset", () => {
      const apps: Application[] = [];
      for (let i = 0; i < 200; i++) {
        apps.push(makeApp({ id: `app-${i}` }));
      }
      mockDB(apps);

      const result = getApplication("app-150");
      expect(result?.id).toBe("app-150");
    });

    it("deletes from large dataset", () => {
      const apps: Application[] = [];
      for (let i = 0; i < 100; i++) {
        apps.push(makeApp({ id: `app-${i}` }));
      }
      mockDB(apps);

      deleteApplication("app-50");
      const written = JSON.parse(mockFs.writeFileSync.mock.calls[0][1] as string);
      expect(written).toHaveLength(99);
      expect(written.find((a: Application) => a.id === "app-50")).toBeUndefined();
    });
  });

  describe("special characters", () => {
    it("handles special characters in company name", () => {
      const app = makeApp({ id: "special", company: "Müller & Söhne GmbH™" });
      mockDB([]);

      saveApplication(app);
      const written = JSON.parse(mockFs.writeFileSync.mock.calls[0][1] as string);
      expect(written[0].company).toBe("Müller & Söhne GmbH™");
    });

    it("handles special characters in role", () => {
      const app = makeApp({ id: "special-role", role: "Senior Développeur (Full-Stack)" });
      mockDB([]);

      saveApplication(app);
      const written = JSON.parse(mockFs.writeFileSync.mock.calls[0][1] as string);
      expect(written[0].role).toBe("Senior Développeur (Full-Stack)");
    });

    it("handles special characters in notes", () => {
      const app = makeApp({ id: "special-notes", notes: "Kontakt über LinkedIn — \"interessant\"" });
      mockDB([]);

      saveApplication(app);
      const written = JSON.parse(mockFs.writeFileSync.mock.calls[0][1] as string);
      expect(written[0].notes).toBe("Kontakt über LinkedIn — \"interessant\"");
    });

    it("handles quotes in JSON correctly", () => {
      const app = makeApp({ id: "quotes", company: 'Test "Company" Ltd' });
      mockDB([]);

      saveApplication(app);
      const written = JSON.parse(mockFs.writeFileSync.mock.calls[0][1] as string);
      expect(written[0].company).toBe('Test "Company" Ltd');
    });
  });

  describe("unicode support", () => {
    it("handles Chinese characters", () => {
      const app = makeApp({ id: "chinese", company: "阿里巴巴集团" });
      mockDB([]);

      saveApplication(app);
      const written = JSON.parse(mockFs.writeFileSync.mock.calls[0][1] as string);
      expect(written[0].company).toBe("阿里巴巴集团");
    });

    it("handles Arabic characters", () => {
      const app = makeApp({ id: "arabic", company: "شركة عربية" });
      mockDB([]);

      saveApplication(app);
      const written = JSON.parse(mockFs.writeFileSync.mock.calls[0][1] as string);
      expect(written[0].company).toBe("شركة عربية");
    });

    it("handles emoji in tags", () => {
      const app = makeApp({ id: "emoji", tags: ["🔥 hot", "⭐ priority"] });
      mockDB([]);

      saveApplication(app);
      const written = JSON.parse(mockFs.writeFileSync.mock.calls[0][1] as string);
      expect(written[0].tags).toEqual(["🔥 hot", "⭐ priority"]);
    });
  });

  describe("empty fields handling", () => {
    it("handles empty arrays", () => {
      const app = makeApp({ id: "empty-arr", tags: [], skills: [], activities: [] });
      mockDB([]);

      saveApplication(app);
      const written = JSON.parse(mockFs.writeFileSync.mock.calls[0][1] as string);
      expect(written[0].tags).toEqual([]);
      expect(written[0].skills).toEqual([]);
      expect(written[0].activities).toEqual([]);
    });

    it("handles null dates", () => {
      const app = makeApp({ id: "null-dates", appliedAt: null, followUpAt: null, nextActionDate: null });
      mockDB([]);

      saveApplication(app);
      const written = JSON.parse(mockFs.writeFileSync.mock.calls[0][1] as string);
      expect(written[0].appliedAt).toBeNull();
      expect(written[0].followUpAt).toBeNull();
      expect(written[0].nextActionDate).toBeNull();
    });

    it("handles empty string fields", () => {
      const app = makeApp({ id: "empty-str", company: "Test", role: "", url: "", notes: "" });
      mockDB([]);

      saveApplication(app);
      const written = JSON.parse(mockFs.writeFileSync.mock.calls[0][1] as string);
      expect(written[0].role).toBe("");
      expect(written[0].url).toBe("");
    });
  });

  describe("date sorting accuracy", () => {
    it("sorts by updatedAt descending", () => {
      const apps = [
        makeApp({ id: "oldest", updatedAt: "2026-01-01T00:00:00.000Z" }),
        makeApp({ id: "newest", updatedAt: "2026-06-01T00:00:00.000Z" }),
        makeApp({ id: "middle", updatedAt: "2026-03-15T00:00:00.000Z" }),
      ];
      mockDB(apps);

      const result = getApplications();
      expect(result[0].id).toBe("newest");
      expect(result[1].id).toBe("middle");
      expect(result[2].id).toBe("oldest");
    });

    it("falls back to createdAt when updatedAt is empty", () => {
      const apps = [
        makeApp({ id: "old", updatedAt: "", createdAt: "2026-01-01T00:00:00.000Z" }),
        makeApp({ id: "new", updatedAt: "", createdAt: "2026-06-01T00:00:00.000Z" }),
      ];
      mockDB(apps);

      const result = getApplications();
      expect(result[0].id).toBe("new");
      expect(result[1].id).toBe("old");
    });

    it("handles same timestamps", () => {
      const apps = [
        makeApp({ id: "a", updatedAt: "2026-03-01T00:00:00.000Z" }),
        makeApp({ id: "b", updatedAt: "2026-03-01T00:00:00.000Z" }),
      ];
      mockDB(apps);

      const result = getApplications();
      expect(result).toHaveLength(2);
    });
  });

  describe("bulkUpdateStage edge cases", () => {
    it("handles invalid IDs without crashing", () => {
      const apps = [makeApp({ id: "valid", stage: "lead" })];
      mockDB(apps);

      // Should not throw
      expect(() => bulkUpdateStage(["nonexistent1", "nonexistent2"], "applied")).not.toThrow();

      const written = JSON.parse(mockFs.writeFileSync.mock.calls[0][1] as string);
      expect(written[0].stage).toBe("lead"); // unchanged
    });

    it("handles empty ids array", () => {
      const apps = [makeApp({ id: "a", stage: "lead" })];
      mockDB(apps);

      expect(() => bulkUpdateStage([], "applied")).not.toThrow();

      const written = JSON.parse(mockFs.writeFileSync.mock.calls[0][1] as string);
      expect(written[0].stage).toBe("lead");
    });

    it("handles mix of valid and invalid IDs", () => {
      const apps = [
        makeApp({ id: "a", stage: "lead" }),
        makeApp({ id: "b", stage: "lead" }),
      ];
      mockDB(apps);

      bulkUpdateStage(["a", "nonexistent"], "applied");

      const written = JSON.parse(mockFs.writeFileSync.mock.calls[0][1] as string);
      expect(written[0].stage).toBe("applied");
      expect(written[1].stage).toBe("lead");
    });

    it("updates updatedAt on bulk update", () => {
      const apps = [makeApp({ id: "a", stage: "lead", updatedAt: "2020-01-01T00:00:00.000Z" })];
      mockDB(apps);

      bulkUpdateStage(["a"], "applied");

      const written = JSON.parse(mockFs.writeFileSync.mock.calls[0][1] as string);
      const updatedTime = new Date(written[0].updatedAt).getTime();
      expect(updatedTime).toBeGreaterThan(new Date("2020-01-01").getTime());
    });
  });

  describe("save and update", () => {
    it("preserves other apps when saving new", () => {
      const existing = [makeApp({ id: "existing" })];
      mockDB(existing);

      saveApplication(makeApp({ id: "new-one" }));

      const written = JSON.parse(mockFs.writeFileSync.mock.calls[0][1] as string);
      expect(written).toHaveLength(2);
    });

    it("does not duplicate on update", () => {
      const existing = [makeApp({ id: "dup-test" })];
      mockDB(existing);

      saveApplication(makeApp({ id: "dup-test", company: "Updated" }));

      const written = JSON.parse(mockFs.writeFileSync.mock.calls[0][1] as string);
      expect(written).toHaveLength(1);
      expect(written[0].company).toBe("Updated");
    });
  });
});
