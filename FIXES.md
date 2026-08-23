
# D.A.P — Mock→Real Fixes Summary

> All changes replace hardcoded mock/dummy data with real PostgreSQL-backed API calls.

---

## Session 1 — Auth, Session Context, Core Console Pages

### Backend

**`backend/src/projects/_db.py`**
- Added `name TEXT NOT NULL DEFAULT ''` column to `users` table via `ALTER TABLE … ADD COLUMN IF NOT EXISTS`
- Added idempotent backfill `UPDATE` for the five seed users (`u-l1` → `u-l5`)

**`backend/src/api/schemas.py`**
- Added `RegisterIn`, `UserPublicOut`, `AgentOut`, `MemberAddIn`

**`backend/src/api/main.py`**
- `POST /auth/register` — creates a new user (L1 fixed), returns `UserPublicOut`
- `GET /auth/users` — lists all users (no auth, login-screen bootstrap)
- `GET /users/me` — returns caller's profile (auth required)
- `POST /projects/{id}/members` — adds a member (manager/project_admin only)
- `GET /projects/{id}/agents` — lists agents accessible to caller's clearance level

### Frontend

**`frontend/lib/api/types.ts`** — Added `UserPublicOut`

**`frontend/lib/api/client.ts`** — Added:
- `registerUser(name, dept?)` → `POST /auth/register`
- `listUsers()` → `GET /auth/users`
- `getMe(userId)` → `GET /users/me` (bootstrap, takes raw userId)
- `fetchUserProjects(userId)` → `GET /projects` (bootstrap, takes raw userId)
- `listProjectAgents(ctx, projectId)` → `GET /projects/{id}/agents`
- `addProjectMember(ctx, projectId, userId, role)` → `POST /projects/{id}/members`
- `getLlmSource(ctx)` → `GET /llm/source`

**`frontend/lib/session-context.tsx`** — Full rewrite: removed all `MOCK_*` imports;
bootstraps via `getMe(userId)` + `fetchUserProjects(userId)` using the stored
`userId` from `localStorage`.

**`frontend/app/(auth)/login/page.tsx`** — Fetches real user list via `listUsers()`

**`frontend/app/(auth)/join/page.tsx`** — Calls `registerUser(name)`, stores returned `id`

**`frontend/components/shell/llm-source-status.tsx`** — Calls `getLlmSource(ctx)` in `useEffect`

**`frontend/components/shell/topbar.tsx`** — Removed `MOCK_PROJECT`

**`frontend/components/chat/chat-stream.tsx`** — Reads `projectId` from `useParams`, overrides
`ctx.membership.project_id` so the correct project is used per-route

**`frontend/components/projects/invite-member.tsx`** — Receives `projectId` prop; loads real users
via `listUsers()`, calls `addProjectMember()`

**`frontend/app/(console)/p/[projectId]/agents/page.tsx`** — `listProjectAgents(ctx, projectId)`

**`frontend/components/data/data-sheet.tsx`** — Removed `MOCK_PROJECT_DATA`/`MOCK_PROJECT`

**`frontend/app/(admin)/admin/overview/page.tsx`** — Loads `listUsers()` + `getLlmSource(ctx)`

---

## Session 2 — Admin Pages: Users, Data, Agents, Audit

### Backend

**`backend/src/api/schemas.py`** — Added `LevelPatchIn`, `AuditEntryOut`, `AdminUserOut`, `AdminAgentOut`

**`backend/src/api/main.py`** — Six new L5-guarded admin endpoints:
- `GET /admin/audit` — queries `audit_log` table (newest 200), derives `severity` from `action`
- `GET /admin/users` — users with real `project_count` via `COUNT` + `LEFT JOIN project_members`
- `PATCH /admin/users/{id}/level` — persists clearance change + writes `audit_log`
- `PATCH /admin/data/{id}/level` — persists data security level change + writes `audit_log`
- `GET /admin/agents` — all agents with `project_name` via JOIN on `projects`
- `PATCH /admin/agents/{id}/level` — persists agent level change + writes `audit_log`

### Frontend

**`frontend/lib/api/types.ts`** — Added `AdminUserOut`, `AdminAgentOut`

**`frontend/lib/api/client.ts`** — Added:
- `getAdminAuditLog(ctx)`, `getAdminUsers(ctx)`, `patchUserLevel(ctx, id, level)`
- `patchDataLevel(ctx, id, level)`, `getAdminAgents(ctx)`, `patchAgentLevel(ctx, id, level)`

**`frontend/app/(admin)/admin/audit/page.tsx`** — Replaced `fullAuditLog()` mock with `getAdminAuditLog(ctx)`

**`frontend/app/(admin)/admin/users/page.tsx`** — Replaced `listUsers()+toUserOut()` with `getAdminUsers(ctx)`;
`handleLevelChange` now calls `patchUserLevel()` with optimistic update + revert on failure

