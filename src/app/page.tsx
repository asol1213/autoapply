"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useTheme } from "./theme-provider";

type Pipeline = "all" | "dubai" | "remote" | "freelance" | "kunden";
type Stage = "lead" | "applied" | "interview" | "offer" | "won" | "lost";

interface Contact { name: string; role: string; email: string; linkedin: string; phone: string; }
interface Activity { date: string; type: string; text: string; }
interface GameData {
  xp: number; level: number; streak: number; longestStreak: number; totalActions: number; todayActions: number;
  achievements: { id: string; name: string; emoji: string; description: string; unlockedAt: string }[];
  levelInfo: { level: number; title: string; xpForNext: number; xpInLevel: number; progress: number };
  comboMultiplier: number;
  dailyQuest: { description: string; target: number; current: number };
  dailyQuestCompleted: boolean;
  leaderboard: { thisWeek: number; lastWeek: number; trend: "up" | "down" | "same" };
}

interface Application {
  id: string;
  pipeline: string;
  stage: Stage;
  company: string;
  role: string;
  salary: string;
  tags: string[];
  skills: string[];
  contact: Contact;
  nextAction: string;
  nextActionDate: string | null;
  activities: Activity[];
  createdAt: string;
  updatedAt: string;
  appliedAt: string | null;
  followUpAt: string | null;
  followUpDone: boolean;
}

const PIPELINES: { key: Pipeline; label: string; emoji: string }[] = [
  { key: "all", label: "Alle", emoji: "📊" },
  { key: "dubai", label: "Dubai", emoji: "🏙️" },
  { key: "remote", label: "Remote", emoji: "🌍" },
  { key: "freelance", label: "Freelance", emoji: "💼" },
  { key: "kunden", label: "Kunden", emoji: "🤝" },
];

const ACTIVE_STAGES: { key: Stage; label: string; color: string }[] = [
  { key: "lead", label: "Lead", color: "#71717a" },
  { key: "applied", label: "Beworben", color: "#3b82f6" },
  { key: "interview", label: "Gespräch", color: "#a855f7" },
  { key: "offer", label: "Angebot", color: "#f59e0b" },
];

function daysAgo(date: string) { return Math.floor((Date.now() - new Date(date).getTime()) / 86400000); }
function isFollowUpDue(app: Application) { return app.followUpAt && !app.followUpDone && new Date(app.followUpAt) <= new Date() && !["won", "lost"].includes(app.stage); }
function daysSinceActivity(app: Application) { return daysAgo(app.updatedAt || app.createdAt); }

function parseSalary(s: string): number {
  const num = s.replace(/[^0-9.]/g, "");
  return parseFloat(num) || 0;
}

