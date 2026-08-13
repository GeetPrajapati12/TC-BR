# QA Tool

A production-ready QA management platform for teams. Create and track test cases and bug reports with AI assistance, organised by project and company workspace.

---

## Features

- **Multi-tenant** — each company gets its own isolated workspace
- **Projects** — organise test cases and bug reports by project
- **AI generation** — one-line summary → full test case or bug report (Google Gemini; smart fallback when no API key)
- **Manual entry** — full control over all fields
- **Activity log** — every action is tracked per company and project
- **Excel export** — one-click export of test cases and bug reports
- **Role-based access** — Admin, QA Lead, Tester, Developer, Designer, Product Manager

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Database | MongoDB via Mongoose |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| AI | Google Gemini 1.5 Pro via `@ai-sdk/google` |
| UI | Tailwind CSS + shadcn/ui + Radix UI |
| Export | xlsx |

---

## Getting Started

### 1. Clone and install

```bash
git clone <your-repo>
cd qa-tool
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/<db>?retryWrites=true&w=majority
JWT_SECRET=<generate with: openssl rand -base64 64>
GOOGLE_GENERATIVE_AI_API_KEY=   # optional
```

### 3. Run in development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Build for production

```bash
npm run build
npm start
```

---

## First-Time Setup

1. Go to `/signup`
2. Select **Admin** role — this creates your company workspace
3. Fill in company name, industry, and your account details
4. Sign in at `/login`
5. Create a project and start adding test cases and bug reports

Non-admin users sign up with the **exact** company name an Admin already registered.

---

## Project Structure

```
app/
  api/
    auth/          login, logout, register, me
    projects/      CRUD + soft delete
    test-cases/    CRUD + AI generation
    bug-reports/   CRUD + AI generation
    logs/          paginated activity feed
    ai/            AI generation endpoints
  projects/        projects list + detail pages
  login/           auth pages
  signup/
lib/
  auth.js          shared JWT helpers (getAuthenticatedUser, signToken, slugify)
  api-response.js  consistent response helpers + withErrorHandling wrapper
  ai-generator.ts  Gemini integration with domain-aware fallback
  mongodb.js       connection pooling
  utils.ts         formatDate, formatDateTime, formatAction, cn
models/
  User, Company, Project, TestCase, BugReport, ActivityLog
components/
  app-header.tsx         sticky header with breadcrumbs + user info
  test-case-sheet.tsx    full test case manager (AI + manual + CRUD + export)
  bug-sheet.tsx          full bug report manager (AI + manual + CRUD + export)
  logs-sheet.tsx         paginated activity log with filters
  ui/
    loading-spinner.tsx  PageLoader + LoadingSpinner
    stat-card.tsx        reusable stat display
    empty-state.tsx      reusable empty state with icon + action
hooks/
  use-toast.ts     toast system (5s auto-dismiss, limit 3)
  use-mobile.tsx   responsive breakpoint hook
contexts/
  AuthContext.tsx  auth state, login/logout/register
```

---

## API Reference

All routes require `Authorization: Bearer <token>` except auth endpoints.

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account + optionally create company |
| POST | `/api/auth/login` | Sign in, get JWT |
| POST | `/api/auth/logout` | Sign out (logs activity) |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/projects` | List company projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Get project |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Soft-delete project |
| GET | `/api/test-cases?projectId=` | List test cases |
| POST | `/api/test-cases?projectId=` | Create test case |
| PUT | `/api/test-cases/:id` | Update test case |
| DELETE | `/api/test-cases/:id` | Delete test case |
| GET | `/api/bug-reports?projectId=` | List bug reports |
| POST | `/api/bug-reports?projectId=` | Create bug report |
| PUT | `/api/bug-reports/:id` | Update bug report |
| DELETE | `/api/bug-reports/:id` | Delete bug report |
| GET | `/api/logs?projectId=&page=&limit=` | Paginated activity log |
| POST | `/api/ai/generate-test-case` | AI test case generation |
| POST | `/api/ai/generate-bug-report` | AI bug report generation |

---

## Files Removed from Original

| File | Reason |
|---|---|
| `lib/debug-env.ts` | Dev leftover |
| `scripts/install-*.js` (×3) | No-op console.log files |
| `pnpm-lock.yaml` | Project uses npm |
| `public/placeholder*.svg` | Unused scaffolding |
| `components/ui/use-mobile.tsx` | Duplicate of `hooks/use-mobile.tsx` |
| `components/ui/use-toast.ts` | Duplicate of `hooks/use-toast.ts` |
| `styles/globals.css` | Duplicate of `app/globals.css` |
| `components/ui/sonner.tsx` | Unused second toast system |

---

## Bugs Fixed

| Bug | Fix |
|---|---|
| `ActivityLog.create` in logout missing `company` field | Added `.populate("company")` + `company: user.company._id` |
| Double `AuthProvider` (layout + page) | Removed from `app/page.tsx`, kept only in `layout.tsx` |
| Toast never auto-dismissed (`TOAST_REMOVE_DELAY = 1_000_000ms`) | Fixed to 5 000ms, limit raised to 3 |
| `next.config.mjs` suppressing all TS and lint errors | Removed `ignoreBuildErrors` + `ignoreDuringBuilds` |
| Auth helper duplicated across every API route | Extracted to `lib/auth.js` |
| No consistent API error handling | Added `lib/api-response.js` with `withErrorHandling` wrapper |
| `app/page.tsx` had full tab UI instead of redirecting | Now redirects to `/projects` or `/login` |

---

## Deployment

### Vercel (recommended)

1. Push to GitHub
2. Import in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Self-hosted

```bash
npm run build
npm start         # runs on port 3000
```

Use a reverse proxy (nginx/Caddy) in front for SSL.

---

## License

MIT
