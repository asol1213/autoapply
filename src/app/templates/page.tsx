"use client";

import { useState } from "react";
import Link from "next/link";
import templates from "@/data/templates.json";

const PIPELINES = [
  { key: "dubai", label: "Dubai Jobs", emoji: "🏙️" },
  { key: "remote", label: "Remote Jobs", emoji: "🌍" },
  { key: "freelance", label: "Freelance", emoji: "💼" },
  { key: "kunden", label: "Kunden", emoji: "🤝" },
] as const;

type PipelineKey = typeof PIPELINES[number]["key"];

export default function TemplatesPage() {
  const [activePipeline, setActivePipeline] = useState<PipelineKey>("remote");
  const [copied, setCopied] = useState("");

  const t = templates[activePipeline];
  const cvTemplate = templates.cvData.default;

  async function copy(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  }

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/" className="text-[var(--muted)] hover:text-white transition-colors text-sm">&larr; Dashboard</Link>
        <h1 className="text-2xl font-bold mt-3">Templates</h1>
        <p className="text-[var(--muted)] text-sm">Vorgefertigte Cover Letter, E-Mails und CV-Daten pro Pipeline</p>
      </div>

      {/* Pipeline Tabs */}
      <div className="flex gap-2 mb-6">
        {PIPELINES.map((p) => (
          <button key={p.key} onClick={() => setActivePipeline(p.key)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activePipeline === p.key ? "bg-[var(--accent)] text-white" : "bg-[var(--card)] border border-[var(--border)] text-[var(--muted)] hover:text-white"
            }`}>
            {p.emoji} {p.label}
          </button>
        ))}
      </div>

      {copied && <div className="bg-green-600/10 border border-green-600/30 rounded-lg p-2 mb-4"><p className="text-green-400 text-sm">{copied} kopiert!</p></div>}

      <div className="space-y-6">
        {/* Cover Letter Template */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-medium">Cover Letter Template</h2>
            <button onClick={() => copy(t.coverLetter, "Cover Letter")} className="text-sm text-[var(--accent)] hover:underline">Kopieren</button>
          </div>
          <pre className="whitespace-pre-wrap text-sm text-[var(--muted)] leading-relaxed bg-black/20 rounded-lg p-4">{t.coverLetter}</pre>
        </div>

        {/* Email Template */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-medium">E-Mail Template</h2>
            <button onClick={() => copy(`Betreff: ${t.emailSubject}\n\n${t.emailBody}`, "E-Mail")} className="text-sm text-[var(--accent)] hover:underline">Kopieren</button>
          </div>
          <p className="text-xs text-[var(--muted)] mb-2">Betreff: <span className="text-white">{t.emailSubject}</span></p>
          <pre className="whitespace-pre-wrap text-sm text-[var(--muted)] leading-relaxed bg-black/20 rounded-lg p-4">{t.emailBody}</pre>
        </div>

        {/* CV Data Template */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-medium">CV-Daten Template (JSON)</h2>
            <button onClick={() => copy(JSON.stringify(cvTemplate, null, 2), "CV-Daten")} className="text-sm text-[var(--accent)] hover:underline">Kopieren</button>
          </div>
          <p className="text-xs text-[var(--muted)] mb-3">Felder in [Klammern] musst du pro Stelle anpassen. Der Rest ist dein Basis-Profil.</p>
          <pre className="whitespace-pre-wrap text-xs text-[var(--muted)] leading-relaxed bg-black/20 rounded-lg p-4 font-mono overflow-x-auto">{JSON.stringify(cvTemplate, null, 2)}</pre>
        </div>

        {/* Workflow */}
        <div className="bg-blue-600/10 border border-blue-600/30 rounded-xl p-5">
          <h2 className="font-medium text-blue-400 mb-2">So nutzt du die Templates</h2>
          <ol className="text-sm text-blue-300/80 space-y-1.5 list-decimal list-inside">
            <li>Kopiere das passende Template (Cover Letter / E-Mail / CV-Daten)</li>
            <li>Geh zu Claude Code und sage: &quot;Passe dieses Template an für [Stellenbeschreibung]&quot;</li>
            <li>Claude Code generiert die angepasste Version</li>
            <li>Paste das Ergebnis in AutoApply unter &quot;+ Hinzufügen&quot;</li>
            <li>Für den CV: Speichere die JSON-Daten als <code className="bg-white/10 px-1 rounded">cv_data.json</code> und führe <code className="bg-white/10 px-1 rounded">python cv_filler.py</code> aus</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
