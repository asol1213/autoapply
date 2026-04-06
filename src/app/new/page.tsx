"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

const PIPELINES = [
  { key: "dubai", label: "Dubai Jobs", emoji: "🏙️" },
  { key: "remote", label: "Remote Jobs", emoji: "🌍" },
  { key: "freelance", label: "Freelance", emoji: "💼" },
  { key: "kunden", label: "Kunden", emoji: "🤝" },
] as const;

function NewApplicationInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [pipeline, setPipeline] = useState<string>("remote");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [url, setUrl] = useState("");
  const [language, setLanguage] = useState<"en" | "de">("en");
  const [salary, setSalary] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactLinkedin, setContactLinkedin] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [cvData, setCvData] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [prefilled, setPrefilled] = useState(false);

  // Read URL params (from bookmarklet)
  useEffect(() => {
    if (params.get("company")) { setCompany(params.get("company") || ""); setPrefilled(true); }
    if (params.get("role")) setRole(params.get("role") || "");
    if (params.get("url")) setUrl(params.get("url") || "");
    if (params.get("description")) setJobDescription(params.get("description") || "");
    if (params.get("pipeline")) setPipeline(params.get("pipeline") || "remote");
    if (params.get("salary")) setSalary(params.get("salary") || "");
  }, [params]);
  const [skills, setSkills] = useState("");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showMore, setShowMore] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pipeline,
        stage: coverLetter ? "applied" : "lead",
        company,
        role,
        url,
        language,
        salary,
        jobDescription,
        coverLetter,
        cvData,
        emailSubject: emailSubject || `Application: ${role} — Andrew Arbo`,
        emailBody,
        contact: { name: contactName, role: contactRole, email: contactEmail, linkedin: contactLinkedin },
        skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
        tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
        notes,
      }),
    });
    const app = await res.json();

    // XP for creating
    const xpAction = coverLetter ? "apply" : "add_lead";
    await fetch("/api/game", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: xpAction }) });

    router.push(`/app/${app.id}`);
  }

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href="/" className="text-[var(--muted)] hover:text-white transition-colors text-sm">&larr; Dashboard</Link>
        <h1 className="text-2xl font-bold mt-3">Neuer Eintrag</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Pipeline */}
        <div>
          <label className="block text-sm font-medium mb-2">Pipeline</label>
          <div className="grid grid-cols-4 gap-2">
            {PIPELINES.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPipeline(p.key)}
                className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  pipeline === p.key
                    ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                    : "bg-[var(--card)] border-[var(--border)] text-[var(--muted)] hover:text-white"
                }`}
              >
                {p.emoji} {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Company + Role */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">Firma / Kunde <span className="text-red-400">*</span></label>
            <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} required placeholder="z.B. Stripe, Noon, ..." className="w-full px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-white placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Rolle / Projekt <span className="text-red-400">*</span></label>
            <input type="text" value={role} onChange={(e) => setRole(e.target.value)} required placeholder="z.B. Data Engineer, Automation, ..." className="w-full px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-white placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm" />
          </div>
        </div>

        {/* URL + Salary + Language */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">URL</label>
            <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-white placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Gehalt / Rate</label>
            <input type="text" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="€80k / $100/h" className="w-full px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-white placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Sprache</label>
            <div className="flex gap-2">
              {(["en", "de"] as const).map((l) => (
                <button key={l} type="button" onClick={() => setLanguage(l)} className={`flex-1 py-2.5 rounded-lg border text-sm transition-colors ${language === l ? "bg-[var(--accent)] border-[var(--accent)] text-white" : "bg-[var(--card)] border-[var(--border)] text-[var(--muted)]"}`}>
                  {l === "en" ? "EN" : "DE"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Contact */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Kontaktperson</label>
          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Name" className="px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-white placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm" />
            <input type="text" value={contactRole} onChange={(e) => setContactRole(e.target.value)} placeholder="Rolle (z.B. Head of Engineering)" className="px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-white placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm" />
            <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="E-Mail" className="px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-white placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm" />
            <input type="url" value={contactLinkedin} onChange={(e) => setContactLinkedin(e.target.value)} placeholder="LinkedIn URL" className="px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-white placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm" />
          </div>
        </div>

        {/* Tags + Skills */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">Tags <span className="text-[var(--muted)] text-xs">(kommagetrennt)</span></label>
            <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Hot, Recruiter, Empfehlung, ..." className="w-full px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-white placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Skills <span className="text-[var(--muted)] text-xs">(kommagetrennt)</span></label>
            <input type="text" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Python, SQL, Next.js, ..." className="w-full px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-white placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm" />
          </div>
        </div>

        {/* Job Description */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Stellenbeschreibung / Projektdetails</label>
          <textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} rows={6} placeholder="Kopiere hier die Beschreibung rein..." className="w-full px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-white placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm resize-y" />
        </div>

        {/* Expand for CV/Cover Letter/Email */}
        <button type="button" onClick={() => setShowMore(!showMore)} className="text-[var(--accent)] text-sm hover:underline">
          {showMore ? "▾ Weniger Felder" : "▸ CV-Daten, Cover Letter & E-Mail einblenden"}
        </button>

        {showMore && (
          <div className="space-y-5 border-t border-[var(--border)] pt-5">
            <div className="bg-blue-600/10 border border-blue-600/30 rounded-lg p-3">
              <p className="text-blue-400 text-xs">
                Diese Felder füllst du mit dem Output von Claude Code. Gib mir die Stellenbeschreibung im Chat → ich generiere CV-Daten + Cover Letter + E-Mail → du pastest es hier rein.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">CV-Daten <span className="text-[var(--muted)] text-xs">(JSON für cv_filler.py)</span></label>
              <textarea value={cvData} onChange={(e) => setCvData(e.target.value)} rows={8} placeholder='{"1": "Job Title", "2": "Summary...", ...}' className="w-full px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-white placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm resize-y font-mono" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Cover Letter</label>
              <textarea value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} rows={10} placeholder="Cover Letter hier einfügen..." className="w-full px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-white placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm resize-y" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">E-Mail Betreff</label>
              <input type="text" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder={`Application: ${role || "Role"} — Andrew Arbo`} className="w-full px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-white placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">E-Mail Text</label>
              <textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} rows={5} placeholder="Kurzer E-Mail-Text..." className="w-full px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-white placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm resize-y" />
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Notizen</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Sonstiges..." className="w-full px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-white placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm resize-y" />
        </div>

        <button
          type="submit"
          disabled={saving || !company.trim() || !role.trim()}
          className="w-full py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
        >
          {saving ? "Speichern..." : "Speichern"}
        </button>
      </form>

      {prefilled && (
        <div className="mt-4 bg-green-600/10 border border-green-600/30 rounded-lg p-3">
          <p className="text-green-400 text-sm">Felder wurden automatisch von der Website ausgefüllt. Prüfe und ergänze die Daten.</p>
        </div>
      )}
    </div>
  );
}

export default function NewApplication() {
  return (
    <Suspense fallback={<div className="min-h-screen p-6 text-center text-[var(--muted)]">Laden...</div>}>
      <NewApplicationInner />
    </Suspense>
  );
}
