import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";

vi.mock("fs");

const mockFs = vi.mocked(fs);

import {
  getGameState,
  recordAction,
  getLeaderboard,
  type GameState,
} from "../lib/gamification";

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

function mockStateOnDisk(state: GameState) {
  mockFs.existsSync.mockReturnValue(true);
  mockFs.readFileSync.mockReturnValue(JSON.stringify(state));
  mockFs.writeFileSync.mockImplementation(() => {});
}

describe("gamification", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-06T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getGameState", () => {
    it("returns default state when no file exists", () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.writeFileSync.mockImplementation(() => {});

      const state = getGameState();
      expect(state.xp).toBe(0);
      expect(state.level).toBe(1);
      expect(state.levelInfo.title).toBe("Newbie");
      expect(state.comboMultiplier).toBe(1);
    });

    it("resets streak if more than 1 day gap", () => {
      mockStateOnDisk(
        defaultState({
          streak: 5,
          lastActiveDate: "2026-04-04", // 2 days ago
          todayDate: "2026-04-04",
        })
      );

      const state = getGameState();
      expect(state.streak).toBe(0);
    });

    it("preserves streak if last active yesterday", () => {
      mockStateOnDisk(
        defaultState({
          streak: 5,
          lastActiveDate: "2026-04-05", // yesterday
          todayDate: "2026-04-05",
        })
      );

      const state = getGameState();
      expect(state.streak).toBe(5);
    });

    it("resets todayActions on new day", () => {
      mockStateOnDisk(
        defaultState({
          todayActions: 10,
          todayDate: "2026-04-05", // yesterday
        })
      );

      const state = getGameState();
      expect(state.todayActions).toBe(0);
    });

    it("calculates combo multiplier correctly", () => {
      // 0-2 actions: 1x
      mockStateOnDisk(defaultState({ todayActions: 2, todayDate: "2026-04-06" }));
      expect(getGameState().comboMultiplier).toBe(1);

      // 3-5 actions: 2x
      mockStateOnDisk(defaultState({ todayActions: 4, todayDate: "2026-04-06" }));
      expect(getGameState().comboMultiplier).toBe(2);

      // 6+ actions: 3x
      mockStateOnDisk(defaultState({ todayActions: 7, todayDate: "2026-04-06" }));
      expect(getGameState().comboMultiplier).toBe(3);
    });
  });

  describe("recordAction", () => {
    it("awards base XP for an action", () => {
      mockStateOnDisk(defaultState({ todayDate: "2026-04-06", lastActiveDate: "2026-04-06" }));

      const result = recordAction("add_lead");
      expect(result.xpGained).toBe(10); // base XP for add_lead, combo 1x
      expect(result.state.totalActions).toBe(1);
    });

    it("awards apply XP correctly", () => {
      mockStateOnDisk(defaultState({ todayDate: "2026-04-06", lastActiveDate: "2026-04-06" }));

      const result = recordAction("apply");
      expect(result.xpGained).toBe(25);
    });

    it("applies combo multiplier at 3+ actions", () => {
      mockStateOnDisk(
        defaultState({
          todayActions: 3,
          todayDate: "2026-04-06",
          lastActiveDate: "2026-04-06",
        })
      );

      const result = recordAction("add_lead");
      expect(result.xpGained).toBe(20); // 10 * 2x combo
    });

    it("applies 3x combo at 6+ actions", () => {
      mockStateOnDisk(
        defaultState({
          todayActions: 6,
          todayDate: "2026-04-06",
          lastActiveDate: "2026-04-06",
        })
      );

      const result = recordAction("add_lead");
      expect(result.xpGained).toBe(30); // 10 * 3x combo
    });

    it("starts streak on first action ever", () => {
      mockStateOnDisk(defaultState());

      const result = recordAction("add_lead");
      expect(result.state.streak).toBe(1);
    });

    it("increments streak when last active was yesterday", () => {
      mockStateOnDisk(
        defaultState({
          streak: 3,
          lastActiveDate: "2026-04-05",
          todayDate: "2026-04-05",
        })
      );

      const result = recordAction("add_lead");
      expect(result.state.streak).toBe(4);
    });

    it("resets streak when gap is more than 1 day", () => {
      mockStateOnDisk(
        defaultState({
          streak: 10,
          lastActiveDate: "2026-04-03",
          todayDate: "2026-04-03",
        })
      );

      const result = recordAction("add_lead");
      expect(result.state.streak).toBe(1);
    });

    it("detects level up", () => {
      // Level 2 requires 100 XP. Start at 95, add 10 -> 105
      mockStateOnDisk(
        defaultState({
          xp: 95,
          level: 1,
          todayDate: "2026-04-06",
          lastActiveDate: "2026-04-06",
        })
      );

      const result = recordAction("add_lead"); // +10 XP
      expect(result.levelUp).toBe(true);
      expect(result.state.level).toBe(2);
    });

    it("does not report level up when staying same level", () => {
      mockStateOnDisk(
        defaultState({
          xp: 0,
          todayDate: "2026-04-06",
          lastActiveDate: "2026-04-06",
        })
      );

      const result = recordAction("add_lead");
      expect(result.levelUp).toBe(false);
    });

    it("unlocks streak achievement at streak 3", () => {
      mockStateOnDisk(
        defaultState({
          streak: 2,
          lastActiveDate: "2026-04-05",
          todayDate: "2026-04-05",
        })
      );

      const result = recordAction("add_lead");
      expect(result.state.streak).toBe(3);
      const streakAch = result.newAchievements.find((a) => a.id === "streak_3");
      expect(streakAch).toBeDefined();
      expect(streakAch?.name).toBe("Warming Up");
    });

    it("unlocks combo_5 achievement at 5 today actions", () => {
      mockStateOnDisk(
        defaultState({
          todayActions: 4,
          todayDate: "2026-04-06",
          lastActiveDate: "2026-04-06",
        })
      );

      const result = recordAction("add_lead");
      expect(result.state.todayActions).toBe(5);
      const comboAch = result.newAchievements.find((a) => a.id === "combo_5");
      expect(comboAch).toBeDefined();
    });

    it("unlocks centurion achievement at 100 total actions", () => {
      mockStateOnDisk(
        defaultState({
          totalActions: 99,
          todayDate: "2026-04-06",
          lastActiveDate: "2026-04-06",
        })
      );

      const result = recordAction("add_lead");
      const centurion = result.newAchievements.find((a) => a.id === "hundred_actions");
      expect(centurion).toBeDefined();
    });

    it("does not re-unlock existing achievements", () => {
      mockStateOnDisk(
        defaultState({
          todayActions: 4,
          todayDate: "2026-04-06",
          lastActiveDate: "2026-04-06",
          achievements: [
            { id: "combo_5", name: "Combo King", description: "5 actions", emoji: "x", unlockedAt: "2026-01-01" },
          ],
        })
      );

      const result = recordAction("add_lead");
      const comboAch = result.newAchievements.find((a) => a.id === "combo_5");
      expect(comboAch).toBeUndefined();
    });

    it("defaults to 10 XP for unknown action types", () => {
      mockStateOnDisk(defaultState({ todayDate: "2026-04-06", lastActiveDate: "2026-04-06" }));

      const result = recordAction("unknown_action");
      expect(result.xpGained).toBe(10);
    });

    it("updates longestStreak when current streak exceeds it", () => {
      mockStateOnDisk(
        defaultState({
          streak: 4,
          longestStreak: 4,
          lastActiveDate: "2026-04-05",
          todayDate: "2026-04-05",
        })
      );

      const result = recordAction("add_lead");
      expect(result.state.longestStreak).toBe(5);
    });

    it("tracks weekly actions", () => {
      mockStateOnDisk(
        defaultState({
          todayDate: "2026-04-06",
          lastActiveDate: "2026-04-06",
          weeklyActions: [],
        })
      );

      const result = recordAction("add_lead");
      expect(result.state.weeklyActions).toHaveLength(1);
      expect(result.state.weeklyActions[0].date).toBe("2026-04-06");
      expect(result.state.weeklyActions[0].count).toBe(1);
    });

    it("awards won XP correctly (200)", () => {
      mockStateOnDisk(defaultState({ todayDate: "2026-04-06", lastActiveDate: "2026-04-06" }));

      const result = recordAction("won");
      expect(result.xpGained).toBe(200);
    });
  });

  describe("getLeaderboard", () => {
    it("returns zero counts when no weekly actions", () => {
      mockStateOnDisk(defaultState());

      const lb = getLeaderboard();
      expect(lb.thisWeek).toBe(0);
      expect(lb.lastWeek).toBe(0);
      expect(lb.trend).toBe("same");
    });

    it("calculates trend correctly", () => {
      // April 6, 2026 is a Monday; use Tuesday/Wednesday dates to avoid boundary issues
      mockStateOnDisk(
        defaultState({
          weeklyActions: [
            { date: "2026-04-07", count: 5 }, // this week (Tuesday)
            { date: "2026-03-31", count: 3 }, // last week (Tuesday)
          ],
        })
      );

      const lb = getLeaderboard();
      expect(lb.thisWeek).toBe(5);
      expect(lb.lastWeek).toBe(3);
      expect(lb.trend).toBe("up");
    });
  });
});
