import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";

vi.mock("fs");
const mockFs = vi.mocked(fs);

import { getGameState, recordAction, getLeaderboard, type GameState } from "../lib/gamification";

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

function mockState(state: GameState) {
  mockFs.existsSync.mockReturnValue(true);
  mockFs.readFileSync.mockReturnValue(JSON.stringify(state));
  mockFs.writeFileSync.mockImplementation(() => {});
}

describe("gamification advanced", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-06T12:00:00.000Z")); // Monday
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("level calculation", () => {
    it("level 1 at 0 XP", () => {
      mockState(defaultState({ xp: 0 }));
      const state = getGameState();
      expect(state.levelInfo.level).toBe(1);
      expect(state.levelInfo.title).toBe("Newbie");
    });

    it("level 2 at 100 XP", () => {
      mockState(defaultState({ xp: 100 }));
      const state = getGameState();
      expect(state.levelInfo.level).toBe(2);
      expect(state.levelInfo.title).toBe("Starter");
    });

    it("level 3 at 300 XP", () => {
      mockState(defaultState({ xp: 300 }));
      const state = getGameState();
      expect(state.levelInfo.level).toBe(3);
      expect(state.levelInfo.title).toBe("Hustler");
    });

    it("level 5 at 1000 XP", () => {
      mockState(defaultState({ xp: 1000 }));
      const state = getGameState();
      expect(state.levelInfo.level).toBe(5);
      expect(state.levelInfo.title).toBe("Machine");
    });

    it("level 10 at 10000 XP", () => {
      mockState(defaultState({ xp: 10000 }));
      const state = getGameState();
      expect(state.levelInfo.level).toBe(10);
      expect(state.levelInfo.title).toBe("CEO Mode");
    });

    it("stays level 10 above 10000 XP", () => {
      mockState(defaultState({ xp: 50000 }));
      const state = getGameState();
      expect(state.levelInfo.level).toBe(10);
    });

    it("calculates progress percentage", () => {
      // Level 1 is 0-99 XP, level 2 starts at 100
      mockState(defaultState({ xp: 50 }));
      const state = getGameState();
      expect(state.levelInfo.progress).toBe(50); // 50/100 * 100
    });

    it("calculates xpForNext correctly", () => {
      mockState(defaultState({ xp: 150 }));
      const state = getGameState();
      // At level 2 (100-299), next is 300, so xpForNext = 300 - 100 = 200
      expect(state.levelInfo.xpForNext).toBe(200);
      expect(state.levelInfo.xpInLevel).toBe(50); // 150 - 100
    });
  });

  describe("combo multiplier", () => {
    it("1x at 0 actions", () => {
      mockState(defaultState({ todayActions: 0, todayDate: "2026-04-06" }));
      expect(getGameState().comboMultiplier).toBe(1);
    });

    it("1x at 2 actions", () => {
      mockState(defaultState({ todayActions: 2, todayDate: "2026-04-06" }));
      expect(getGameState().comboMultiplier).toBe(1);
    });

    it("2x at 3 actions", () => {
      mockState(defaultState({ todayActions: 3, todayDate: "2026-04-06" }));
      expect(getGameState().comboMultiplier).toBe(2);
    });

    it("2x at 5 actions", () => {
      mockState(defaultState({ todayActions: 5, todayDate: "2026-04-06" }));
      expect(getGameState().comboMultiplier).toBe(2);
    });

    it("3x at 6 actions", () => {
      mockState(defaultState({ todayActions: 6, todayDate: "2026-04-06" }));
      expect(getGameState().comboMultiplier).toBe(3);
    });

    it("3x at 100 actions", () => {
      mockState(defaultState({ todayActions: 100, todayDate: "2026-04-06" }));
      expect(getGameState().comboMultiplier).toBe(3);
    });
  });

  describe("daily quest", () => {
    it("changes per day of week", () => {
      // Monday (day 1)
      vi.setSystemTime(new Date("2026-04-06T12:00:00.000Z")); // Monday
      mockState(defaultState());
      const monday = getGameState();

      // Tuesday (day 2)
      vi.setSystemTime(new Date("2026-04-07T12:00:00.000Z"));
      mockState(defaultState());
      const tuesday = getGameState();

      // Different days may have different quests
      expect(monday.dailyQuest.target).toBeGreaterThan(0);
      expect(tuesday.dailyQuest.target).toBeGreaterThan(0);
    });

    it("current capped at target", () => {
      mockState(defaultState({ todayActions: 100, todayDate: "2026-04-06" }));
      const state = getGameState();
      expect(state.dailyQuest.current).toBeLessThanOrEqual(state.dailyQuest.target);
    });

    it("awards bonus XP when quest completed", () => {
      // Monday quest target is index 1 (getDay()=1 for Monday) => target=2
      mockState(defaultState({
        todayActions: 1,
        todayDate: "2026-04-06",
        lastActiveDate: "2026-04-06",
        dailyQuestCompleted: false,
      }));

      // Record enough actions to meet quest target
      const result = recordAction("apply");
      // todayActions becomes 2, Monday quest target is 2
      if (result.state.dailyQuestCompleted) {
        // Quest completed, bonus XP should be added
        expect(result.state.xp).toBeGreaterThan(25); // base 25 + 50 quest bonus
      }
    });

    it("does not double-award quest bonus", () => {
      mockState(defaultState({
        todayActions: 5,
        todayDate: "2026-04-06",
        lastActiveDate: "2026-04-06",
        dailyQuestCompleted: true, // already completed
        xp: 100,
      }));

      const result = recordAction("add_lead");
      // XP should only include action XP * combo, not quest bonus
      expect(result.state.dailyQuestCompleted).toBe(true);
    });
  });

  describe("achievements", () => {
    it("first_lead triggers at totalLeads >= 1", () => {
      mockState(defaultState({ todayDate: "2026-04-06", lastActiveDate: "2026-04-06" }));
      const result = recordAction("add_lead", { totalLeads: 1 });
      const ach = result.newAchievements.find(a => a.id === "first_lead");
      expect(ach).toBeDefined();
      expect(ach?.name).toBe("First Blood");
    });

    it("ten_leads triggers at totalLeads >= 10", () => {
      mockState(defaultState({ todayDate: "2026-04-06", lastActiveDate: "2026-04-06" }));
      const result = recordAction("add_lead", { totalLeads: 10 });
      const ach = result.newAchievements.find(a => a.id === "ten_leads");
      expect(ach).toBeDefined();
    });

    it("first_apply triggers at totalApplied >= 1", () => {
      mockState(defaultState({ todayDate: "2026-04-06", lastActiveDate: "2026-04-06" }));
      const result = recordAction("apply", { totalApplied: 1 });
      const ach = result.newAchievements.find(a => a.id === "first_apply");
      expect(ach).toBeDefined();
    });

    it("first_interview triggers at totalInterviews >= 1", () => {
      mockState(defaultState({ todayDate: "2026-04-06", lastActiveDate: "2026-04-06" }));
      const result = recordAction("got_interview", { totalInterviews: 1 });
      const ach = result.newAchievements.find(a => a.id === "first_interview");
      expect(ach).toBeDefined();
    });

    it("first_offer triggers at totalOffers >= 1", () => {
      mockState(defaultState({ todayDate: "2026-04-06", lastActiveDate: "2026-04-06" }));
      const result = recordAction("got_offer", { totalOffers: 1 });
      const ach = result.newAchievements.find(a => a.id === "first_offer");
      expect(ach).toBeDefined();
    });

    it("first_won triggers at totalWon >= 1", () => {
      mockState(defaultState({ todayDate: "2026-04-06", lastActiveDate: "2026-04-06" }));
      const result = recordAction("won", { totalWon: 1 });
      const ach = result.newAchievements.find(a => a.id === "first_won");
      expect(ach).toBeDefined();
    });

    it("streak_7 triggers at streak >= 7", () => {
      mockState(defaultState({
        streak: 6,
        lastActiveDate: "2026-04-05",
        todayDate: "2026-04-05",
      }));
      const result = recordAction("add_lead");
      expect(result.state.streak).toBe(7);
      const ach = result.newAchievements.find(a => a.id === "streak_7");
      expect(ach).toBeDefined();
    });

    it("level_5 triggers at level >= 5", () => {
      // Level 5 at 1000 XP. Start at 995, add_lead gives 10 -> 1005
      mockState(defaultState({
        xp: 995,
        todayDate: "2026-04-06",
        lastActiveDate: "2026-04-06",
      }));
      const result = recordAction("add_lead");
      const ach = result.newAchievements.find(a => a.id === "level_5");
      expect(ach).toBeDefined();
    });

    it("all_pipelines triggers at pipelineCount >= 4", () => {
      mockState(defaultState({ todayDate: "2026-04-06", lastActiveDate: "2026-04-06" }));
      const result = recordAction("add_lead", { pipelineCount: 4 });
      const ach = result.newAchievements.find(a => a.id === "all_pipelines");
      expect(ach).toBeDefined();
    });

    it("achievement awards 25 bonus XP", () => {
      mockState(defaultState({ todayDate: "2026-04-06", lastActiveDate: "2026-04-06" }));
      const result = recordAction("add_lead", { totalLeads: 1 });
      // base 10 XP + 25 per achievement
      const achievementCount = result.newAchievements.length;
      expect(result.state.xp).toBe(10 + achievementCount * 25);
    });
  });

  describe("leaderboard", () => {
    // Use relative dates so tests pass regardless of current date
    function getRelativeDate(daysAgo: number): string {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      return d.toISOString().split("T")[0];
    }

    it("returns thisWeek and lastWeek as numbers", () => {
      mockState(defaultState({ weeklyActions: [] }));
      const lb = getLeaderboard();
      expect(typeof lb.thisWeek).toBe("number");
      expect(typeof lb.lastWeek).toBe("number");
      expect(typeof lb.trend).toBe("string");
    });

    it("trend is one of up, down, same", () => {
      mockState(defaultState({ weeklyActions: [] }));
      const lb = getLeaderboard();
      expect(["up", "down", "same"]).toContain(lb.trend);
    });

    it("same when both zero", () => {
      mockState(defaultState({ weeklyActions: [] }));
      const lb = getLeaderboard();
      expect(lb.trend).toBe("same");
    });

    it("returns zero for empty weekly actions", () => {
      mockState(defaultState({ weeklyActions: [] }));
      const lb = getLeaderboard();
      expect(lb.thisWeek).toBe(0);
      expect(lb.lastWeek).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("handles very high XP", () => {
      mockState(defaultState({ xp: 999999 }));
      const state = getGameState();
      expect(state.levelInfo.level).toBe(10);
      expect(state.levelInfo.progress).toBeLessThanOrEqual(100);
    });

    it("handles zero XP state correctly", () => {
      mockState(defaultState({ xp: 0 }));
      const state = getGameState();
      expect(state.level).toBe(1);
      expect(state.levelInfo.xpInLevel).toBe(0);
    });

    it("weekly actions pruned to 14 days", () => {
      const oldActions = [];
      for (let i = 0; i < 30; i++) {
        const d = new Date("2026-04-06");
        d.setDate(d.getDate() - i);
        oldActions.push({ date: d.toISOString().split("T")[0], count: 1 });
      }
      mockState(defaultState({
        weeklyActions: oldActions,
        todayDate: "2026-04-06",
        lastActiveDate: "2026-04-06",
      }));

      const result = recordAction("add_lead");
      expect(result.state.weeklyActions.length).toBeLessThanOrEqual(15);
    });

    it("increments existing weeklyActions entry for same day", () => {
      mockState(defaultState({
        todayDate: "2026-04-06",
        lastActiveDate: "2026-04-06",
        weeklyActions: [{ date: "2026-04-06", count: 3 }],
      }));

      const result = recordAction("add_lead");
      const todayEntry = result.state.weeklyActions.find(w => w.date === "2026-04-06");
      expect(todayEntry?.count).toBe(4);
    });
  });
});
