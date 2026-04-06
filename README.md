# AutoApply — Job & Client Pipeline

Personal CRM and job application tracker with gamification. Built for managing multiple pipelines (Dubai jobs, remote jobs, freelance, clients) from a single Kanban dashboard.

## Features

- **4 Pipelines**: Dubai Jobs, Remote Jobs, Freelance, Kunden — each with separate tracking
- **Kanban Board**: Drag & drop cards between stages (Lead → Applied → Interview → Offer → Won/Lost)
- **Quick Add**: Press `N` to add a lead in 3 seconds without leaving the dashboard
- **Bookmarklet**: Save jobs from any website with one click — auto-fills company, role, URL, and selected job description
- **Gamification**: XP, levels, streaks, combo multiplier, daily quests, 20 achievements — designed for ADHD brains
- **Contact Tracking**: Name, role, email, phone, LinkedIn per entry
- **Activity Log**: Timeline of emails, calls, meetings, notes per entry
- **Follow-up System**: Auto-reminder 5 days after applying, red warning when overdue
- **Next Action**: "Demo zeigen am 10.04" — always know your next step
- **Templates**: Pre-built cover letters, emails, and CV data per pipeline type
- **Email Sending**: Send applications directly via Resend
- **CV Data Integration**: JSON output for PowerPoint CV filler script
- **Pipeline Stats**: Conversion rates, pipeline value, weekly comparison
- **Light/Dark Mode**: Toggle with one click
- **Search & Filter**: By company, role, contact, skills, tags — combinable

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **React 19** + **TypeScript**
- **Tailwind CSS 4**
- **Resend** (email sending)
- **JSON file storage** (no database needed)

## Quick Start

```bash
npm install
cp .env.example .env.local  # optional: add Resend key for email sending
npm run dev
# http://localhost:3000
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `N` | Open Quick Add |
| `Enter` | Save Quick Add |
| `Escape` | Close Quick Add |

## Bookmarklet Setup

Go to `http://localhost:3000/setup` to install the bookmarklet. It grabs job info from any website and opens AutoApply with pre-filled fields.

## Workflow

1. Find a job → click bookmarklet or press `N`
2. Generate CV + cover letter with Claude Code
3. Paste into AutoApply → track status
4. Send email or copy for job portal
5. Follow up when reminded
6. Collect XP and achievements along the way

## Screenshots

Dark mode Kanban dashboard with gamification bar, pipeline tabs, and drag & drop cards.
