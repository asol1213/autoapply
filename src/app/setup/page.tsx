"use client";

import { useState } from "react";
import Link from "next/link";

export default function SetupPage() {
  const [copied, setCopied] = useState(false);

  // Bookmarklet code - grabs page info and opens AutoApply
  const bookmarkletCode = `javascript:void(function(){var s=window.getSelection().toString().trim();var t=document.title;var u=window.location.href;var c='';var r='';var parts=t.split(/[\\-–—|]/);if(parts.length>=2){c=parts[parts.length-1].trim();r=parts[0].trim();}else{c=t;}var p=new URLSearchParams();p.set('company',c);p.set('role',r);p.set('url',u);if(s)p.set('description',s.substring(0,5000));window.open('http://localhost:3000/new?'+p.toString(),'_blank');}())`;

  function copyBookmarklet() {
    navigator.clipboard.writeText(bookmarkletCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <Link href="/" className="text-[var(--muted)] hover:text-white transition-colors text-sm">&larr; Dashboard</Link>
      <h1 className="text-2xl font-bold mt-4 mb-6">Setup & Shortcuts</h1>

      {/* Bookmarklet */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 mb-6">
        <h2 className="font-bold text-lg mb-3">Bookmarklet: Job speichern</h2>
        <p className="text-[var(--muted)] text-sm mb-4">
          Ziehe den Button unten in deine Lesezeichen-Leiste. Wenn du auf einer Job-Seite bist, klick drauf — es öffnet AutoApply mit den Infos vorausgefüllt.
        </p>

        <div className="bg-gradient-to-r from-[var(--accent)] to-blue-700 rounded-xl p-4 mb-4 text-center">
          <a
            href={bookmarkletCode}
            className="inline-block px-6 py-3 bg-white text-black font-bold rounded-lg text-lg hover:bg-gray-100 transition-colors cursor-grab"
            onClick={(e) => e.preventDefault()}
            draggable
          >
            + AutoApply
          </a>
          <p className="text-white/70 text-xs mt-2">← Diesen Button in die Lesezeichen-Leiste ziehen</p>
        </div>

        <div className="space-y-3 text-sm">
          <h3 className="font-medium">So funktioniert es:</h3>
          <ol className="list-decimal list-inside text-[var(--muted)] space-y-1.5">
            <li>Du bist auf einer Job-Seite (LinkedIn, Indeed, RemoteOK, etc.)</li>
            <li><strong>Optional:</strong> Markiere die Stellenbeschreibung mit der Maus</li>
            <li>Klick auf das <strong>+ AutoApply</strong> Lesezeichen</li>
            <li>AutoApply öffnet sich mit vorausgefüllten Feldern:
              <ul className="list-disc list-inside ml-4 text-[var(--muted)]/70 mt-1">
                <li><strong>Firma</strong> — aus dem Seitentitel extrahiert</li>
                <li><strong>Rolle</strong> — aus dem Seitentitel extrahiert</li>
                <li><strong>URL</strong> — die aktuelle Seite</li>
                <li><strong>Beschreibung</strong> — der markierte Text</li>
              </ul>
            </li>
            <li>Prüfe die Daten, ergänze was fehlt, speichere</li>
          </ol>
        </div>

        <div className="mt-4 pt-4 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--muted)] mb-2">Falls Drag & Drop nicht funktioniert — manuell als Lesezeichen erstellen:</p>
          <div className="flex gap-2">
            <code className="flex-1 text-[10px] bg-black/30 rounded p-2 overflow-x-auto text-[var(--muted)] break-all">{bookmarkletCode.substring(0, 100)}...</code>
            <button onClick={copyBookmarklet} className="px-3 py-1 bg-[var(--accent)] text-white rounded text-xs whitespace-nowrap">
              {copied ? "Kopiert!" : "Code kopieren"}
            </button>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 mb-6">
        <h2 className="font-bold text-lg mb-3">Keyboard Shortcuts</h2>
        <div className="space-y-2">
          {[
            { key: "N", desc: "Quick Add öffnen (direkt im Dashboard)" },
            { key: "Escape", desc: "Quick Add / Dialog schließen" },
            { key: "Enter", desc: "Quick Add speichern (wenn Firma ausgefüllt)" },
          ].map((s) => (
            <div key={s.key} className="flex items-center gap-3">
              <kbd className="px-2 py-1 bg-white/10 border border-[var(--border)] rounded text-xs font-mono min-w-[60px] text-center">{s.key}</kbd>
              <span className="text-sm text-[var(--muted)]">{s.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Workflow */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
        <h2 className="font-bold text-lg mb-3">Optimaler Workflow</h2>
        <div className="space-y-3 text-sm text-[var(--muted)]">
          <div className="flex gap-3">
            <span className="text-2xl">1️⃣</span>
            <div>
              <p className="text-white font-medium">Job finden</p>
              <p>Job-Seite öffnen → Beschreibung markieren → Bookmarklet klicken</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-2xl">2️⃣</span>
            <div>
              <p className="text-white font-medium">CV + Cover Letter generieren</p>
              <p>Stellenbeschreibung zu Claude Code geben → CV-Daten + Cover Letter zurückbekommen</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-2xl">3️⃣</span>
            <div>
              <p className="text-white font-medium">In AutoApply einfügen</p>
              <p>Detail-Seite öffnen → CV-Daten + Cover Letter in die Tabs pasten → Speichern</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-2xl">4️⃣</span>
            <div>
              <p className="text-white font-medium">Abschicken & Tracken</p>
              <p>E-Mail senden oder Cover Letter kopieren fürs Portal → Karte in &quot;Beworben&quot; ziehen</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
