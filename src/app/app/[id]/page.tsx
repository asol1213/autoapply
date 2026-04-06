"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Contact { name: string; role: string; email: string; linkedin: string; phone: string; }
interface Activity { date: string; type: string; text: string; }

interface Application {
  id: string;
  pipeline: string;
  stage: string;
  company: string;
  role: string;
  url: string;
  language: string;
  jobDescription: string;
  coverLetter: string;
  cvData: string;
  emailSubject: string;
  emailBody: string;
  contact: Contact;
  notes: string;
  nextAction: string;
  nextActionDate: string | null;
  skills: string[];
  salary: string;
  tags: string[];
  activities: Activity[];
  createdAt: string;
  updatedAt: string;
  appliedAt: string | null;
  followUpAt: string | null;
  followUpDone: boolean;
}

const STAGES = ["lead", "applied", "interview", "offer", "won", "lost"] as const;
const STAGE_LABELS: Record<string, string> = { lead: "Lead", applied: "Beworben", interview: "Gespräch", offer: "Angebot", won: "Gewonnen", lost: "Verloren" };
const STAGE_COLORS: Record<string, string> = { lead: "#71717a", applied: "#3b82f6", interview: "#a855f7", offer: "#f59e0b", won: "#22c55e", lost: "#ef4444" };
const PIPELINE_LABELS: Record<string, string> = { dubai: "🏙️ Dubai", remote: "🌍 Remote", freelance: "💼 Freelance", kunden: "🤝 Kunden" };
const ACTIVITY_ICONS: Record<string, string> = { email: "📧", call: "📞", meeting: "🤝", note: "📝", followup: "🔔", status_change: "🔄" };

type Tab = "cover" | "cv" | "email" | "contact" | "job" | "activity";

function daysAgo(date: string) { return Math.floor((Date.now() - new Date(date).getTime()) / 86400000); }

