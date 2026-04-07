import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "fs";
import path from "path";

// Mock fs so we don't touch real files
vi.mock("fs");

const mockFs = vi.mocked(fs);

// Import after mocking
import {
  getApplications,
  getApplication,
  saveApplication,
  deleteApplication,
  bulkUpdateStage,
  PIPELINES,
  STAGES,
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

describe("store", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("getApplications", () => {
    it("returns empty array when file does not exist", () => {
      mockFs.existsSync.mockReturnValue(false);
      const result = getApplications();
      expect(result).toEqual([]);
    });

    it("returns empty array when file is empty", () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue("");
      const result = getApplications();
      expect(result).toEqual([]);
    });

    it("returns empty array on invalid JSON", () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue("{broken");
      const result = getApplications();
      expect(result).toEqual([]);
    });

    it("returns applications sorted by updatedAt descending", () => {
      const apps = [
        makeApp({ id: "old", updatedAt: "2026-01-01T00:00:00.000Z" }),
        makeApp({ id: "new", updatedAt: "2026-06-01T00:00:00.000Z" }),
      ];
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(apps));
      const result = getApplications();
      expect(result[0].id).toBe("new");
      expect(result[1].id).toBe("old");
    });
  });

  describe("getApplication", () => {
    it("returns undefined when app not found", () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify([]));
      expect(getApplication("nope")).toBeUndefined();
    });

    it("finds application by id", () => {
      const app = makeApp({ id: "find-me" });
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify([app]));
      const result = getApplication("find-me");
      expect(result?.id).toBe("find-me");
      expect(result?.company).toBe("Acme Corp");
    });
  });

  describe("saveApplication", () => {
    it("adds a new application", () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify([]));
      mockFs.writeFileSync.mockImplementation(() => {});

      const app = makeApp({ id: "new-app" });
      const result = saveApplication(app);

      expect(result.id).toBe("new-app");
      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(1);
      const written = JSON.parse(
        (mockFs.writeFileSync as ReturnType<typeof vi.fn>).mock.calls[0][1] as string
      );
      expect(written).toHaveLength(1);
      expect(written[0].id).toBe("new-app");
    });

    it("updates an existing application", () => {
      const existing = makeApp({ id: "existing", company: "Old Co" });
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify([existing]));
      mockFs.writeFileSync.mockImplementation(() => {});

      const updated = makeApp({ id: "existing", company: "New Co" });
      saveApplication(updated);

      const written = JSON.parse(
        (mockFs.writeFileSync as ReturnType<typeof vi.fn>).mock.calls[0][1] as string
      );
      expect(written).toHaveLength(1);
      expect(written[0].company).toBe("New Co");
    });

    it("sets updatedAt to current timestamp", () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify([]));
      mockFs.writeFileSync.mockImplementation(() => {});

      const app = makeApp({ updatedAt: "2020-01-01T00:00:00.000Z" });
      const result = saveApplication(app);

      // updatedAt should be recent, not the old value
      const updatedTime = new Date(result.updatedAt).getTime();
      const now = Date.now();
      expect(now - updatedTime).toBeLessThan(5000);
    });
  });

  describe("deleteApplication", () => {
    it("removes application by id", () => {
      const apps = [makeApp({ id: "keep" }), makeApp({ id: "delete-me" })];
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(apps));
      mockFs.writeFileSync.mockImplementation(() => {});

      deleteApplication("delete-me");

      const written = JSON.parse(
        (mockFs.writeFileSync as ReturnType<typeof vi.fn>).mock.calls[0][1] as string
      );
      expect(written).toHaveLength(1);
      expect(written[0].id).toBe("keep");
    });

    it("does nothing when id not found", () => {
      const apps = [makeApp({ id: "keep" })];
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(apps));
      mockFs.writeFileSync.mockImplementation(() => {});

      deleteApplication("nonexistent");

      const written = JSON.parse(
        (mockFs.writeFileSync as ReturnType<typeof vi.fn>).mock.calls[0][1] as string
      );
      expect(written).toHaveLength(1);
    });
  });

  describe("bulkUpdateStage", () => {
    it("updates stage for multiple applications", () => {
      const apps = [
        makeApp({ id: "a", stage: "lead" }),
        makeApp({ id: "b", stage: "lead" }),
        makeApp({ id: "c", stage: "lead" }),
      ];
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(apps));
      mockFs.writeFileSync.mockImplementation(() => {});

      bulkUpdateStage(["a", "c"], "applied");

      const written = JSON.parse(
        (mockFs.writeFileSync as ReturnType<typeof vi.fn>).mock.calls[0][1] as string
      );
      expect(written[0].stage).toBe("applied");
      expect(written[1].stage).toBe("lead"); // unchanged
      expect(written[2].stage).toBe("applied");
    });
  });

  describe("constants", () => {
    it("has correct pipelines", () => {
      expect(PIPELINES).toEqual(["dubai", "remote", "freelance", "kunden"]);
    });

    it("has correct stages", () => {
      expect(STAGES).toEqual(["lead", "applied", "interview", "offer", "won", "lost"]);
    });
  });
});
