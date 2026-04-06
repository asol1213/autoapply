import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "src/data/gamification.json");

export interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  unlockedAt: string;
}

export interface GameState {
  xp: number;
  level: number;
  streak: number;
  lastActiveDate: string | null;
  longestStreak: number;
  totalActions: number;
  todayActions: number;
  todayDate: string | null;
  weeklyActions: { date: string; count: number }[];
  achievements: Achievement[];
  dailyQuestCompleted: boolean;
  dailyQuestDate: string | null;
}

// XP per action
const XP_TABLE: Record<string, number> = {
  add_lead: 10,
  apply: 25,
  send_email: 30,
  add_activity: 15,
  follow_up: 20,
  got_interview: 50,
  got_offer: 100,
  won: 200,
  daily_quest: 50,
};

// Level thresholds
const LEVELS = [
  { level: 1, xp: 0, title: "Newbie" },
  { level: 2, xp: 100, title: "Starter" },
  { level: 3, xp: 300, title: "Hustler" },
  { level: 4, xp: 600, title: "Grinder" },
  { level: 5, xp: 1000, title: "Machine" },
  { level: 6, xp: 1500, title: "Closer" },
  { level: 7, xp: 2500, title: "Beast" },
  { level: 8, xp: 4000, title: "Legend" },
  { level: 9, xp: 6000, title: "Untouchable" },
  { level: 10, xp: 10000, title: "CEO Mode" },
];

// All possible achievements
const ACHIEVEMENT_DEFS: { id: string; name: string; description: string; emoji: string; check: (s: GameState, extra?: Record<string, number>) => boolean }[] = [
  { id: "first_lead", name: "First Blood", description: "Ersten Lead hinzugefügt", emoji: "🎯", check: (_, e) => (e?.totalLeads ?? 0) >= 1 },
  { id: "ten_leads", name: "Pipeline Builder", description: "10 Leads in der Pipeline", emoji: "🔥", check: (_, e) => (e?.totalLeads ?? 0) >= 10 },
  { id: "twenty_five_leads", name: "Lead Machine", description: "25 Leads", emoji: "⚡", check: (_, e) => (e?.totalLeads ?? 0) >= 25 },
  { id: "fifty_leads", name: "Unstoppable", description: "50 Leads", emoji: "🚀", check: (_, e) => (e?.totalLeads ?? 0) >= 50 },
  { id: "first_apply", name: "In The Ring", description: "Erste Bewerbung abgeschickt", emoji: "📤", check: (_, e) => (e?.totalApplied ?? 0) >= 1 },
  { id: "ten_applied", name: "Volume Shooter", description: "10 Bewerbungen gesendet", emoji: "🎯", check: (_, e) => (e?.totalApplied ?? 0) >= 10 },
  { id: "first_interview", name: "Door Opener", description: "Erstes Interview/Gespräch", emoji: "🤝", check: (_, e) => (e?.totalInterviews ?? 0) >= 1 },
  { id: "five_interviews", name: "Hot Commodity", description: "5 Interviews", emoji: "🔥", check: (_, e) => (e?.totalInterviews ?? 0) >= 5 },
  { id: "first_offer", name: "Money Talks", description: "Erstes Angebot erhalten", emoji: "💰", check: (_, e) => (e?.totalOffers ?? 0) >= 1 },
  { id: "first_won", name: "Winner", description: "Ersten Deal/Job gewonnen", emoji: "🏆", check: (_, e) => (e?.totalWon ?? 0) >= 1 },
  { id: "streak_3", name: "Warming Up", description: "3 Tage Streak", emoji: "🔥", check: (s) => s.streak >= 3 },
  { id: "streak_7", name: "On Fire", description: "7 Tage Streak", emoji: "🔥🔥", check: (s) => s.streak >= 7 },
  { id: "streak_14", name: "Relentless", description: "14 Tage Streak", emoji: "🔥🔥🔥", check: (s) => s.streak >= 14 },
  { id: "streak_30", name: "Machine Mode", description: "30 Tage Streak", emoji: "🤖", check: (s) => s.streak >= 30 },
  { id: "level_5", name: "Halfway There", description: "Level 5 erreicht", emoji: "⭐", check: (s) => s.level >= 5 },
  { id: "level_10", name: "CEO Mode", description: "Level 10 erreicht", emoji: "👑", check: (s) => s.level >= 10 },
  { id: "combo_5", name: "Combo King", description: "5 Aktionen an einem Tag", emoji: "⚡", check: (s) => s.todayActions >= 5 },
  { id: "combo_10", name: "Hyperfocus", description: "10 Aktionen an einem Tag", emoji: "🧠", check: (s) => s.todayActions >= 10 },
  { id: "hundred_actions", name: "Centurion", description: "100 Aktionen insgesamt", emoji: "💯", check: (s) => s.totalActions >= 100 },
  { id: "all_pipelines", name: "Diversified", description: "Leads in allen 4 Pipelines", emoji: "🌐", check: (_, e) => (e?.pipelineCount ?? 0) >= 4 },
];

function readState(): GameState {
  try {
    if (!fs.existsSync(DB_PATH)) return getDefaultState();
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    if (!raw.trim()) return getDefaultState();
    return { ...getDefaultState(), ...JSON.parse(raw) };
  } catch {
    return getDefaultState();
  }
}

function writeState(state: GameState) {
  fs.writeFileSync(DB_PATH, JSON.stringify(state, null, 2));
}