**`frontend/app/(admin)/admin/data/page.tsx`** — `handleLevelChange` calls `patchDataLevel()`;
`dept` field removed from `toAdminDataRow()`

**`frontend/app/(admin)/admin/agents/page.tsx`** — Replaced `adminAgentRows()` with `getAdminAgents()`;
`confirmLevelChange` calls `patchAgentLevel()`

**`frontend/app/(admin)/admin/overview/page.tsx`** — Replaced all three mock calls (`fullAuditLog`,
`adminDataRows`, `adminAgentRows`) with `getAdminAuditLog`, `getAdminAgents`

**`frontend/components/admin/data-table.tsx`** — Removed "부서" column (7→6 columns, colSpan updated)

---

## Session 3 — Admin Infra: Models (real) + Nodes (placeholder)

### Backend

**`backend/src/api/schemas.py`** — Added `LlmEndpointOut` (`id, base_url, model, max_security_level, source`)

**`backend/src/api/main.py`** — Two new L5-guarded endpoints:
- `GET /admin/llm-endpoints` — reads `llm_endpoints` table
- `PATCH /admin/llm-endpoints/{id}/level` — updates `max_security_level` + writes `audit_log`

### Frontend

**`frontend/lib/api/types.ts`** — Added `LlmEndpointOut`

**`frontend/lib/api/client.ts`** — Added `getAdminLlmEndpoints(ctx)`, `patchLlmEndpointLevel(ctx, id, level)`

**`frontend/components/admin/resource-models.tsx`** — Full rewrite as `"use client"`:
fetches real `llm_endpoints` on mount; inline `Select` to change `max_security_level`
with optimistic update + revert on failure

**`frontend/components/admin/resource-nodes.tsx`** — Replaced 3 mock GPU node cards with a
single amber-dot placeholder ("real-time measurement requires infra agent integration")

**`frontend/app/(admin)/admin/infra/page.tsx`** — Added `"use client"` (required by `ResourceModels`)

---

## Session 4 — Agent Builder: clearance gate + real persistence

### Problem

`AgentBuilderSheet` read `MOCK_LLM_ENDPOINTS` (hardcoded `max_security_level: 5`),
so the admin's level change was never reflected. A user with level < 5 always saw
"클리어런스 초과" regardless of the actual DB value. Agent creation was also
frontend-only (no DB write).

### Backend

**`backend/src/api/schemas.py`** — Added `AgentCreateIn` (`name, description, endpoint_id, visibility`)

**`backend/src/api/main.py`** — Two new endpoints:
- `GET /llm-endpoints` — returns endpoints where `max_security_level ≤ principal.level`
  (no admin guard; any authenticated user calls this)
- `POST /projects/{id}/agents` — creates agent in DB; enforces `project_admin` role
  AND `endpoint.max_security_level ≤ principal.level`; sets `security_level` from endpoint

### Frontend

**`frontend/lib/api/client.ts`** — Added `getLlmEndpoints(ctx)`, `createProjectAgent(ctx, projectId, ...)`

**`frontend/components/agents/agent-builder-sheet.tsx`** — Full rewrite:
- Calls `getLlmEndpoints(ctx)` on sheet open (always fresh from DB)
- Endpoint list is pre-filtered server-side — no client-side disabled items
- Calls `createProjectAgent()` to persist agent to DB
- Shows inline error message on failure; loading/submitting states

---

## API Endpoints Added

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | none | Register new user (L1) |
| GET | `/auth/users` | none | All users (login bootstrap) |
| GET | `/users/me` | user | Caller profile |
| POST | `/projects/{id}/members` | manager+ | Add project member |
| GET | `/projects/{id}/agents` | member | Agents ≤ caller level |
| POST | `/projects/{id}/agents` | project_admin | Create agent in DB |
| GET | `/llm-endpoints` | user | Endpoints ≤ caller level |
| GET | `/admin/audit` | L5 | Audit log (newest 200) |
| GET | `/admin/users` | L5 | Users + project_count |
| PATCH | `/admin/users/{id}/level` | L5 | Change user clearance |
| PATCH | `/admin/data/{id}/level` | L5 | Change data security level |
| GET | `/admin/agents` | L5 | All agents (no level filter) |
| PATCH | `/admin/agents/{id}/level` | L5 | Change agent level |
| GET | `/admin/llm-endpoints` | L5 | All LLM endpoints |
| PATCH | `/admin/llm-endpoints/{id}/level` | L5 | Change endpoint max level |

---

## Files Still Using Mock Data

| File | Remaining mock | Reason |
|------|---------------|--------|
| `components/admin/clearance-sheet.tsx` | `MOCK_USER_ACTIVITY` | No per-user activity timeline API yet |
| `components/admin/service-tiles.tsx` | `MOCK_INFRA.services` | No real service health check API |
| `lib/api/mock.ts` | Various `MOCK_*` exports | Still imported by `clearance-sheet`, `service-tiles` |

---