export default function ApplicationDetail() {
  const { id } = useParams();
  const [app, setApp] = useState<Application | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("cover");
  const [newActivityType, setNewActivityType] = useState("note");
  const [newActivityText, setNewActivityText] = useState("");

  useEffect(() => {
    fetch(`/api/applications?id=${id}`).then((r) => r.json()).then((data) => { if (!data.error) setApp(data); });
  }, [id]);

  function msg(m: string) { setMessage(m); setTimeout(() => setMessage(""), 3000); }

  async function handleSave() {
    if (!app) return;
    setSaving(true);
    await fetch("/api/applications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(app) });
    setSaving(false);
    msg("Gespeichert!");
  }

  async function handleSend() {
    if (!app?.contact.email) { msg("Keine E-Mail!"); return; }
    if (!confirm(`E-Mail an ${app.contact.email} senden?`)) return;
    setSending(true);
    const res = await fetch("/api/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: app.id }) });
    const result = await res.json();
    if (result.ok) {
      setApp({ ...app, stage: "applied", appliedAt: result.sentAt });
      await fetch("/api/game", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "send_email" }) });
      msg("E-Mail gesendet! +XP");
    }
    else msg(`Fehler: ${result.error}`);
    setSending(false);
  }

  async function addActivity() {
    if (!app || !newActivityText.trim()) return;
    const res = await fetch("/api/applications", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: app.id, newActivity: { type: newActivityType, text: newActivityText } }),
    });
    const updated = await res.json();
    setApp(updated);
    setNewActivityText("");
    await fetch("/api/game", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add_activity" }) });
    msg("Aktivität hinzugefügt! +XP");
  }

  async function markFollowUpDone() {
    if (!app) return;
    const updated = { ...app, followUpDone: true };
    setApp(updated);
    await fetch("/api/applications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: app.id, followUpDone: true, newActivity: { type: "followup", text: "Follow-up erledigt" } }) });
    await fetch("/api/game", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "follow_up" }) });
    msg("Follow-up erledigt! +XP");
  }

  async function copy(text: string) { await navigator.clipboard.writeText(text); msg("Kopiert!"); }

  if (!app) return <div className="min-h-screen p-6 text-center text-[var(--muted)]">Laden...</div>;

  const isFollowUpDue = app.followUpAt && !app.followUpDone && new Date(app.followUpAt) <= new Date();
  const lastActivity = app.activities?.length > 0 ? app.activities[app.activities.length - 1] : null;

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <Link href="/" className="text-[var(--muted)] hover:text-white transition-colors text-sm">&larr; Dashboard</Link>
          <div className="flex items-center gap-2 mt-3">
            <h1 className="text-2xl font-bold">{app.company}</h1>
            <span className="text-xs px-2 py-0.5 bg-white/10 rounded">{PIPELINE_LABELS[app.pipeline]}</span>
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: STAGE_COLORS[app.stage] }} />
          </div>
          <p className="text-[var(--muted)]">{app.role}</p>
          <div className="flex items-center gap-3 mt-1">
            {app.salary && <span className="text-green-400 text-sm">{app.salary}</span>}
            {app.url && <a href={app.url} target="_blank" className="text-[var(--accent)] text-sm hover:underline">Job-Link →</a>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={app.stage} onChange={(e) => setApp({ ...app, stage: e.target.value })} className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm">
            {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
          </select>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-sm font-medium">{saving ? "..." : "Speichern"}</button>
        </div>
      </div>

      {/* Alerts */}
      {message && <div className="bg-green-600/10 border border-green-600/30 rounded-lg p-2 mb-3"><p className="text-green-400 text-sm">{message}</p></div>}
      {isFollowUpDue && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2.5 mb-3 flex items-center justify-between">
          <p className="text-red-400 text-sm font-medium">⚠ Follow-up überfällig seit {daysAgo(app.followUpAt!)} Tagen</p>
          <button onClick={markFollowUpDone} className="text-xs px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700">Erledigt</button>
        </div>
      )}

      {/* Next Action */}
      <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3 mb-4">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-cyan-400 text-sm font-medium">→ Nächster Schritt</span>
          {app.nextActionDate && <span className="text-xs text-[var(--muted)]">bis {new Date(app.nextActionDate).toLocaleDateString("de-DE")}</span>}
        </div>
        <div className="flex gap-2">
          <input type="text" value={app.nextAction} onChange={(e) => setApp({ ...app, nextAction: e.target.value })} placeholder="z.B. Demo zeigen, CV nachschicken, Anruf am Montag..."
            className="flex-1 px-3 py-2 bg-transparent border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
          <input type="date" value={app.nextActionDate?.split("T")[0] || ""} onChange={(e) => setApp({ ...app, nextActionDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
            className="px-3 py-2 bg-transparent border border-[var(--border)] rounded-lg text-sm text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-cyan-500" />
        </div>
      </div>

      {/* Tags + Skills */}
      {(app.skills.length > 0 || app.tags.length > 0) && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {app.tags.map((t) => <span key={t} className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full text-xs">{t}</span>)}
          {app.skills.map((s) => <span key={s} className="px-2 py-0.5 bg-[var(--accent)]/20 text-[var(--accent)] rounded-full text-xs">{s}</span>)}
        </div>
      )}

      {/* Last Activity */}
      {lastActivity && (
        <p className="text-xs text-[var(--muted)] mb-4">Letzte Aktivität: {ACTIVITY_ICONS[lastActivity.type] || "📝"} {lastActivity.text} — vor {daysAgo(lastActivity.date)} Tagen</p>
      )}

      {/* Tabs */}
      <div className="flex gap-0.5 mb-3 border-b border-[var(--border)] overflow-x-auto">
        {([
          { key: "cover" as Tab, label: "Cover Letter" },
          { key: "cv" as Tab, label: "CV-Daten" },
          { key: "email" as Tab, label: "E-Mail" },
          { key: "contact" as Tab, label: "Kontakt" },
          { key: "job" as Tab, label: "Beschreibung" },
          { key: "activity" as Tab, label: `Aktivitäten (${app.activities?.length || 0})` },
        ]).map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${activeTab === tab.key ? "text-[var(--accent)] border-[var(--accent)]" : "text-[var(--muted)] border-transparent hover:text-white"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
        {activeTab === "cover" && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium text-sm">Cover Letter</h3>
              <button onClick={() => copy(app.coverLetter)} className="text-xs text-[var(--accent)] hover:underline">Kopieren</button>
            </div>
            <textarea value={app.coverLetter} onChange={(e) => setApp({ ...app, coverLetter: e.target.value })} rows={18} placeholder="Cover Letter hier einfügen..."
              className="w-full bg-transparent border border-[var(--border)] rounded-lg p-4 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-y" />
          </div>
        )}

        {activeTab === "cv" && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <div>
                <h3 className="font-medium text-sm">CV-Daten (JSON)</h3>
                <p className="text-[var(--muted)] text-xs">Für cv_filler.py — paste von Claude Code</p>
              </div>
              <button onClick={() => copy(app.cvData)} className="text-xs text-[var(--accent)] hover:underline">Kopieren</button>
            </div>
            <textarea value={app.cvData} onChange={(e) => setApp({ ...app, cvData: e.target.value })} rows={18} placeholder='{"1": "Job Title", "2": "Summary...", ...}'
              className="w-full bg-transparent border border-[var(--border)] rounded-lg p-4 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-y font-mono" />
          </div>
        )}

        {activeTab === "email" && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1">Betreff</label>
              <input type="text" value={app.emailSubject} onChange={(e) => setApp({ ...app, emailSubject: e.target.value })} className="w-full px-3 py-2 bg-transparent border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium">E-Mail Text</label>
                <button onClick={() => copy(app.emailBody)} className="text-xs text-[var(--accent)] hover:underline">Kopieren</button>
              </div>
              <textarea value={app.emailBody} onChange={(e) => setApp({ ...app, emailBody: e.target.value })} rows={8} className="w-full bg-transparent border border-[var(--border)] rounded-lg p-4 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-y" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleSend} disabled={sending || !app.contact.email} className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">{sending ? "Sende..." : "E-Mail senden"}</button>
              <button onClick={() => copy(`${app.emailSubject}\n\n${app.emailBody}\n\n---\n\n${app.coverLetter}`)} className="px-4 py-2 bg-[var(--card)] border border-[var(--border)] hover:bg-white/5 text-sm rounded-lg">Alles kopieren</button>
            </div>
          </div>
        )}

        {activeTab === "contact" && (
          <div className="space-y-3">
            <h3 className="font-medium text-sm mb-2">Kontaktperson</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Name", key: "name" as const, type: "text" },
                { label: "Rolle", key: "role" as const, type: "text" },
                { label: "E-Mail", key: "email" as const, type: "email" },
                { label: "Telefon", key: "phone" as const, type: "tel" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-[10px] text-[var(--muted)] mb-0.5">{f.label}</label>
                  <input type={f.type} value={app.contact[f.key]} onChange={(e) => setApp({ ...app, contact: { ...app.contact, [f.key]: e.target.value } })}
                    className="w-full px-3 py-2 bg-transparent border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
                </div>
              ))}
              <div className="col-span-2">
                <label className="block text-[10px] text-[var(--muted)] mb-0.5">LinkedIn</label>
                <input type="url" value={app.contact.linkedin} onChange={(e) => setApp({ ...app, contact: { ...app.contact, linkedin: e.target.value } })}
                  className="w-full px-3 py-2 bg-transparent border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
              </div>
            </div>
            {app.contact.linkedin && <a href={app.contact.linkedin} target="_blank" className="text-[var(--accent)] text-sm hover:underline inline-block mt-1">LinkedIn öffnen →</a>}
          </div>
        )}

        {activeTab === "job" && (
          <div>
            <h3 className="font-medium text-sm mb-2">Stellenbeschreibung / Projektdetails</h3>
            <textarea value={app.jobDescription} onChange={(e) => setApp({ ...app, jobDescription: e.target.value })} rows={18}
              className="w-full bg-transparent border border-[var(--border)] rounded-lg p-4 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-y" />
          </div>
        )}

        {activeTab === "activity" && (
          <div>
            <h3 className="font-medium text-sm mb-3">Aktivitäten-Log</h3>
            {/* Add Activity */}
            <div className="flex gap-2 mb-4">
              <select value={newActivityType} onChange={(e) => setNewActivityType(e.target.value)} className="px-2 py-2 bg-transparent border border-[var(--border)] rounded-lg text-sm">
                <option value="note">📝 Notiz</option>
                <option value="email">📧 E-Mail</option>
                <option value="call">📞 Anruf</option>
                <option value="meeting">🤝 Meeting</option>
                <option value="followup">🔔 Follow-up</option>
              </select>
              <input type="text" value={newActivityText} onChange={(e) => setNewActivityText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addActivity(); }}
                placeholder="Was ist passiert?" className="flex-1 px-3 py-2 bg-transparent border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
              <button onClick={addActivity} disabled={!newActivityText.trim()} className="px-3 py-2 bg-[var(--accent)] text-white rounded-lg text-sm disabled:opacity-50">Hinzufügen</button>
            </div>
            {/* Timeline */}
            <div className="space-y-2">
              {[...(app.activities || [])].reverse().map((a, i) => (
                <div key={i} className="flex gap-3 items-start py-2 border-b border-[var(--border)]/50 last:border-0">
                  <span className="text-sm mt-0.5">{ACTIVITY_ICONS[a.type] || "📝"}</span>
                  <div className="flex-1">
                    <p className="text-sm">{a.text}</p>
                    <p className="text-[10px] text-[var(--muted)]">{new Date(a.date).toLocaleString("de-DE")}</p>
                  </div>
                </div>
              ))}
              {(!app.activities || app.activities.length === 0) && <p className="text-sm text-[var(--muted)]">Noch keine Aktivitäten</p>}
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="mt-4">
        <label className="block text-sm font-medium mb-1">Notizen</label>
        <textarea value={app.notes} onChange={(e) => setApp({ ...app, notes: e.target.value })} rows={3} placeholder="Sonstiges..."
          className="w-full px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-y" />
      </div>

      {/* Timestamps */}
      <div className="mt-3 flex flex-wrap gap-4 text-[10px] text-[var(--muted)]">
        <span>Erstellt: {new Date(app.createdAt).toLocaleDateString("de-DE")}</span>
        <span>Aktualisiert: vor {daysAgo(app.updatedAt)} Tagen</span>
        {app.appliedAt && <span>Beworben: {new Date(app.appliedAt).toLocaleDateString("de-DE")}</span>}
        {app.followUpAt && <span className={isFollowUpDue ? "text-red-400" : ""}>Follow-up: {new Date(app.followUpAt).toLocaleDateString("de-DE")}</span>}
      </div>
    </div>
  );
}
