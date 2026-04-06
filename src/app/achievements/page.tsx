"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Achievement { id: string; name: string; emoji: string; description: string; unlockedAt: string; }
interface GameData {
  xp: number; level: number; streak: number; longestStreak: number; totalActions: number;
  achievements: Achievement[];
  levelInfo: { level: number; title: string; xpForNext: number; xpInLevel: number; progress: number };
  leaderboard: { thisWeek: number; lastWeek: number; trend: string };
  weeklyActions: { date: string; count: number }[];
}

const ALL_ACHIEVEMENTS = [
  { id: "first_lead", name: "First Blood", description: "Ersten Lead hinzugefügt", emoji: "🎯" },
  { id: "ten_leads", name: "Pipeline Builder", description: "10 Leads", emoji: "🔥" },
  { id: "twenty_five_leads", name: "Lead Machine", description: "25 Leads", emoji: "⚡" },
  { id: "fifty_leads", name: "Unstoppable", description: "50 Leads", emoji: "🚀" },
  { id: "first_apply", name: "In The Ring", description: "Erste Bewerbung", emoji: "📤" },
  { id: "ten_applied", name: "Volume Shooter", description: "10 Bewerbungen", emoji: "🎯" },
  { id: "first_interview", name: "Door Opener", description: "Erstes Interview", emoji: "🤝" },
  { id: "five_interviews", name: "Hot Commodity", description: "5 Interviews", emoji: "🔥" },
  { id: "first_offer", name: "Money Talks", description: "Erstes Angebot", emoji: "💰" },
  { id: "first_won", name: "Winner", description: "Ersten Deal gewonnen", emoji: "🏆" },
  { id: "streak_3", name: "Warming Up", description: "3 Tage Streak", emoji: "🔥" },
  { id: "streak_7", name: "On Fire", description: "7 Tage Streak", emoji: "🔥🔥" },
  { id: "streak_14", name: "Relentless", description: "14 Tage Streak", emoji: "🔥🔥🔥" },
  { id: "streak_30", name: "Machine Mode", description: "30 Tage Streak", emoji: "🤖" },
  { id: "level_5", name: "Halfway There", description: "Level 5", emoji: "⭐" },
  { id: "level_10", name: "CEO Mode", description: "Level 10", emoji: "👑" },
  { id: "combo_5", name: "Combo King", description: "5 Aktionen/Tag", emoji: "⚡" },
  { id: "combo_10", name: "Hyperfocus", description: "10 Aktionen/Tag", emoji: "🧠" },
  { id: "hundred_actions", name: "Centurion", description: "100 Aktionen", emoji: "💯" },
  { id: "all_pipelines", name: "Diversified", description: "Alle 4 Pipelines", emoji: "🌐" },
];

export default function AchievementsPage() {
  const [game, setGame] = useState<GameData | null>(null);

  useEffect(() => { fetch("/api/game").then((r) => r.json()).then(setGame); }, []);

  if (!game) return <div className="min-h-screen p-6 text-center text-[var(--muted)]">Laden...</div>;

  const unlockedIds = new Set(game.achievements.map((a) => a.id));

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <Link href="/" className="text-[var(--muted)] hover:text-white transition-colors text-sm">&larr; Dashboard</Link>

      {/* Player Card */}
      <div className="bg-gradient-to-r from-[#1a1a2e] to-[#16213e] border border-[var(--border)] rounded-xl p-6 mt-4 mb-6 text-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-bold text-2xl text-black mx-auto mb-3">{game.levelInfo.level}</div>
        <h1 className="text-2xl font-bold">{game.levelInfo.title}</h1>
        <p className="text-[var(--muted)] text-sm mb-3">{game.xp} XP gesamt</p>

        {/* XP Bar */}
        <div className="w-full max-w-xs mx-auto h-3 bg-white/10 rounded-full overflow-hidden mb-4">
          <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-700" style={{ width: `${game.levelInfo.progress}%` }} />
        </div>
        <p className="text-xs text-[var(--muted)]">{game.levelInfo.xpInLevel} / {game.levelInfo.xpForNext} XP zum nächsten Level</p>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div>
            <p className="text-2xl font-bold">{game.streak > 0 ? "🔥" : ""} {game.streak}</p>
            <p className="text-xs text-[var(--muted)]">Streak</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{game.longestStreak}</p>
            <p className="text-xs text-[var(--muted)]">Rekord</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{game.totalActions}</p>
            <p className="text-xs text-[var(--muted)]">Aktionen</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{game.achievements.length}/{ALL_ACHIEVEMENTS.length}</p>
            <p className="text-xs text-[var(--muted)]">Badges</p>
          </div>
        </div>
      </div>

      {/* Weekly Activity */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 mb-6">
        <h2 className="font-medium text-sm mb-3">Aktivitäten letzte 14 Tage</h2>
        <div className="flex gap-1 items-end h-16">
          {Array.from({ length: 14 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - 13 + i);
            const dateStr = date.toISOString().split("T")[0];
            const entry = game.weeklyActions?.find((w) => w.date === dateStr);
            const count = entry?.count || 0;
            const maxCount = Math.max(...(game.weeklyActions?.map((w) => w.count) || [1]), 1);
            const height = count > 0 ? Math.max(8, (count / maxCount) * 60) : 4;
            const isToday = i === 13;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div className={`w-full rounded-sm transition-all ${count > 0 ? isToday ? "bg-amber-500" : "bg-[var(--accent)]" : "bg-white/5"}`} style={{ height }} />
                <span className="text-[8px] text-[var(--muted)]">{date.getDate()}</span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-[var(--muted)]">
          <span>Diese Woche: {game.leaderboard.thisWeek} Aktionen</span>
          <span>Letzte Woche: {game.leaderboard.lastWeek} Aktionen</span>
        </div>
      </div>

      {/* Achievements */}
      <h2 className="font-bold text-lg mb-3">Achievements</h2>
      <div className="grid grid-cols-2 gap-2">
        {ALL_ACHIEVEMENTS.map((a) => {
          const unlocked = unlockedIds.has(a.id);
          const unlockedData = game.achievements.find((u) => u.id === a.id);
          return (
            <div key={a.id} className={`p-3 rounded-xl border transition-all ${unlocked ? "bg-amber-500/5 border-amber-500/30" : "bg-[var(--card)] border-[var(--border)] opacity-40"}`}>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{a.emoji}</span>
                <div>
                  <p className={`font-medium text-sm ${unlocked ? "text-amber-400" : ""}`}>{a.name}</p>
                  <p className="text-xs text-[var(--muted)]">{a.description}</p>
                  {unlockedData && <p className="text-[9px] text-[var(--muted)]">{new Date(unlockedData.unlockedAt).toLocaleDateString("de-DE")}</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