function getDefaultState(): GameState {
  return { xp: 0, level: 1, streak: 0, lastActiveDate: null, longestStreak: 0, totalActions: 0, todayActions: 0, todayDate: null, weeklyActions: [], achievements: [], dailyQuestCompleted: false, dailyQuestDate: null };
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function calcLevel(xp: number): { level: number; title: string; xpForNext: number; xpInLevel: number; progress: number } {
  let current = LEVELS[0];
  let next = LEVELS[1];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xp) {
      current = LEVELS[i];
      next = LEVELS[i + 1] || { level: 11, xp: current.xp + 5000, title: "Beyond" };
      break;
    }
  }
  const xpInLevel = xp - current.xp;
  const xpForNext = next.xp - current.xp;
  return { level: current.level, title: current.title, xpForNext, xpInLevel, progress: Math.min(100, Math.round((xpInLevel / xpForNext) * 100)) };
}

export function getGameState(): GameState & { levelInfo: ReturnType<typeof calcLevel>; comboMultiplier: number; dailyQuest: { description: string; target: number; current: number } } {
  const state = readState();
  const today = getToday();

  // Update streak
  if (state.lastActiveDate) {
    const lastDate = new Date(state.lastActiveDate);
    const todayDate = new Date(today);
    const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / 86400000);
    if (diffDays > 1) {
      state.streak = 0; // Streak broken
    }
  }

  // Reset today counter if new day
  if (state.todayDate !== today) {
    state.todayActions = 0;
    state.todayDate = today;
    state.dailyQuestCompleted = false;
    state.dailyQuestDate = today;
  }

  const levelInfo = calcLevel(state.xp);
  state.level = levelInfo.level;

  // Combo multiplier: 1x for 0-2 actions, 2x for 3-5, 3x for 6+
  const comboMultiplier = state.todayActions >= 6 ? 3 : state.todayActions >= 3 ? 2 : 1;

  // Daily quest: based on day of week
  const dayOfWeek = new Date().getDay();
  const quests = [
    { description: "Füge 3 neue Leads hinzu", target: 3 },
    { description: "Schicke 2 Bewerbungen ab", target: 2 },
    { description: "Mache 3 Follow-ups", target: 3 },
    { description: "Füge 5 Aktivitäten hinzu", target: 5 },
    { description: "Schicke 2 Bewerbungen ab", target: 2 },
    { description: "Füge 4 neue Leads hinzu", target: 4 },
    { description: "Erreiche 5 Aktionen heute", target: 5 },
  ];
  const dailyQuest = {
    ...quests[dayOfWeek],
    current: Math.min(state.todayActions, quests[dayOfWeek].target),
  };

  writeState(state);
  return { ...state, levelInfo, comboMultiplier, dailyQuest };
}

export function recordAction(actionType: string, extraStats?: Record<string, number>): { xpGained: number; newAchievements: Achievement[]; levelUp: boolean; state: GameState } {
  const state = readState();
  const today = getToday();
  const oldLevel = calcLevel(state.xp).level;

  // Update streak
  if (state.todayDate !== today) {
    if (state.lastActiveDate) {
      const lastDate = new Date(state.lastActiveDate);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / 86400000);
      if (diffDays === 1) {
        state.streak += 1;
      } else if (diffDays > 1) {
        state.streak = 1;
      }
    } else {
      state.streak = 1;
    }
    state.todayActions = 0;
    state.todayDate = today;
    state.lastActiveDate = today;
  } else {
    state.lastActiveDate = today;
  }

  // Combo multiplier
  const combo = state.todayActions >= 6 ? 3 : state.todayActions >= 3 ? 2 : 1;
  const baseXP = XP_TABLE[actionType] || 10;
  const xpGained = baseXP * combo;

  state.xp += xpGained;
  state.totalActions += 1;
  state.todayActions += 1;

  if (state.streak > state.longestStreak) state.longestStreak = state.streak;

  // Weekly actions log
  const weekEntry = state.weeklyActions.find((w) => w.date === today);
  if (weekEntry) weekEntry.count += 1;
  else state.weeklyActions.push({ date: today, count: 1 });
  // Keep only last 14 days
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  state.weeklyActions = state.weeklyActions.filter((w) => new Date(w.date) >= twoWeeksAgo);

  // Check daily quest
  const dayOfWeek = new Date().getDay();
  const questTargets = [3, 2, 3, 5, 2, 4, 5];
  if (state.todayActions >= questTargets[dayOfWeek] && !state.dailyQuestCompleted) {
    state.dailyQuestCompleted = true;
    state.xp += XP_TABLE.daily_quest;
  }

  // Update level
  const newLevel = calcLevel(state.xp).level;
  state.level = newLevel;
  const levelUp = newLevel > oldLevel;

  // Check achievements
  const existingIds = new Set(state.achievements.map((a) => a.id));
  const newAchievements: Achievement[] = [];
  for (const def of ACHIEVEMENT_DEFS) {
    if (!existingIds.has(def.id) && def.check(state, extraStats)) {
      const achievement: Achievement = { id: def.id, name: def.name, description: def.description, emoji: def.emoji, unlockedAt: new Date().toISOString() };
      state.achievements.push(achievement);
      newAchievements.push(achievement);
      state.xp += 25; // Bonus XP for achievement
    }
  }

  writeState(state);
  return { xpGained, newAchievements, levelUp, state };
}

export function getLeaderboard(): { thisWeek: number; lastWeek: number; trend: "up" | "down" | "same" } {
  const state = readState();
  const today = new Date();
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() - today.getDay() + 1);
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(lastMonday.getDate() - 7);

  const thisWeek = state.weeklyActions
    .filter((w) => new Date(w.date) >= thisMonday)
    .reduce((sum, w) => sum + w.count, 0);

  const lastWeek = state.weeklyActions
    .filter((w) => new Date(w.date) >= lastMonday && new Date(w.date) < thisMonday)
    .reduce((sum, w) => sum + w.count, 0);

  return { thisWeek, lastWeek, trend: thisWeek > lastWeek ? "up" : thisWeek < lastWeek ? "down" : "same" };
}
