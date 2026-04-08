import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import { NextRequest } from "next/server";

vi.mock("fs");
const mockFs = vi.mocked(fs);

import { GET, POST } from "../app/api/game/route";
import type { GameState } from "../lib/gamification";

function defaultState(overrides: Partial<GameState> = {}): GameState {
  return {
    xp: 0,
    level: 1,
    streak: 0,
    lastActiveDate: null,
    longestStreak: 0,
    totalActions: 0,
    todayActions: 0,
    todayDate: null,
    weeklyActions: [],
    achievements: [],
    dailyQuestCompleted: false,
    dailyQuestDate: null,
    ...overrides,
  };
}

function mockBothDBs(gameState: GameState, apps: unknown[] = []) {
  mockFs.existsSync.mockReturnValue(true);
  mockFs.readFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor) => {
    const p = String(filePath);
    if (p.includes("gamification")) return JSON.stringify(gameState);
    if (p.includes("applications")) return JSON.stringify(apps);
    return "[]";
  });
  mockFs.writeFileSync.mockImplementation(() => {});
}

function makeRequest(url: string, options?: RequestInit): NextRequest {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NextRequest(new URL(url, "http://localhost:3000"), options as any);
}

describe("API /api/game", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-06T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("GET", () => {
    it("returns full game state with levelInfo", async () => {
      mockBothDBs(defaultState());

      const res = await GET();
      const data = await res.json();
      expect(data.xp).toBe(0);
      expect(data.level).toBe(1);
      expect(data.levelInfo).toBeDefined();
      expect(data.levelInfo.title).toBe("Newbie");
    });

    it("returns comboMultiplier", async () => {
      mockBothDBs(defaultState({ todayActions: 4, todayDate: "2026-04-06" }));

      const res = await GET();
      const data = await res.json();
      expect(data.comboMultiplier).toBe(2);
    });

    it("returns dailyQuest", async () => {
      mockBothDBs(defaultState());

      const res = await GET();
      const data = await res.json();
      expect(data.dailyQuest).toBeDefined();
      expect(data.dailyQuest.target).toBeGreaterThan(0);
      expect(data.dailyQuest.description).toBeTruthy();
    });

    it("returns leaderboard", async () => {
      mockBothDBs(defaultState());

      const res = await GET();
      const data = await res.json();
      expect(data.leaderboard).toBeDefined();
      expect(data.leaderboard.thisWeek).toBeDefined();
      expect(data.leaderboard.lastWeek).toBeDefined();
      expect(data.leaderboard.trend).toBeDefined();
    });
  });

  describe("POST", () => {
    it("requires action", async () => {
      mockBothDBs(defaultState());

      const res = await POST(makeRequest("http://localhost:3000/api/game", {
        method: "POST",
        body: JSON.stringify({}),
      }));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("action required");
    });

    it("returns xpGained", async () => {
      mockBothDBs(defaultState({ todayDate: "2026-04-06", lastActiveDate: "2026-04-06" }));

      const res = await POST(makeRequest("http://localhost:3000/api/game", {
        method: "POST",
        body: JSON.stringify({ action: "add_lead" }),
      }));
      const data = await res.json();
      expect(data.xpGained).toBe(10);
    });

    it("tracks achievements", async () => {
      mockBothDBs(
        defaultState({
          todayActions: 4,
          todayDate: "2026-04-06",
          lastActiveDate: "2026-04-06",
        })
      );

      const res = await POST(makeRequest("http://localhost:3000/api/game", {
        method: "POST",
        body: JSON.stringify({ action: "add_lead" }),
      }));
      const data = await res.json();
      expect(data.newAchievements).toBeDefined();
      // combo_5 should unlock at 5 today actions
      const combo5 = data.newAchievements.find((a: { id: string }) => a.id === "combo_5");
      expect(combo5).toBeDefined();
    });

    it("updates streak on first action of new day", async () => {
      mockBothDBs(defaultState());

      const res = await POST(makeRequest("http://localhost:3000/api/game", {
        method: "POST",
        body: JSON.stringify({ action: "add_lead" }),
      }));
      const data = await res.json();
      expect(data.state.streak).toBe(1);
    });

    it("computes extraStats from applications", async () => {
      const apps = [
        { id: "1", pipeline: "dubai", stage: "lead", appliedAt: null, company: "A", role: "", url: "", language: "en", jobDescription: "", coverLetter: "", cvData: "", emailSubject: "", emailBody: "", contact: { name: "", role: "", email: "", linkedin: "", phone: "" }, notes: "", nextAction: "", nextActionDate: null, skills: [], salary: "", tags: [], activities: [], createdAt: "2026-01-01", updatedAt: "2026-01-01", followUpAt: null, followUpDone: false },
      ];
      mockBothDBs(defaultState({ todayDate: "2026-04-06", lastActiveDate: "2026-04-06" }), apps);

      const res = await POST(makeRequest("http://localhost:3000/api/game", {
        method: "POST",
        body: JSON.stringify({ action: "add_lead" }),
      }));
      const data = await res.json();
      // With 1 lead in apps, first_lead achievement should trigger
      const firstLead = data.newAchievements.find((a: { id: string }) => a.id === "first_lead");
      expect(firstLead).toBeDefined();
    });
  });
});