export default function Dashboard() {
  const { theme, toggle: toggleTheme } = useTheme();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [pipeline, setPipeline] = useState<Pipeline>("all");
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [game, setGame] = useState<GameData | null>(null);
  const [xpPopup, setXpPopup] = useState<{ xp: number; achievements: string[] } | null>(null);
  const [quickAdd, setQuickAdd] = useState(false);
  const [qaCompany, setQaCompany] = useState("");
  const [qaRole, setQaRole] = useState("");
  const [qaPipeline, setQaPipeline] = useState<Pipeline>("remote");
  const [qaSaving, setQaSaving] = useState(false);

  const load = useCallback(() => {
    fetch("/api/applications").then((r) => r.json()).then(setApps).finally(() => setLoading(false));
    fetch("/api/game").then((r) => r.json()).then(setGame);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Keyboard shortcut: N = Quick Add
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setQuickAdd(true);
        setQaPipeline(pipeline === "all" ? "remote" : pipeline as Pipeline);
      }
      if (e.key === "Escape") setQuickAdd(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [pipeline]);

  // Filter
  let filtered = pipeline === "all" ? apps : apps.filter((a) => a.pipeline === pipeline);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((a) =>
      a.company.toLowerCase().includes(q) || a.role.toLowerCase().includes(q) ||
      a.contact.name.toLowerCase().includes(q) || a.tags.some((t) => t.toLowerCase().includes(q)) ||
      a.skills.some((s) => s.toLowerCase().includes(q))
    );
  }
  if (tagFilter) filtered = filtered.filter((a) => a.tags.includes(tagFilter));

  // All tags for filter dropdown
  const allTags = [...new Set(apps.flatMap((a) => a.tags))].sort();

  // Stats
  const active = filtered.filter((a) => !["won", "lost"].includes(a.stage));
  const stats = {
    total: filtered.length,
    active: active.length,
    interviews: filtered.filter((a) => a.stage === "interview").length,
    offers: filtered.filter((a) => a.stage === "offer").length,
    won: filtered.filter((a) => a.stage === "won").length,
    lost: filtered.filter((a) => a.stage === "lost").length,
    followUps: filtered.filter(isFollowUpDue).length,
    thisWeek: filtered.filter((a) => daysAgo(a.createdAt) <= 7).length,
    conversionRate: filtered.filter((a) => a.stage === "applied").length > 0
      ? Math.round((filtered.filter((a) => ["interview", "offer", "won"].includes(a.stage)).length / filtered.filter((a) => a.stage === "applied" || a.appliedAt).length) * 100)
      : 0,
    pipelineValue: active.reduce((sum, a) => sum + parseSalary(a.salary), 0),
  };

  const closedApps = filtered.filter((a) => ["won", "lost"].includes(a.stage));

  async function triggerXP(action: string) {
    const res = await fetch("/api/game", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    const result = await res.json();
    if (result.xpGained) {
      setXpPopup({ xp: result.xpGained, achievements: result.newAchievements?.map((a: { emoji: string; name: string }) => `${a.emoji} ${a.name}`) || [] });
      setTimeout(() => setXpPopup(null), 3000);
      fetch("/api/game").then((r) => r.json()).then(setGame);
    }
  }

  async function moveStage(id: string, newStage: Stage) {
    await fetch("/api/applications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, stage: newStage }) });
    load();
  }

  async function quickCreate() {
    if (!qaCompany.trim()) return;
    setQaSaving(true);
    await fetch("/api/applications", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipeline: qaPipeline === "all" ? "remote" : qaPipeline, company: qaCompany.trim(), role: qaRole.trim() }),
    });
    await fetch("/api/game", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add_lead" }) });
    setQaCompany(""); setQaRole(""); setQaSaving(false); setQuickAdd(false);
    load();
    // Show XP
    setXpPopup({ xp: 10, achievements: [] }); setTimeout(() => setXpPopup(null), 2000);
  }

  async function handleDelete(id: string) {
    if (!confirm("Löschen?")) return;
    await fetch("/api/applications", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setApps(apps.filter((a) => a.id !== id));
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AutoApply</h1>
            <p className="text-[var(--muted)] text-sm">Job & Client Pipeline</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="px-3 py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)] rounded-lg transition-colors" title="Theme wechseln">
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <Link href="/setup" className="px-3 py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)] rounded-lg transition-colors">Setup</Link>
            <Link href="/templates" className="px-3 py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)] rounded-lg transition-colors">Templates</Link>
            <button onClick={() => { setQuickAdd(!quickAdd); setQaPipeline(pipeline === "all" ? "remote" : pipeline as Pipeline); }} className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg font-medium transition-colors text-sm">+ Quick Add (N)</button>
            <Link href="/new" className="px-3 py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)] rounded-lg transition-colors">Detailliert</Link>
          </div>
        </div>

        {/* Quick Add Inline */}
        {quickAdd && (
          <div className="bg-[var(--accent)]/5 border border-[var(--accent)]/30 rounded-xl p-3 mb-4">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-[10px] text-[var(--muted)] mb-1">Firma *</label>
                <input type="text" value={qaCompany} onChange={(e) => setQaCompany(e.target.value)} autoFocus placeholder="z.B. Stripe"
                  onKeyDown={(e) => { if (e.key === "Enter" && qaCompany.trim()) quickCreate(); if (e.key === "Escape") setQuickAdd(false); }}
                  className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg text-sm text-white placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] text-[var(--muted)] mb-1">Rolle</label>
                <input type="text" value={qaRole} onChange={(e) => setQaRole(e.target.value)} placeholder="z.B. Data Engineer"
                  onKeyDown={(e) => { if (e.key === "Enter" && qaCompany.trim()) quickCreate(); if (e.key === "Escape") setQuickAdd(false); }}
                  className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg text-sm text-white placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
              </div>
              <div>
                <label className="block text-[10px] text-[var(--muted)] mb-1">Pipeline</label>
                <select value={qaPipeline} onChange={(e) => setQaPipeline(e.target.value as Pipeline)}
                  className="px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg text-sm text-white">
                  <option value="dubai">🏙️ Dubai</option>
                  <option value="remote">🌍 Remote</option>
                  <option value="freelance">💼 Freelance</option>
                  <option value="kunden">🤝 Kunden</option>
                </select>
              </div>
              <button onClick={quickCreate} disabled={qaSaving || !qaCompany.trim()}
                className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap">
                {qaSaving ? "..." : "Hinzufügen"}
              </button>
              <button onClick={() => setQuickAdd(false)} className="px-2 py-2 text-[var(--muted)] hover:text-[var(--foreground)] text-sm">✕</button>
            </div>
            <p className="text-[9px] text-[var(--muted)] mt-1.5">Enter = Speichern | Escape = Schließen | Rest kannst du später im Detail eintragen</p>
          </div>
        )}

        {/* XP Popup */}
        {xpPopup && (
          <div className="fixed top-4 right-4 z-50 animate-bounce">
            <div className="bg-amber-500 text-black px-4 py-2 rounded-xl font-bold text-lg shadow-lg shadow-amber-500/30">
              +{xpPopup.xp} XP!
              {xpPopup.achievements.map((a, i) => <span key={i} className="block text-sm font-normal">{a}</span>)}
            </div>
          </div>
        )}

        {/* Gamification Bar */}
        {game && (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 mb-4">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Level + XP */}
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-bold text-sm text-black">{game.levelInfo.level}</div>
                <div>
                  <p className="text-xs font-bold text-amber-400">{game.levelInfo.title}</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500" style={{ width: `${game.levelInfo.progress}%` }} />
                    </div>
                    <span className="text-[10px] text-[var(--muted)]">{game.xp} XP</span>
                  </div>
                </div>
              </div>

              <div className="w-px h-8 bg-[var(--border)]" />

              {/* Streak */}
              <div className="text-center">
                <p className="text-lg font-bold">{game.streak > 0 ? "🔥" : "💤"} {game.streak}</p>
                <p className="text-[9px] text-[var(--muted)]">Streak</p>
              </div>

              <div className="w-px h-8 bg-[var(--border)]" />

              {/* Combo */}
              <div className="text-center">
                <p className={`text-lg font-bold ${game.comboMultiplier >= 3 ? "text-red-400" : game.comboMultiplier >= 2 ? "text-amber-400" : "text-[var(--muted)]"}`}>{game.comboMultiplier}x</p>
                <p className="text-[9px] text-[var(--muted)]">Combo</p>
              </div>

              <div className="w-px h-8 bg-[var(--border)]" />

              {/* Daily Quest */}
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] text-cyan-400 font-medium">Daily Quest: {game.dailyQuest.description}</p>
                  {game.dailyQuestCompleted && <span className="text-[10px] text-green-400">✅ +50 XP</span>}
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${game.dailyQuestCompleted ? "bg-green-500" : "bg-cyan-500"}`} style={{ width: `${Math.min(100, (game.dailyQuest.current / game.dailyQuest.target) * 100)}%` }} />
                </div>
                <p className="text-[9px] text-[var(--muted)] mt-0.5">{game.dailyQuest.current}/{game.dailyQuest.target}</p>
              </div>

              <div className="w-px h-8 bg-[var(--border)]" />

              {/* Weekly Battle */}
              <div className="text-center">
                <p className="text-[9px] text-[var(--muted)]">vs. letzte Woche</p>
                <p className={`text-sm font-bold ${game.leaderboard.trend === "up" ? "text-green-400" : game.leaderboard.trend === "down" ? "text-red-400" : "text-[var(--muted)]"}`}>
                  {game.leaderboard.trend === "up" ? "📈" : game.leaderboard.trend === "down" ? "📉" : "➡️"} {game.leaderboard.thisWeek} vs {game.leaderboard.lastWeek}
                </p>
              </div>

              <div className="w-px h-8 bg-[var(--border)]" />

              {/* Achievements count */}
              <Link href="/achievements" className="text-center hover:opacity-80 transition-opacity">
                <p className="text-lg font-bold">🏆 {game.achievements.length}</p>
                <p className="text-[9px] text-[var(--muted)]">Badges</p>
              </Link>
            </div>
          </div>
        )}

        {/* Pipeline Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {PIPELINES.map((p) => {
            const count = p.key === "all" ? apps.length : apps.filter((a) => a.pipeline === p.key).length;
            return (
              <button key={p.key} onClick={() => setPipeline(p.key)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  pipeline === p.key ? "bg-[var(--accent)] text-white" : "bg-[var(--card)] text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)]"
                }`}>
                <span>{p.emoji}</span>{p.label}
                <span className={`px-1.5 py-0.5 rounded text-xs ${pipeline === p.key ? "bg-white/20" : "bg-white/10"}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Search + Filter */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Suchen: Firma, Rolle, Kontakt, Skill, Tag..."
              className="w-full px-3 py-2 pl-8 bg-[var(--card)] border border-[var(--border)] rounded-lg text-sm text-white placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
            <span className="absolute left-2.5 top-2.5 text-[var(--muted)] text-sm">🔍</span>
          </div>
          {allTags.length > 0 && (
            <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}
              className="px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg text-sm text-[var(--muted)]">
              <option value="">Alle Tags</option>
              {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 md:grid-cols-10 gap-2 mb-4">
          {[
            { label: "Gesamt", value: stats.total, color: "text-white" },
            { label: "Aktiv", value: stats.active, color: "text-blue-400" },
            { label: "Gespräche", value: stats.interviews, color: "text-purple-400" },
            { label: "Angebote", value: stats.offers, color: "text-amber-400" },
            { label: "Gewonnen", value: stats.won, color: "text-green-400" },
            { label: "Verloren", value: stats.lost, color: "text-red-400" },
            { label: "Follow-ups", value: stats.followUps, color: stats.followUps > 0 ? "text-red-400 animate-pulse" : "text-zinc-500" },
            { label: "Woche", value: stats.thisWeek, color: "text-cyan-400" },
            { label: "Conv.%", value: `${stats.conversionRate}%`, color: "text-emerald-400" },
            { label: "Wert", value: stats.pipelineValue > 0 ? `${Math.round(stats.pipelineValue / 1000)}k` : "—", color: "text-yellow-400" },
          ].map((s) => (
            <div key={s.label} className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-2 text-center">
              <p className="text-[var(--muted)] text-[10px]">{s.label}</p>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Follow-up Banner */}
        {stats.followUps > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2.5 mb-4">
            <p className="text-red-400 text-sm font-medium">⚠ {stats.followUps} Follow-up{stats.followUps > 1 ? "s" : ""} überfällig — jetzt nachhaken!</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-[var(--muted)]">Laden...</div>
        ) : apps.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[var(--muted)] text-lg mb-4">Noch keine Einträge</p>
            <Link href="/new" className="px-5 py-2.5 bg-[var(--accent)] text-white rounded-lg font-medium">Ersten Eintrag erstellen</Link>
          </div>
        ) : (
          <>
            {/* Kanban Board */}
            <div className="grid grid-cols-4 gap-2 mb-5" style={{ minHeight: 420 }}>
              {ACTIVE_STAGES.map((stage) => {
                const stageApps = filtered.filter((a) => a.stage === stage.key);
                return (
                  <div key={stage.key} className="rounded-xl border border-[var(--border)] flex flex-col bg-[var(--card)]"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => { if (dragId) { moveStage(dragId, stage.key); setDragId(null); } }}>
                    <div className="p-2.5 border-b border-[var(--border)] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: stage.color }} />
                        <span className="text-xs font-medium">{stage.label}</span>
                      </div>
                      <span className="text-[10px] text-[var(--muted)] bg-white/5 px-1.5 py-0.5 rounded">{stageApps.length}</span>
                    </div>
                    <div className="p-1.5 flex-1 overflow-y-auto space-y-1.5 max-h-[500px]">
                      {stageApps.map((app) => {
                        const followUp = isFollowUpDue(app);
                        const stale = daysSinceActivity(app) > 7 && !["won", "lost"].includes(app.stage);
                        return (
                          <div key={app.id} draggable onDragStart={() => setDragId(app.id)}
                            className={`bg-[var(--card)] border rounded-lg p-2.5 cursor-grab active:cursor-grabbing hover:border-[var(--accent)]/40 transition-all ${
                              followUp ? "border-red-500/50" : stale ? "border-amber-500/30" : "border-[var(--border)]"
                            }`}>
                            <div className="flex items-start justify-between mb-0.5">
                              <Link href={`/app/${app.id}`} className="font-medium text-sm hover:text-[var(--accent)] transition-colors leading-tight">{app.company}</Link>
                              <button onClick={(e) => { e.stopPropagation(); handleDelete(app.id); }} className="text-[var(--muted)] hover:text-red-400 text-[10px] ml-1">✕</button>
                            </div>
                            <p className="text-[11px] text-[var(--muted)] mb-1.5 leading-tight">{app.role}</p>

                            {app.salary && <p className="text-[11px] text-green-400 mb-1">{app.salary}</p>}
                            {followUp && <p className="text-[10px] text-red-400 font-medium mb-1">⚠ Follow-up!</p>}
                            {stale && !followUp && <p className="text-[10px] text-amber-400/70 mb-1">💤 {daysSinceActivity(app)}d inaktiv</p>}
                            {app.nextAction && <p className="text-[10px] text-cyan-400 mb-1 truncate">→ {app.nextAction}</p>}

                            <div className="flex items-center justify-between mt-1">
                              <div className="flex gap-1 flex-wrap">
                                {app.tags.slice(0, 2).map((t) => (
                                  <span key={t} className="px-1 py-0.5 bg-white/5 rounded text-[9px] text-[var(--muted)]">{t}</span>
                                ))}
                              </div>
                              <span className="text-[9px] text-[var(--muted)]">{daysAgo(app.createdAt)}d</span>
                            </div>

                            {app.contact.name && <p className="text-[9px] text-[var(--muted)] mt-1 truncate">📧 {app.contact.name}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pipeline Conversion Stats */}
            {pipeline !== "all" && filtered.length > 2 && (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-3 mb-4">
                <p className="text-xs text-[var(--muted)] mb-2">Pipeline: {PIPELINES.find((p) => p.key === pipeline)?.emoji} {PIPELINES.find((p) => p.key === pipeline)?.label}</p>
                <div className="flex items-center gap-1 text-xs">
                  {ACTIVE_STAGES.map((s, i) => {
                    const count = filtered.filter((a) => a.stage === s.key).length;
                    const total = filtered.length;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div key={s.key} className="flex items-center gap-1">
                        {i > 0 && <span className="text-[var(--muted)]">→</span>}
                        <div className="flex items-center gap-1 px-2 py-1 rounded" style={{ background: `${s.color}20` }}>
                          <span style={{ color: s.color }}>{count}</span>
                          <span className="text-[var(--muted)]">({pct}%)</span>
                        </div>
                      </div>
                    );
                  })}
                  <span className="text-[var(--muted)] ml-2">| Won: {filtered.filter((a) => a.stage === "won").length} | Lost: {filtered.filter((a) => a.stage === "lost").length}</span>
                </div>
              </div>
            )}

            {/* Closed */}
            {closedApps.length > 0 && (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3">
                <h3 className="text-xs font-medium text-[var(--muted)] mb-2">Abgeschlossen ({closedApps.length})</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {closedApps.map((app) => (
                    <Link key={app.id} href={`/app/${app.id}`}
                      className={`p-2.5 rounded-lg border transition-colors hover:border-[var(--accent)]/50 ${app.stage === "won" ? "border-green-600/30 bg-green-600/5" : "border-red-600/30 bg-red-600/5"}`}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs">{app.stage === "won" ? "✅" : "❌"}</span>
                        <span className="font-medium text-sm">{app.company}</span>
                      </div>
                      <p className="text-xs text-[var(--muted)]">{app.role}</p>
                      {app.salary && <p className="text-xs text-green-400">{app.salary}</p>}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <p className="text-center text-[10px] text-[var(--muted)]/50 mt-4">Drag & Drop = Status ändern</p>
          </>
        )}
      </div>
    </div>
  );
}
