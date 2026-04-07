import fs from "fs";
import path from "path";

export type Pipeline = "dubai" | "remote" | "freelance" | "kunden";
export type Stage = "lead" | "applied" | "interview" | "offer" | "won" | "lost";

export interface Contact {
  name: string;
  role: string;
  email: string;
  linkedin: string;
  phone: string;
}

export interface Activity {
  date: string;
  type: "email" | "call" | "meeting" | "note" | "followup" | "status_change";
  text: string;
}

export interface Application {
  id: string;
  pipeline: Pipeline;
  stage: Stage;
  company: string;
  role: string;
  url: string;
  language: "en" | "de";
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

const DB_PATH = path.join(process.cwd(), "src/data/applications.json");

function readDB(): Application[] {
  try {
    if (!fs.existsSync(DB_PATH)) return [];
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    if (!raw.trim()) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeDB(apps: Application[]) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(apps, null, 2));
  } catch {
    // Vercel serverless: writes don't persist, but that's OK for demo
  }
}

export function getApplications(): Application[] {
  return readDB().sort(
    (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
  );
}

export function getApplication(id: string): Application | undefined {
  return readDB().find((a) => a.id === id);
}

export function saveApplication(app: Application): Application {
  app.updatedAt = new Date().toISOString();
  const apps = readDB();
  const idx = apps.findIndex((a) => a.id === app.id);
  if (idx >= 0) apps[idx] = app;
  else apps.push(app);
  writeDB(apps);
  return app;
}

export function deleteApplication(id: string) {
  writeDB(readDB().filter((a) => a.id !== id));
}

export function bulkUpdateStage(ids: string[], stage: Stage) {
  const apps = readDB();
  for (const app of apps) {
    if (ids.includes(app.id)) {
      app.stage = stage;
      app.updatedAt = new Date().toISOString();
    }
  }
  writeDB(apps);
}

export const PIPELINES: Pipeline[] = ["dubai", "remote", "freelance", "kunden"];
export const STAGES: Stage[] = ["lead", "applied", "interview", "offer", "won", "lost"];

export const PIPELINE_CONFIG: Record<Pipeline, { label: string; emoji: string }> = {
  dubai: { label: "Dubai Jobs", emoji: "🏙️" },
  remote: { label: "Remote Jobs", emoji: "🌍" },
  freelance: { label: "Freelance", emoji: "💼" },
  kunden: { label: "Kunden", emoji: "🤝" },
};

export const STAGE_CONFIG: Record<Stage, { label: string; color: string }> = {
  lead: { label: "Lead", color: "#71717a" },
  applied: { label: "Beworben", color: "#3b82f6" },
  interview: { label: "Gespräch", color: "#a855f7" },
  offer: { label: "Angebot", color: "#f59e0b" },
  won: { label: "Gewonnen", color: "#22c55e" },
  lost: { label: "Verloren", color: "#ef4444" },
};