## DB Cleanup (2026-06-16)

Test data accumulated during development was wiped; seed state restored.

| Table | Action |
|-------|--------|
| `data` | 19 test rows deleted; `data-1` security_level reset → L1 |
| `agents` | `agent-d6a5019a5e0d` deleted; `agent-default` security_level reset → L5 |
| `users` | 4 test users deleted (+ 13 sessions, messages, project_members, artifacts) |
| `llm_endpoints` | `ep-onprem` max_security_level reset → L5 |
| `audit_log` | 78 test entries cleared |

**Remaining seed state:**

| Row | Level |
|-----|-------|
| data-1 (공개 문서 샘플) | L1 |
| data-2 (내부 보고서 샘플) | L3 |
| data-3 (극비 분석 샘플) | L5 |
| agent-default | L5 |
| ep-onprem | L5 (max_security_level) |
| u-l1 ~ u-l5 | L1 ~ L5 |

---

## D.A.P Feature List

> Current implementation status as of 2026-06-16. Phase numbers match `ROADMAP.md`.

### P1 — Document Parsing (`backend/src/parsing/`)
- PDF → `ParsedDocument` (text blocks + table extraction via pdfplumber)
- Excel → `ParsedDocument` (sheet-by-sheet, header-row table detection)
- Produces standard `ParsedDocument(blocks, tables, meta)` output

### P2 — Chunking + Metadata Tagging (`backend/src/chunking/`)
- Sliding-window text chunker with overlap
- Every chunk tagged: `owner_id`, `security_level`, `visibility`, `dept`, `source`, `doc_type`
- `project_id` deliberately excluded from chunks — project scope via `project_data` N:M (P13)

### P3 — OpenSearch Indexing (`backend/src/indexing/`)
- Index mapping: BM25 text field + `knn_vector` field (ML Commons embedding) + keyword filter fields
- Idempotent upsert; chunk count tracked in `data` table

### P4 — Hybrid Search (`backend/src/search/`)
- BM25 + k-NN combined with Reciprocal Rank Fusion (RRF)
- Pre-filter injected at query time: ① `data_id ∈ project_data` (project isolation) ② `security_level ≤ ctx.level` ③ `visibility=shared OR owner_id=caller`
- `search(query, *, ctx: SessionContext)` — `ctx` is required by type signature; no post-filtering

### P5 — LLM Client + Agent (`backend/src/llm/`, `backend/src/agents/`)
- vLLM client with OpenAI-compatible endpoint; level→endpoint routing via `llm_endpoints` table
- LLM source global toggle (on-prem ↔ cloud) — admin-only, writes audit_log on every switch
- Basic LangGraph agent: query → search → generate → answer
- Security level isolation: one agent per level, cross-level data access blocked in code

### P6 — Auth / Session (`backend/src/auth/`, `backend/src/projects/`)
- MVP: `X-Session-Token: sso-{user_id}` header → `Principal(user_id, level)` (no real SSO yet)
- `SessionContext = Principal + ProjectMembership(project_id, role) + active_agent_id`
- All search/generate/tool paths require `SessionContext`; bare `Principal` alone is rejected

### P7 — Chat UI (`frontend/app/(console)/p/[projectId]/chat/`)
- Multi-data selector (attach from library) + single agent selector per session
- SSE streaming answer display with citation source list
- Per-route project context injected via `useParams` → `ctx.membership.project_id`

### P8 — User Console: Management & Builder (`frontend/app/(console)/`)
- **Data library**: upload → parse → chunk → index pipeline; per-file security level + visibility
- **Project management**: create project, invite members (manager+), view member roster
- **Agent builder** (project_admin only): select LLM endpoint → security level auto-assigned from endpoint; persists to DB; clearance gate enforced server-side
- **Project data attachment**: attach library items to active project (`project_data`)

### P9 — Admin Console (`frontend/app/(admin)/admin/`)
- **Overview**: recent audit alerts + agent count summary (real DB)
- **Users**: list all users with real project_count; change clearance level (L1–L5) with optimistic update + DB persist + audit_log write
- **Data**: list all library data; change security level with persist + audit_log
- **Agents**: list all agents system-wide; change agent security level with persist + audit_log
- **Audit**: live audit log (newest 200), severity derived from action type (crit/warn/info)
- **Infra / Models**: real `llm_endpoints` from DB; editable serving clearance level; node resource panel (placeholder until infra agent integration)

### P13 — Projects, RBAC, Sessions (`backend/src/projects/`, `backend/src/sessions/`)
- Projects as first-class isolation units; roles: `viewer / member / editor / manager / project_admin`
- `project_data` N:M table links library data to projects (data uploaded to library, not per-project)
- Sessions: one active project + one active agent per session; `available_agents` auto-derived from project membership ∩ clearance level
- `POST /auth/register` (L1 fixed) + `GET /auth/users` for MVP login bootstrap

---

*Updated 2026-06-16*
