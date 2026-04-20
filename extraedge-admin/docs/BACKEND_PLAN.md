# ExtraaEdge Admin — Backend Plan (Full-Feature Spec)

**Companion to:** [FEATURE_PLAN.md](./FEATURE_PLAN.md)
**Audience:** Backend team (or agent) building the server for every feature the frontend has.
**Goal:** One document that tells a developer what to build, in what order, and with what schema — end to end.

---

## 1. Locked Decisions

| Decision | Choice |
|---|---|
| Backend stack | **Node.js + Express + PostgreSQL** |
| Language style | **ES modules** (`"type": "module"`), **functional** (no classes), `import`/`export` only |
| Architecture | **Single-repo monolith**, clean module boundaries |
| Multi-tenancy | **Database-per-tenant** (one DB per institute + one shared `system` DB) |
| Hosting | **Self-hosted VPS only.** No AWS RDS/API Gateway/Lambda/CloudWatch. No Docker. |
| Postgres | **Installed natively on the VPS.** Nightly `pg_dump` → Cloudflare R2. |
| Redis + queue | **Redis on the VPS** + **BullMQ**. Redis is **optional** — if absent, queue falls back to in-process `setImmediate`. |
| Object storage | **Cloudflare R2** (free egress). All file uploads go through a generic `/uploads` endpoint. |
| Email | **Brevo** (transactional + template sends) |
| SMS / OTP | **MessageCentral** |
| WhatsApp | **WABridge** |
| Payments | **Razorpay** |
| Telephony (audio calls only) | **Exotel** — no video calls in scope |
| Logs | pino → rotating files (logrotate). Optional ship to Axiom / Better Stack free tier. |
| Reverse proxy / TLS | **Nginx + certbot** on the VPS |
| Process supervision | **systemd** units (or pm2 if the team prefers) |

### Out of scope
- Frontend changes
- IaC
- Microservice extraction
- Video calls (explicitly dropped)
- AWS managed services (explicitly dropped)
- Docker / docker-compose (explicitly dropped)

### Roles (final)
- **Platform role** (in `system` DB, `platform_users.role`):
  - `product_owner` — single top-level admin. Provisions tenants, grants access, manages plans. **Only `product_owner` can create tenants.**
  - `support_admin` — Devifai support staff. Can impersonate + read, cannot bill/suspend.
- **Tenant roles** (in tenant DB, `users.role`):
  - `super_admin` — institute owner. Runs users/settings inside a tenant. **Exempt from work-time tracking** (see §14).
  - `sales_manager` — sees own + team leads via `manager_id` hierarchy.
  - `counsellor` — sees own leads.

---

## 2. Repo Layout

New repo: **`extraedge-backend`**.

```
extraedge-backend/
├── package.json              # "type": "module"
├── .env.example
├── .nvmrc
├── README.md                 # native-VPS setup, no Docker
├── src/
│   ├── index.js              # bootstrap
│   ├── app.js                # express wiring
│   ├── config/
│   │   ├── env.js            # zod-validated env loader
│   │   └── constants.js
│   ├── db/
│   │   ├── system.js         # system DB pool
│   │   ├── tenant.js         # LRU-cached per-tenant pool factory
│   │   └── migrations/
│   │       ├── system/
│   │       └── tenant/
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── tenant.js
│   │   ├── rbac.js
│   │   ├── validate.js
│   │   ├── error.js
│   │   ├── requestId.js
│   │   ├── rateLimit.js
│   │   ├── idleGuard.js          # enforces 15-min idle logout (§14)
│   │   ├── workTracker.js        # records active-minute buckets (§14)
│   │   └── optimisticLock.js     # If-Match header check using updated_at
│   ├── modules/
│   │   ├── auth/
│   │   ├── tenants/              # product_owner only
│   │   ├── platform-users/       # product_owner + support_admin mgmt
│   │   ├── impersonation/        # support log-in-as tenant user
│   │   ├── users/
│   │   ├── teams/                # NEW — team/department entity
│   │   ├── roles-permissions/
│   │   ├── dropdowns/
│   │   ├── programs/
│   │   ├── leads/
│   │   ├── lead-sources/
│   │   ├── lead-assignments/
│   │   ├── lead-activities/
│   │   ├── lead-notes/
│   │   ├── lead-score/
│   │   ├── lead-tags/            # NEW — tags/labels
│   │   ├── duplicates/           # NEW — detection + merge
│   │   ├── assignment-rules/
│   │   ├── saved-filters/
│   │   ├── follow-ups/           # includes recurrence
│   │   ├── raw-data/
│   │   ├── bulk-ingestion/       # upload + preview/validate + exports
│   │   ├── uploads/              # NEW — generic /uploads (signed R2 URL)
│   │   ├── search/
│   │   ├── calls/                # audio only, with recording ref
│   │   ├── communications/       # email/sms/wa templates (incl. language)
│   │   ├── whatsapp/             # quota, inbox, session
│   │   ├── campaigns-bulk/
│   │   ├── campaigns-drip/
│   │   ├── scheduled-sends/      # NEW — one-off scheduled messages
│   │   ├── remarketing/
│   │   ├── workflows/
│   │   ├── template-variables/   # NEW — unified variable registry
│   │   ├── notifications/
│   │   ├── notification-preferences/   # NEW — explicit schema
│   │   ├── payments/
│   │   ├── subscriptions/
│   │   ├── integrations/
│   │   ├── outbound-webhooks/    # NEW — tenants subscribe to events
│   │   ├── calendar/             # NEW — business hours + holidays
│   │   ├── tickets/
│   │   ├── analytics/
│   │   ├── reports/              # NEW — PDF export for dashboard + lead
│   │   ├── work-sessions/        # NEW — work-time tracking
│   │   └── audit-log/
│   ├── workers/
│   │   ├── bulk-import-worker.js
│   │   ├── bulk-export-worker.js
│   │   ├── campaign-runner.js
│   │   ├── drip-scheduler.js
│   │   ├── scheduled-send-runner.js
│   │   ├── workflow-executor.js
│   │   ├── rule-processor.js
│   │   ├── notification-worker.js
│   │   ├── email-sender.js       # Brevo
│   │   ├── sms-sender.js         # MessageCentral
│   │   ├── whatsapp-sender.js    # WABridge
│   │   ├── outbound-webhook-dispatcher.js
│   │   ├── pdf-report-worker.js
│   │   └── duplicate-scanner.js
│   ├── lib/
│   │   ├── jwt.js
│   │   ├── logger.js             # pino
│   │   ├── r2.js                 # Cloudflare R2 (S3-compatible SDK)
│   │   ├── queue.js              # BullMQ wrapper + in-process fallback
│   │   ├── redis.js              # optional
│   │   ├── csv.js
│   │   ├── templating.js         # {{Lead.FullName}} substitution
│   │   ├── otp.js                # MessageCentral OTP send/verify
│   │   ├── pdf.js                # PDF generation (pdfkit or @react-pdf/renderer)
│   │   ├── rrule.js              # recurrence expansion
│   │   ├── providers/
│   │   │   ├── email-brevo.js
│   │   │   ├── sms-messagecentral.js
│   │   │   ├── whatsapp-wabridge.js
│   │   │   ├── payment-razorpay.js
│   │   │   └── telephony-exotel.js
│   │   └── errors.js             # factory functions, not classes
│   └── utils/
└── scripts/
    ├── provision-tenant.js
    ├── run-migrations.js
    ├── create-product-owner.js   # bootstraps the single product_owner
    ├── backup-all-dbs.sh         # pg_dump every DB → R2
    └── seed-dev.js
```

Module shape (unchanged): `routes.js` · `controller.js` · `service.js` · `repo.js` · `schema.js` · `README.md`. Controllers never touch SQL, repos never touch req/res.

### Local dev runtime (no Docker)
- Install Postgres 15+ and Redis 7 natively (`brew install postgresql@15 redis` / `apt install postgresql-15 redis`).
- `npm run setup` → creates `extraedge_system` + `tenant_dev`, runs migrations, seeds a product_owner + demo tenant super_admin.
- `npm run dev` → Express on `:4000`.
- Redis absent? Set `QUEUE_DRIVER=inprocess` and skip it.

---

## 3. Database-per-Tenant

### 3a. System DB — `extraedge_system`
- `platform_users` (product_owner + support_admin)
- `tenants` (full ERD fields + `db_connection_ref` encrypted)
- `plans` (subscription tiers)
- `platform_audit_log`
- `impersonation_sessions` (who logged in as whom, when, why)
- `tenant_dns` / `tenant_subdomains` (reserved; phase 5 when whitelabel)

### 3b. Tenant DB — `tenant_<slug>`
Full schema in §4.

### 3c. Tenant resolution
Request → Nginx (subdomain `speedup.productivo.in`) → `middleware/tenant.js`:
1. Extract slug from subdomain or `X-Tenant-Slug` header.
2. Query `system.tenants` (cached 5 min TTL).
3. Reject unless `status = 'active'`.
4. Get-or-create `pg.Pool` in LRU cache (max 50 pools).
5. Attach `req.tenant`, `req.db`.
6. `auth.js` verifies JWT → `req.user`.
7. `idleGuard.js` enforces 15-min idle → 401 (§14).
8. `workTracker.js` records activity minute (skips super_admin).

### 3d. Provisioning (`POST /platform/tenants`) — product_owner only
1. Validate slug unique.
2. `CREATE DATABASE tenant_<slug>` as superuser.
3. Run `migrations/tenant/*`.
4. Seed defaults: stages, sub-stages, channels/sources/campaigns/mediums, default email/SMS starter templates, default business hours (Mon–Sat 10–19, Asia/Kolkata), first `super_admin` user.
5. Insert `system.tenants` row (encrypted conn ref).
6. Email welcome + first-login creds.

### 3e. Migrations
`node-pg-migrate`. Two sets: `system/`, `tenant/`. `scripts/run-migrations.js --target tenant` fans out across every tenant DB. Additive-only rule.

### 3f. Backups
`scripts/backup-all-dbs.sh` nightly via cron:
- `pg_dump` each tenant DB + system DB
- gzip → upload to Cloudflare R2 bucket `extraedge-backups/YYYY-MM-DD/`
- 30-day retention (R2 lifecycle rule)

### 3g. Soft-delete policy
Consistent `deleted_at timestamptz null` on every mutable entity: `users`, `teams`, `programs`, `leads`, `lead_notes`, `programs`, `email_templates`, `sms_templates`, `whatsapp_templates`, `campaigns_bulk`, `campaigns_drip`, `workflows`, `assignment_rules`, `integrations`, `tags`, `saved_filters`, `scheduled_sends`, `outbound_webhooks`. Every `SELECT` in repos adds `WHERE deleted_at IS NULL` by default; an explicit `includeDeleted` flag bypasses it for admin screens.

### 3h. Optimistic concurrency
Every mutable row gets `updated_at timestamptz`. Writes require header `If-Match: <updated_at ISO>`. If mismatch → 409 `CONCURRENT_MODIFICATION`. Enforced by `middleware/optimisticLock.js` on all `PUT`/`PATCH`/`DELETE` routes for these entities.

---

## 4. Complete Tenant-DB Schema

### 4a. Users & access
```sql
users (
  id uuid pk,
  email citext unique, phone text, name text, avatar_r2_key text,
  password_hash text,
  role text,                              -- super_admin | sales_manager | counsellor
  manager_id uuid fk users(id),
  team_id uuid fk teams(id) null,
  is_active boolean default true,
  last_login_at timestamptz,
  permissions_json jsonb,
  session_timeout_minutes int default 15, -- §14
  track_work_time boolean default true,   -- false for super_admin
  created_at, updated_at, deleted_at
)

teams (                                   -- NEW
  id uuid pk, name, description,
  manager_id uuid fk users(id),
  parent_team_id uuid fk teams(id),       -- departments > sub-teams
  created_at, updated_at, deleted_at
)

team_members (team_id fk, user_id fk, joined_at, primary key (team_id, user_id))

user_sessions (id pk, user_id fk, refresh_token_hash, last_activity_at, issued_at, expires_at, revoked_at, ip, user_agent)
user_refresh_tokens (id pk, user_id fk, token_hash, expires_at, rotated_from uuid, revoked_at)

work_sessions (                           -- NEW §14
  id pk, user_id fk,
  started_at, ended_at,
  active_minutes int,                     -- distinct-minute-buckets observed
  idle_logout boolean,                    -- true if ended by idleGuard
  created_at
)
CREATE INDEX ON work_sessions (user_id, started_at DESC);

work_activity_minutes (                   -- raw bucket ledger
  user_id fk, minute_bucket timestamptz,
  primary key (user_id, minute_bucket)
)
```

### 4b. Dropdowns
(unchanged from previous version: lead_stages, lead_sub_stages, lead_channels, lead_sources_dict, lead_campaigns_dict, lead_mediums, countries, states, genders, degrees, specializations, universities — all with `deleted_at`)

### 4c. Programs
(unchanged; add `deleted_at`, `updated_at`)

### 4d. Leads & related
```sql
leads (
  id uuid pk,
  name, first_name, last_name, alternate_first_name,
  email citext, alternate_email citext,
  phone text, whatsapp_number text, alternate_contact text,
  gender, language text default 'en',    -- preferred language for comms
  ug_degree_id fk, ug_specialization_id fk, ug_university_id fk, ug_graduation_year int,
  pg_degree_id fk, pg_specialization_id fk, pg_university_id fk, pg_graduation_year int,
  country_id fk, state_id fk, district, city, address, pincode,
  program_id uuid fk,
  stage_id fk, sub_stage_id fk,
  remarks, closure_remarks,
  assigned_to uuid fk users(id),
  team_id uuid fk teams(id),             -- denormalized from assigned_to.team
  created_by uuid fk users(id),
  lead_score numeric default 0,
  lead_score_manual_override numeric null,
  engagement_score numeric default 0,
  lead_value text,
  mobile_verified_at timestamptz,
  email_verified_at timestamptz,
  is_cold boolean default false,
  converted_at timestamptz,
  merged_into_id uuid fk leads(id) null, -- set when this lead was merged away
  created_at, updated_at, deleted_at, last_activity_at
)
CREATE INDEX ON leads (stage_id);
CREATE INDEX ON leads (assigned_to);
CREATE INDEX ON leads (team_id);
CREATE INDEX ON leads USING gin (to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(email,'') || ' ' || coalesce(phone,'')));
CREATE INDEX ON leads (phone) WHERE deleted_at IS NULL;
CREATE INDEX ON leads (email) WHERE deleted_at IS NULL;

lead_family (id pk, lead_id fk unique, father_name, father_mobile, father_email, mother_name, mother_mobile, mother_email)

lead_source_attributions (id pk, lead_id fk, channel_id fk, source_id fk, campaign_id fk, medium_id fk, captured_at, is_primary)

lead_assignments (
  id pk, lead_id fk,
  from_user_id fk users(id) null,
  assigned_to fk users(id),
  assigned_by fk users(id),
  assignment_type text,                  -- assign | reassign | auto_assign | refer
  reason text,
  is_active boolean,
  status text,
  created_at
)
CREATE UNIQUE INDEX one_active_assignment_per_lead ON lead_assignments (lead_id) WHERE is_active;

lead_activities (id pk, lead_id fk, user_id fk null, type text, summary, metadata_json jsonb, created_at)

lead_notes (id pk, lead_id fk, user_id fk, body, visibility text, attachments jsonb, created_at, updated_at, deleted_at)

lead_followups (                         -- recurrence added
  id pk, lead_id fk,
  next_action_datetime timestamptz,
  comment, stage_id fk null, sub_stage_id fk null,
  status text,                           -- planned | done | missed | cancelled
  created_by fk users(id),
  completed_at, completed_by,
  recurrence_rule text null,             -- RRULE string (RFC 5545), e.g. "FREQ=WEEKLY;BYDAY=MO;COUNT=4"
  recurrence_parent_id fk lead_followups(id) null,
  recurrence_end timestamptz null,
  created_at, updated_at, deleted_at
)

lead_score_config (id pk, name, criterion, condition_json jsonb, points int, is_active, deleted_at)

tags (                                   -- NEW
  id uuid pk, name text unique, color text,
  created_by fk, created_at, deleted_at
)

lead_tags (lead_id fk, tag_id fk, assigned_by fk, assigned_at, primary key (lead_id, tag_id))

-- duplicates
lead_duplicate_matches (                 -- populated by duplicate-scanner worker
  id pk,
  lead_a_id fk leads(id),
  lead_b_id fk leads(id),
  match_on text,                         -- phone | email | whatsapp | composite
  confidence numeric,                    -- 0..1
  status text,                           -- open | ignored | merged
  reviewed_by fk users(id) null,
  reviewed_at,
  created_at
)
CREATE INDEX ON lead_duplicate_matches (status) WHERE status = 'open';

lead_merge_log (
  id pk,
  surviving_lead_id fk leads(id),
  merged_lead_id fk leads(id),
  merged_by fk users(id),
  field_decisions_json jsonb,            -- for each conflicting field, which value won
  activity_count_transferred int,
  note_count_transferred int,
  message_count_transferred int,
  created_at
)

saved_filters (id pk, user_id fk, name, filter_json jsonb, is_shared, created_at, updated_at, deleted_at)
```

### 4e. Assignment rules + round-robin state
```sql
assignment_rules (
  id pk, name, priority int,
  condition_json jsonb,
  strategy text,                         -- round_robin | load_balanced | by_geography | by_program | specific_user | team_round_robin
  target_users uuid[],
  target_team_id uuid fk teams(id) null,
  fallback_user_id fk users(id),
  respect_working_hours boolean default true,
  is_active boolean, created_at, updated_at, deleted_at
)

assignment_rule_state (                  -- NEW — persists round-robin cursor
  rule_id uuid pk fk assignment_rules(id),
  last_assigned_user_id uuid fk users(id),
  last_assigned_at timestamptz,
  total_assignments int default 0
)
```

### 4f. Communications (+ language)
```sql
email_templates (
  id pk, name, subject, body_html, body_text,
  variables text[],                      -- extracted for UI hints
  language text default 'en',            -- NEW — en | hi | ...
  category text, status text, is_visible boolean,
  builder_type text, created_by fk,
  created_at, updated_at, deleted_at
)
CREATE INDEX ON email_templates (language) WHERE deleted_at IS NULL;

sms_templates (
  id pk, name, body,
  dlt_template_id text,                  -- MessageCentral DLT
  dlt_entity_id text,
  variables text[], language text default 'en',
  is_visible boolean, created_by fk,
  created_at, updated_at, deleted_at
)

whatsapp_templates (
  id pk,
  wabridge_template_name text,           -- WABridge-registered name
  language text,                         -- WA templates are language-tagged upstream
  category text,                         -- MARKETING | UTILITY | AUTHENTICATION
  body, footer, header_type, buttons_json jsonb, variables text[],
  status text,                           -- APPROVED | PENDING | REJECTED (synced from WABridge)
  is_visible boolean, created_by fk,
  created_at, updated_at, deleted_at
)

template_variables (                     -- NEW — unified registry
  id pk,
  key text unique,                       -- e.g. lead.full_name, counsellor.name, program.name, tenant.name
  label text, example text,
  resolver_function text,                -- name of fn in templating.js that resolves it at send time
  scope text[]                           -- which channels allow it: email, sms, whatsapp
)

message_log (                            -- unified outbound
  id pk, lead_id fk, user_id fk,
  channel text,                          -- email | sms | whatsapp
  template_id uuid null,
  language text,
  recipient text,
  provider text,                         -- brevo | messagecentral | wabridge
  provider_message_id text,
  status text,                           -- queued | sent | delivered | failed | seen | clicked | bounced | unsubscribed
  error text null,
  campaign_id uuid null,
  workflow_run_id uuid null,
  scheduled_send_id uuid null,
  scheduled_for timestamptz,
  sent_at, delivered_at, seen_at, clicked_at, failed_at
)

message_reply (id pk, lead_id fk, channel, provider_message_id, body, media_urls text[], received_at, routed_to_user_id fk)

-- compliance
suppression_list (
  id pk, channel text, address text,    -- email | phone
  reason text,                           -- unsubscribe | hard_bounce | stop_keyword | complaint
  source text,                           -- webhook provider or manual
  created_at
)
CREATE UNIQUE INDEX ON suppression_list (channel, lower(address));

optin_log (
  id pk, lead_id fk, channel text,
  optin_source text,                     -- form | import | api | verbal
  opted_in_at timestamptz,
  opted_out_at timestamptz null
)
```

### 4g. WhatsApp quota & subscription
(unchanged from previous version — `whatsapp_numbers`, `whatsapp_quota`, `subscription_credits`, `credit_transactions`; provider field now `wabridge`)

### 4h. Scheduled one-off sends (NEW)
```sql
scheduled_sends (
  id pk, user_id fk,
  channel text,                          -- email | sms | whatsapp
  template_id uuid,
  lead_ids uuid[],                       -- recipients
  variable_overrides_json jsonb,
  scheduled_for timestamptz,
  status text,                           -- scheduled | running | completed | cancelled | failed
  respects_business_hours boolean default true,
  created_at, updated_at, deleted_at
)
```

Handler: `scheduled-send-runner` BullMQ worker polls `scheduled_for <= now()` every minute, enqueues per-lead send jobs into the relevant channel worker queue.

### 4i. Campaigns (bulk + drip)
(unchanged from previous version; channel providers now brevo/messagecentral/wabridge)

### 4j. Workflows / automation
(unchanged — workflows, workflow_nodes, workflow_edges, workflow_runs, workflow_run_events)

### 4k. Payments
(unchanged; provider=razorpay)

### 4l. Calls (audio only — no video)
```sql
calls (
  id pk, lead_id fk, user_id fk,
  direction text,                        -- outbound | inbound
  status text,                           -- scheduled | ringing | answered | completed | missed | no_answer | failed
  duration_seconds int,
  recording_r2_key text null,            -- R2 object key; playback URL generated via signed URL on demand
  recording_duration_seconds int null,
  recording_stored_at timestamptz null,  -- when recording was persisted
  recording_size_bytes bigint null,
  provider text default 'exotel',
  provider_call_id text,
  remarks text,
  disposition_code text null,               -- FK to call_dispositions.code — required on completed calls
  disposition_category text null,           -- positive | neutral | negative (denormalized)
  callback_requested_at timestamptz null,   -- set when disposition=Callback_Requested
  scheduled_for, started_at, ended_at,
  created_at, updated_at, deleted_at
)
CREATE INDEX ON calls (lead_id, started_at DESC);
CREATE INDEX ON calls (user_id, started_at DESC);
CREATE INDEX ON calls (disposition_code);
```

**Recording storage**: Exotel posts the recording URL via webhook when the call ends. `calls/controller.js` downloads the file, uploads to Cloudflare R2 under `calls/<tenant>/<YYYY>/<MM>/<call_id>.mp3`, stores the R2 key in `calls.recording_r2_key`. **Metadata (including the R2 ref) is in Postgres; the audio blob lives in R2.** Playback: `GET /calls/:id/recording` returns a short-lived signed R2 URL (5-min TTL).

### 4m. Notifications + preferences
```sql
notifications (id pk, user_id fk, type, message, metadata_json jsonb, link text, is_read boolean default false, created_at)
CREATE INDEX ON notifications (user_id, is_read, created_at DESC);

notification_preferences (               -- NEW
  user_id uuid pk fk users(id),
  in_app boolean default true,
  email boolean default true,
  sms boolean default false,
  whatsapp boolean default false,
  push boolean default false,
  digest_frequency text default 'immediate',  -- immediate | hourly | daily
  quiet_hours_start time null,
  quiet_hours_end time null,
  quiet_hours_tz text,
  event_overrides jsonb default '{}'     -- per-event type toggle { "follow_up_due": { "sms": true } }
)
```

Real-time push via **SSE** at `GET /notifications/stream`.

### 4n. Integrations, inbound webhooks, outbound webhooks
```sql
integrations (id pk, type, name, credentials_encrypted jsonb, config_json jsonb, status, last_health_check_at, last_error, created_by, created_at, updated_at, deleted_at)

inbound_webhooks (id pk, integration_id fk, secret_token, field_mapping_json jsonb, default_channel, default_source, default_stage, hit_count, last_hit_at)
webhook_events (id pk, integration_id fk, event_type, payload_json jsonb, processed_at, status, error)

outbound_webhooks (                      -- NEW — tenants subscribe to events
  id pk, name text,
  target_url text, secret text,
  event_types text[],                    -- e.g. ['lead.created','lead.stage_changed','payment.succeeded']
  is_active boolean,
  custom_headers_json jsonb,
  retry_config_json jsonb,               -- { max: 5, backoff_ms: [30s, 2m, 10m, 1h, 6h] }
  created_by fk, created_at, updated_at, deleted_at
)

outbound_webhook_deliveries (
  id pk, webhook_id fk,
  event_id uuid, event_type text,
  payload_json jsonb, signature text,
  attempt int, status text,              -- pending | delivered | failed | dead
  response_code int, response_body text,
  scheduled_for, delivered_at, failed_at,
  next_retry_at timestamptz null
)
CREATE INDEX ON outbound_webhook_deliveries (status, next_retry_at) WHERE status IN ('pending','failed');
```

Dispatcher: `outbound-webhook-dispatcher` worker consumes every internal event, fans out to matching `outbound_webhooks`, signs body with HMAC-SHA256(secret, rawBody), retries per config.

### 4o. Business calendar (NEW)
```sql
business_hours (
  id pk,
  day_of_week int,                       -- 0=Sun .. 6=Sat
  open_time time, close_time time,
  is_open boolean default true,
  timezone text default 'Asia/Kolkata'
)

holidays (
  id pk, date date, name text,
  is_full_day boolean default true,
  created_at, deleted_at
)
```

Follow-up scheduling, drip sends, and campaigns with `respect_working_hours=true` call `service/calendar.js::nextBusinessMoment(date)` which skips holidays and rolls into the next open slot.

### 4p. Bulk ingestion (+ preview)
```sql
bulk_import_previews (                   -- NEW — validate-only, TTL'd
  id pk, user_id fk,
  file_r2_key text,
  field_mapping_json jsonb,
  defaults_json jsonb,
  total_rows int, valid_rows int, invalid_rows int, duplicate_rows int,
  sample_errors_json jsonb,              -- first 50 errors for UI
  duplicate_matches_json jsonb,          -- sample of phones/emails matching existing leads
  expires_at timestamptz,                -- 24h TTL
  created_at
)

bulk_imports (
  id pk, user_id fk,
  preview_id uuid fk bulk_import_previews(id) null,
  source text,                           -- csv | webhook | api
  file_r2_key text, file_name text, file_size int,
  field_mapping_json jsonb, defaults_json jsonb,
  total_rows int, success_rows int, failed_rows int, duplicate_rows int,
  duplicate_handling text,               -- skip | update_existing | create_new
  status text,
  send_welcome_email boolean, send_welcome_sms boolean,
  created_at, started_at, completed_at
)

bulk_import_failures (id pk, import_id fk, row_number int, raw_row_json jsonb, error_code, error_message, retried_at, retry_import_id fk)

bulk_exports (id pk, user_id fk, filter_json jsonb, columns text[], cc_emails text[], bcc_emails text[], status, file_r2_key, row_count, created_at, completed_at)
```

### 4q. Uploads (NEW — generic file uploads)
```sql
uploaded_files (
  id pk, user_id fk null,                -- null for pre-auth uploads (rare)
  r2_key text,                           -- final object key in R2
  r2_bucket text,
  content_type text, size_bytes bigint,
  checksum_sha256 text,
  purpose text,                          -- avatar | brochure | note_attachment | ticket_attachment | template_asset | csv_import | export_result | recording
  ref_entity_type text null,             -- leads | users | programs | tickets | lead_notes
  ref_entity_id uuid null,
  visibility text,                       -- private | tenant | public_signed
  uploaded_at timestamptz,
  deleted_at timestamptz null
)
CREATE INDEX ON uploaded_files (ref_entity_type, ref_entity_id);
```

Flow: `POST /uploads/presign` → returns `{ uploadUrl, r2_key, headers, expiresAt }`. Client PUTs file directly to R2. Client calls `POST /uploads/confirm` with `r2_key` + metadata → row inserted into `uploaded_files`, returns `file_id` the caller can attach to the parent entity.

### 4r. Tickets
(unchanged; attachments now reference `uploaded_files.id`)

### 4s. Audit log
(unchanged; now also logs impersonation events)

### 4t. Impersonation (system DB)
```sql
impersonation_sessions (
  id pk,
  platform_user_id uuid fk platform_users(id),
  tenant_id uuid fk tenants(id),
  tenant_user_id uuid,                   -- target user in tenant DB
  reason text,                           -- required — support ticket id, etc.
  started_at, ended_at,
  ip, user_agent,
  read_only boolean default true         -- product_owner can override to read_only=false
)
```

JWTs issued during impersonation carry `impersonatedBy: <platform_user_id>` claim; every write while impersonating is tagged in tenant `audit_log` with the platform user's id.

### 4u. Call dispositions (NEW)

```sql
call_dispositions (                      -- seeded; tenant can add/reorder
  id pk,
  code text unique,                      -- Connected | RNR | Busy | Wrong_Number | Language_Barrier | Not_Interested | Callback_Requested | Demo_Scheduled | Enrolled
  label text,
  category text,                         -- positive | neutral | negative
  requires_callback boolean default false,  -- Callback_Requested forces callback_at + follow-up creation
  auto_create_followup_hours int null,   -- e.g. 24 → auto-schedule follow-up 24h after Callback_Requested
  is_active boolean default true,
  order_index int,
  created_at, deleted_at
)
```
Default seed on tenant provision: the 9 codes above, `Callback_Requested.requires_callback=true, auto_create_followup_hours=24`. Drip rules + workflows can trigger on `call.completed` events filtered by disposition.

### 4v. Custom fields per tenant (NEW)

```sql
custom_field_definitions (
  id pk,
  entity text,                           -- lead | user | program
  key text,                              -- snake_case; becomes JSON key in responses
  label text,
  field_type text,                       -- text | number | select | multiselect | date | boolean | url | email | textarea
  options_json jsonb,                    -- for select/multiselect: [{ value, label }]
  validation_json jsonb,                 -- { min, max, regex, required }
  is_required boolean default false,
  is_searchable boolean default false,
  show_in_list boolean default false,
  show_in_form_tab text null,            -- groups fields into existing tabs of AddNewLead
  order_index int,
  created_at, updated_at, deleted_at
)
CREATE UNIQUE INDEX ON custom_field_definitions (entity, key) WHERE deleted_at IS NULL;

lead_custom_values (
  lead_id uuid fk leads(id),
  field_id uuid fk custom_field_definitions(id),
  value jsonb,                           -- typed by field.field_type
  updated_at timestamptz,
  primary key (lead_id, field_id)
)
CREATE INDEX ON lead_custom_values USING gin (value);
```
Lead CRUD returns/accepts `custom_values: { [key]: value }`. Validator loads definitions on each write and enforces `is_required`/`validation_json`. `is_searchable=true` fields are added to the full-text index. Filter UI auto-renders based on `show_in_list` flag.

### 4w. Field-level permissions (NEW)

```sql
field_permissions (
  id pk,
  role text,                             -- counsellor | sales_manager | super_admin
  entity text,                           -- lead | user | program
  field text,                            -- column name OR custom field key
  permission text,                       -- hidden | readonly | readwrite
  created_at, updated_at
)
CREATE UNIQUE INDEX ON field_permissions (role, entity, field);
```
Every outbound serializer passes response through `applyFieldPermissions(role, entity, payload)` which strips `hidden` fields and tags `readonly` fields on a sidecar meta object so the frontend can disable inputs. Writes rejected with `403 FIELD_READONLY` if the payload touches a readonly field. Defaults (not stored — hardcoded):
- `counsellor`: `lead.email = readonly` when tenant sets `privacy_mode=phone_only` (common for cold-calling teams).
- `counsellor`: `lead.lead_value = hidden`.

### 4x. SLA policies + alerts (NEW)

```sql
sla_policies (
  id pk, name text,
  condition_json jsonb,                  -- { stage_ids: [...], program_ids: [...], assigned_roles: ['counsellor'] }
  no_activity_hours int,                 -- flag if no activity within N hours since last_activity_at
  escalate_after_hours int,              -- notify manager after N hours of being flagged
  action_json jsonb,                     -- [{ type: 'notify', to: 'owner' }, { type: 'notify_manager', after_hours: 48 }]
  is_active boolean,
  created_at, updated_at, deleted_at
)

sla_alerts (
  id pk,
  policy_id fk sla_policies(id),
  lead_id fk leads(id),
  assigned_to fk users(id),
  flagged_at timestamptz,
  escalated_at timestamptz null,
  resolved_at timestamptz null,
  resolved_by fk users(id) null,
  resolution_reason text null            -- activity_logged | manual_resolve | reassigned | stage_changed
)
CREATE INDEX ON sla_alerts (lead_id) WHERE resolved_at IS NULL;
CREATE INDEX ON sla_alerts (assigned_to, resolved_at);
```
`sla-scanner` worker (cron every 10 min) evaluates active policies, inserts new alerts, escalates old ones, and auto-resolves alerts when activity is detected on the lead.

### 4y. User availability / leave (NEW)

```sql
user_availability (
  id pk, user_id fk users(id),
  starts_at timestamptz, ends_at timestamptz,
  type text,                             -- leave | half_day | training | meeting | custom
  note text,
  is_recurring boolean default false,
  recurrence_rule text null,             -- RRULE for weekly off-days etc.
  created_at, updated_at, deleted_at
)
CREATE INDEX ON user_availability (user_id, starts_at, ends_at);
```
Assignment-rules runner filters candidates via `NOT EXISTS (SELECT 1 FROM user_availability WHERE user_id = $1 AND now() BETWEEN starts_at AND ends_at AND deleted_at IS NULL)`. If every candidate is unavailable, falls back to `assignment_rules.fallback_user_id`.

### 4z. Referral tracking (NEW)

```sql
-- ALTER TABLE leads ADD COLUMN referred_by_lead_id uuid fk leads(id) null;
-- ALTER TABLE leads ADD COLUMN referral_code_used text null;
-- ALTER TABLE leads ADD COLUMN referral_source text null;   -- landing_page | counsellor_share | direct | qr

lead_referral_codes (                    -- each lead can mint one or more shareable codes
  id pk,
  lead_id fk leads(id),
  code text unique,                      -- short, URL-safe
  landing_url text,                      -- prefilled with code
  uses_count int default 0,
  max_uses int null,
  expires_at timestamptz null,
  is_active boolean default true,
  created_at, deleted_at
)
CREATE INDEX ON lead_referral_codes (code) WHERE is_active AND deleted_at IS NULL;

referral_policies (                      -- tenant-level: what earns a credit
  id pk, name text,
  trigger text,                          -- lead_created | payment_succeeded | enrolled
  credit_type text,                      -- points | cash | discount | custom
  credit_amount numeric,
  credit_currency text null,
  is_active boolean,
  created_at, updated_at, deleted_at
)

referral_credits (
  id pk,
  referrer_lead_id fk leads(id),
  referred_lead_id fk leads(id),
  policy_id fk referral_policies(id),
  trigger_event text,
  credit_type text,
  credit_amount numeric,
  status text,                           -- pending | credited | revoked
  triggered_at timestamptz,
  credited_at timestamptz null,
  revoked_at timestamptz null,
  revoked_reason text null
)
CREATE INDEX ON referral_credits (referrer_lead_id, status);
```
Worker `referral-crediter` subscribes to `lead.created` and `payment.succeeded` events. If referred lead has `referred_by_lead_id`, matching active `referral_policies` fire and insert `referral_credits`. Status progression: pending → credited (on successful trigger) → revoked (e.g., refunded payment).

### 4aa. Campaign ROI attribution (NEW)

```sql
-- ALTER TABLE leads ADD COLUMN first_touch_campaign_id uuid null;
-- ALTER TABLE leads ADD COLUMN first_touch_channel text null;
-- ALTER TABLE leads ADD COLUMN first_touch_source text null;
-- ALTER TABLE leads ADD COLUMN first_touch_medium text null;
-- ALTER TABLE leads ADD COLUMN first_touch_at timestamptz null;
-- ALTER TABLE leads ADD COLUMN last_touch_campaign_id uuid null;
-- ALTER TABLE leads ADD COLUMN last_touch_channel text null;
-- ALTER TABLE leads ADD COLUMN last_touch_source text null;
-- ALTER TABLE leads ADD COLUMN last_touch_medium text null;
-- ALTER TABLE leads ADD COLUMN last_touch_at timestamptz null;

lead_touches (                           -- raw log: every detectable touch
  id pk, lead_id fk leads(id),
  touch_type text,                       -- impression | click | form_submit | email_open | email_click | sms_click | wa_reply | call | manual
  campaign_id uuid null,
  channel text, source text, medium text,
  metadata_json jsonb,
  occurred_at timestamptz
)
CREATE INDEX ON lead_touches (lead_id, occurred_at DESC);

payment_attributions (                   -- snapshots at conversion time; immutable
  payment_id uuid pk fk payments(id),
  lead_id fk leads(id),
  first_touch_campaign_id uuid, first_touch_channel, first_touch_source, first_touch_at,
  last_touch_campaign_id uuid, last_touch_channel, last_touch_source, last_touch_at,
  amount_attributed_first numeric,       -- split per model
  amount_attributed_last numeric,
  linear_distribution_json jsonb,        -- if linear: [{ campaign_id, weight, amount }]
  attribution_model text,                -- first_touch | last_touch | linear | 50_50
  created_at
)
```
Worker `attribution-snapshotter` fires on `payment.succeeded`, reads `lead_touches`, writes `payment_attributions`. Snapshot ensures later source edits don't rewrite historical ROI. Analytics endpoints read from `payment_attributions` (cheap) — no on-the-fly recomputation.

---

## 5. Complete API Surface

Unchanged sections: auth, platform (see update below), users, dropdowns, programs, leads (with additions), raw-data, failed-leads, follow-ups (with recurrence), saved-filters, search, communications (email/sms/whatsapp), bulk campaigns, drip campaigns, remarketing, workflows, notifications, bulk ops (with preview), payments, subscription, integrations, tickets, analytics.

### 5a. Auth & session (with idle + heartbeat)
```
POST   /auth/login                       [public]
POST   /auth/refresh                     [refresh]
POST   /auth/logout                      [authed]
GET    /auth/me                          [authed]
POST   /auth/forgot-password             [public]
POST   /auth/reset-password              [public]
POST   /auth/change-password             [authed]
GET    /auth/session                     [authed]       last_activity_at, idle_timeout_minutes
POST   /auth/session/heartbeat           [authed]       keep-alive (also emits work-minute bucket)
```

### 5b. Platform (product_owner + support_admin)
```
POST   /platform/tenants                 [product_owner]   provision
GET    /platform/tenants                 [product_owner|support_admin]
PUT    /platform/tenants/:id             [product_owner]
POST   /platform/tenants/:id/suspend     [product_owner]
POST   /platform/tenants/:id/resume      [product_owner]
GET    /platform/plans                   [product_owner]
PUT    /platform/plans/:id               [product_owner]
GET    /platform/audit-log               [product_owner]

# Platform user management
GET    /platform/users                   [product_owner]
POST   /platform/users                   [product_owner]   invite support_admin
PUT    /platform/users/:id               [product_owner]
DELETE /platform/users/:id               [product_owner]

# Impersonation
POST   /platform/impersonate/start       [product_owner|support_admin]   body: { tenant_id, tenant_user_id, reason }
POST   /platform/impersonate/stop        [authed impersonating]
GET    /platform/impersonate/sessions    [product_owner]   history
```

### 5c. Teams (NEW)
```
GET    /teams                            [authed]
POST   /teams                            [super_admin]
GET    /teams/:id                        [authed]
PUT    /teams/:id                        [super_admin]
DELETE /teams/:id                        [super_admin]
POST   /teams/:id/members                [super_admin|team_manager]
DELETE /teams/:id/members/:user_id       [super_admin|team_manager]
GET    /teams/:id/leads                  [manager+|team_member]
```

### 5d. Tags (NEW)
```
GET    /tags                             [authed]
POST   /tags                             [manager+]
PUT    /tags/:id                         [manager+]
DELETE /tags/:id                         [manager+]
POST   /leads/:id/tags                   [authed]    body: { tag_ids }
DELETE /leads/:id/tags/:tag_id           [authed]
GET    /leads?tag_id=                    [authed]    filter
```

### 5e. Duplicates + merge (NEW)
```
POST   /duplicates/check                 [authed]    body: { phone?, email?, whatsapp? }  → matching leads
POST   /duplicates/check-bulk            [manager+]  body: { rows: [{ phone, email, ... }] } → per-row match result
GET    /leads/:id/duplicates             [authed]    lead_duplicate_matches where this lead is A or B
POST   /leads/:id/merge                  [manager+]  body: { merge_into_lead_id, field_decisions, resolve_duplicate_match_id? }
POST   /duplicates/:match_id/ignore      [manager+]
GET    /duplicates                       [manager+]  queue: status=open
```

Duplicate detection rules on create:
- `POST /leads` returns `409 DUPLICATE_DETECTED` with matching lead ids **unless** `?force=true`. Request body optionally sets `on_duplicate: block|warn|merge_into:<id>`.
- Bulk import checks phone + email against existing leads; behavior driven by `duplicate_handling` on the import (`skip | update_existing | create_new`).
- Background `duplicate-scanner` worker runs nightly — populates `lead_duplicate_matches` for fuzzy matches not caught at insert time.

### 5f. Bulk ingestion (+ preview) (UPDATED)
```
POST   /bulk/leads/preview               [manager+]   upload CSV → row-by-row validation + duplicate detection, nothing committed
GET    /bulk/leads/previews/:id          [manager+]   check status / fetch sample errors
POST   /bulk/leads/commit                [manager+]   body: { preview_id, duplicate_handling }  → creates bulk_imports, triggers worker
GET    /bulk/leads/imports               [manager+]
GET    /bulk/leads/imports/:id           [manager+]
GET    /bulk/leads/imports/:id/failures  [manager+]
POST   /bulk/leads/imports/:id/retry-failures  [manager+]
POST   /bulk/leads/download              [manager+]   async → R2 signed URL
GET    /bulk/leads/exports               [manager+]
GET    /bulk/leads/exports/:id/file      [manager+]
POST   /bulk/leads/status-change         [manager+]
POST   /bulk/leads/refer                 [manager+]
```

### 5g. Uploads (NEW)
```
POST   /uploads/presign                  [authed]    body: { purpose, content_type, size_bytes, ref_entity_type?, ref_entity_id? }
POST   /uploads/confirm                  [authed]    body: { r2_key, size_bytes, checksum_sha256 }  → uploaded_files row
GET    /uploads/:id/signed-url           [authed]    playback/download URL (5-min TTL)
DELETE /uploads/:id                      [owner|manager+]
```

Used by: AddNewLead (nothing yet), AddNoteDrawer (attachments), RaiseTicketModal (attachments), email template builder (inline images), program brochure upload, user avatar, CSV import (client uploads to R2 first, then calls `/bulk/leads/preview` with the `r2_key`).

### 5h. Scheduled sends (NEW)
```
POST   /scheduled-sends                  [authed]    body: { channel, template_id, lead_ids, scheduled_for, variables? }
GET    /scheduled-sends                  [authed]
GET    /scheduled-sends/:id              [authed]
DELETE /scheduled-sends/:id              [creator|manager+]   cancel if status=scheduled
```

### 5i. Business calendar (NEW)
```
GET    /calendar/business-hours          [authed]
PUT    /calendar/business-hours          [super_admin]
GET    /calendar/holidays                [authed]
POST   /calendar/holidays                [super_admin]
DELETE /calendar/holidays/:id            [super_admin]
GET    /calendar/next-business-moment?from=…   [authed]   utility
```

### 5j. Notification preferences (NEW schema, existing endpoints)
```
GET    /notifications/preferences        [authed]
PUT    /notifications/preferences        [authed]
```

### 5k. Outbound webhooks (NEW)
```
GET    /outbound-webhooks                [manager+]
POST   /outbound-webhooks                [super_admin]
PUT    /outbound-webhooks/:id            [super_admin]
DELETE /outbound-webhooks/:id            [super_admin]
POST   /outbound-webhooks/:id/test       [super_admin]
GET    /outbound-webhooks/:id/deliveries [super_admin]
POST   /outbound-webhook-deliveries/:id/retry  [super_admin]
```

### 5l. Template-variable registry (NEW)
```
GET    /template-variables               [authed]    ?scope=email|sms|whatsapp
```

### 5m. Calls (audio only; video removed)
```
POST   /calls                            [authed]        log call (manual)
GET    /calls                            [authed]        ?lead_id
GET    /calls/:id                        [authed]
GET    /calls/:id/recording              [authed]        signed R2 URL (5-min TTL)
POST   /calls/click-to-call              [authed]        body: { lead_id }
POST   /calls/webhooks/exotel            [public signed] start/end/recording events
```

### 5n. Reports — PDF (NEW)
```
POST   /reports/leads/:id/pdf            [authed]        async → uploaded_files reference
POST   /reports/dashboard/pdf            [manager+]      body: { date_from, date_to, user_id? } → async
GET    /reports/:job_id                  [authed]        status + download when ready
```

Worker: `pdf-report-worker` uses pdfkit, stores result in R2, inserts `uploaded_files`, returns signed URL.

### 5o. Work sessions (NEW)
```
GET    /work-sessions/me                 [authed]
GET    /work-sessions/me/today           [authed]
GET    /work-sessions                    [manager+]      ?user_id,date_from,date_to
GET    /work-sessions/team-summary       [manager+]
```

### 5p. Custom fields (NEW)
```
GET    /custom-fields                    [authed]        ?entity=lead|user|program
POST   /custom-fields                    [super_admin]
PUT    /custom-fields/:id                [super_admin]
DELETE /custom-fields/:id                [super_admin]
POST   /custom-fields/reorder            [super_admin]
```
Lead CRUD accepts/returns `custom_values: { [key]: value }` alongside standard fields. Validator rejects on unknown keys or type mismatch.

### 5q. Field-level permissions (NEW)
```
GET    /field-permissions                [super_admin]
PUT    /field-permissions                [super_admin]   body: [{ role, entity, field, permission }]
GET    /field-permissions/effective      [authed]        what the current user can see/edit — drives form UI
```

### 5r. Call dispositions (NEW)
```
GET    /calls/dispositions               [authed]
POST   /calls/dispositions               [super_admin]
PUT    /calls/dispositions/:id           [super_admin]
DELETE /calls/dispositions/:id           [super_admin]
POST   /calls/dispositions/reorder       [super_admin]
```
`POST /calls` and `PUT /calls/:id` require `disposition_code` once `status=completed`. Invalid codes → 400. `Callback_Requested` auto-creates a follow-up per `auto_create_followup_hours`.

### 5s. SLA policies + alerts (NEW)
```
GET    /sla-policies                     [manager+]
POST   /sla-policies                     [super_admin]
PUT    /sla-policies/:id                 [super_admin]
DELETE /sla-policies/:id                 [super_admin]
POST   /sla-policies/:id/toggle          [super_admin]
GET    /sla-alerts                       [authed]        ?user_id&status=open|resolved
POST   /sla-alerts/:id/resolve           [owner|manager+]
GET    /sla-alerts/summary               [manager+]      per-user open counts → dashboard card
```

### 5t. User availability / leave (NEW)
```
GET    /users/:id/availability           [self|manager+]
POST   /users/:id/availability           [self|manager+]
PUT    /availability/:id                 [owner|manager+]
DELETE /availability/:id                 [owner|manager+]
GET    /availability/now                 [authed]        currently-unavailable users — used by assignment UI
GET    /availability/calendar            [manager+]      ?user_id&month — planning view
```

### 5u. Referrals (NEW)
```
POST   /leads/:id/referral-codes         [authed]        mint shareable code + landing link
GET    /leads/:id/referral-codes         [authed]
DELETE /referral-codes/:id               [owner|manager+]

GET    /leads/:id/referrals              [authed]        leads this one referred
GET    /leads/:id/referred-by            [authed]        who referred this lead

GET    /referral-policies                [manager+]
POST   /referral-policies                [super_admin]
PUT    /referral-policies/:id            [super_admin]
DELETE /referral-policies/:id            [super_admin]

GET    /referrals                        [manager+]      referral chains with credit totals
GET    /referral-credits                 [manager+]      ?status=pending|credited|revoked
POST   /referral-credits/:id/credit      [manager+]      mark credited (for non-monetary types)
POST   /referral-credits/:id/revoke      [manager+]
```

### 5v. Campaign ROI attribution (NEW)
```
GET    /analytics/attribution            [manager+]      ?campaign_id|channel|source&date_from&date_to — conversions + revenue
GET    /analytics/attribution/models     [manager+]
PUT    /analytics/attribution/model      [super_admin]   body: { default_model: first_touch|last_touch|linear|50_50 }
GET    /leads/:id/touches                [authed]        full touch history
POST   /leads/:id/touches                [system|webhook] record an external touch (pixel, UTM click)
```

### Concurrent-edit handling
Every `PUT`/`PATCH`/`DELETE` on mutable entities (leads, notes, templates, campaigns, workflows, rules, users, teams, tags, programs, assignment_rules, scheduled_sends, outbound_webhooks, saved_filters, follow-ups) **requires** header `If-Match: <updated_at ISO>`. Mismatch → `409 CONCURRENT_MODIFICATION { currentVersion: <updated_at> }`.

### Response envelopes (unchanged)

---

## 6. Auth & RBAC

- JWT HS256, `JWT_SECRET` + `JWT_SECRET_NEXT` rotation.
- Access 15 min, refresh 7 d, rotation on use.
- **Access claims**: `sub`, `tenantId`, `tenantSlug`, `role`, `platformRole`, `impersonatedBy` (null unless impersonating), `trackWork` (false for super_admin), `sessionId`, `iat`, `exp`.
- **Tenant hierarchy**: `users.manager_id` recursive CTE for "my team's leads".
- **Permissions overrides**: `users.permissions_json`, checked after role.
- **Password**: argon2id, 64 MB memory, 3 iterations.
- **Rate limits**: global 100/min/IP (Redis), login 10/15min, password-reset 3/hour/email.
- **Single product_owner invariant**: `CREATE UNIQUE INDEX one_product_owner ON system.platform_users (role) WHERE role='product_owner' AND deleted_at IS NULL;`

---

## 7. Event Bus, Queues, Workers (no SQS / Lambda)

### 7a. Event bus
Every domain write that should trigger downstream work calls `publish(event)` in `lib/queue.js`:
```json
{
  "type": "lead.created" | "lead.stage_changed" | "lead.assigned" | "follow_up.scheduled" | "follow_up.due" | "message.sent" | "message.delivered" | "message.replied" | "payment.succeeded" | "payment.failed" | "call.completed",
  "tenantId": "uuid", "occurredAt": "ISO", "actorUserId": "uuid | null",
  "entityType": "lead|follow_up|message|payment|call",
  "entityId": "uuid", "payload": {}
}
```

Transport:
- **`QUEUE_DRIVER=bullmq`** (default when `REDIS_URL` set) — BullMQ on Redis.
- **`QUEUE_DRIVER=inprocess`** — `setImmediate`, single-process, dev-only.

No SQS. No Lambda.

### 7b. Workers (each a `systemd` service unit on the VPS)

| Worker | Reads from | Writes |
|---|---|---|
| `rule-processor` | all events | `lead_assignments`, `leads.lead_score`, `assignment_rule_state` |
| `workflow-executor` | events matching workflow triggers | `workflow_runs` |
| `drip-scheduler` | cron every 5 min | per-step send jobs |
| `scheduled-send-runner` | cron every minute | per-lead send jobs |
| `campaign-runner` | `campaigns_bulk.launch` | message jobs, `campaigns_bulk_stats` |
| `email-sender` | send jobs | `message_log`, decrement `subscription_credits` |
| `sms-sender` | send jobs | `message_log` |
| `whatsapp-sender` | send jobs | `message_log` |
| `outbound-webhook-dispatcher` | all events | `outbound_webhook_deliveries` |
| `notification-worker` | events | `notifications`, SSE push |
| `bulk-import-worker` | `bulk_imports.queued` | `leads`, `bulk_import_failures` |
| `bulk-export-worker` | `bulk_exports.queued` | CSV → R2 |
| `pdf-report-worker` | report jobs | PDF → R2, `uploaded_files` |
| `duplicate-scanner` | nightly cron | `lead_duplicate_matches` |
| `missed-followup-scanner` | cron every 5 min | flips overdue `lead_followups` → `status=missed`, notifies counsellor + manager |
| `followup-reminder-scheduler` | cron every minute | enqueues notification 15 min before `next_action_datetime` (skips already-reminded) |
| `sla-scanner` | cron every 10 min | evaluates active `sla_policies`, inserts `sla_alerts`, escalates old ones, auto-resolves on activity |
| `referral-crediter` | `lead.created`, `payment.succeeded` events | matches `referral_policies`, inserts `referral_credits` |
| `attribution-snapshotter` | `payment.succeeded` events | writes immutable `payment_attributions` row per configured model |
| `touch-recorder` | UTM/pixel webhook, email/sms/wa events | appends `lead_touches`, updates first/last-touch columns on `leads` |

### 7c. Business-hours awareness
Workers that send external messages (`email-sender`, `sms-sender`, `whatsapp-sender`) read `respects_business_hours` flag on the source (campaign / drip / scheduled_send / workflow) and call `calendar/nextBusinessMoment()` to defer off-hours jobs.

---

## 8. Infra & Deployment (VPS-only, no AWS, no Docker)

### Local dev
- Native Postgres + Redis (optional).
- `.env.local` with `localhost` connection strings.
- `npm run setup` → creates system DB + demo tenant DB, migrates, seeds product_owner + demo super_admin.
- `npm run dev` → Express on `:4000`.
- `npm run worker:<name>` per worker, or run all inline when `QUEUE_DRIVER=inprocess`.

### VPS (staging / prod)
- **One VPS** to start (Hetzner CCX13 or similar, 2 vCPU / 8 GB).
- Node via `nvm`.
- **systemd units**:
  - `extraedge-api.service` — Express
  - `extraedge-worker-email.service`
  - `extraedge-worker-sms.service`
  - `extraedge-worker-whatsapp.service`
  - `extraedge-worker-rules.service`
  - `extraedge-worker-workflows.service`
  - `extraedge-worker-bulk.service`
  - `extraedge-worker-drip.service`
  - `extraedge-worker-scheduled-sends.service`
  - `extraedge-worker-webhooks.service`
  - `extraedge-worker-notifications.service`
  - `extraedge-worker-pdf.service`
  - `extraedge-worker-duplicates.service`
  - `extraedge-worker-exports.service`
- **Postgres**: installed on the VPS (`postgresql-15`). `shared_buffers`, `work_mem` tuned per VPS size. Wal-level `replica` so we can attach a standby later.
- **Redis**: installed on the VPS (`redis-server`). Configure `maxmemory` + `maxmemory-policy allkeys-lru`. Optional — drop it to save ~400 MB RAM if the team is fine with `inprocess` queue (no drip/workflow scale).
- **Nginx**: TLS via certbot, wildcard cert for `*.productivo.in`. Subdomain routing → Express. `proxy_buffering off` on `/notifications/stream`.
- **Backups**: `cron` nightly → `scripts/backup-all-dbs.sh` → Cloudflare R2 bucket with 30-day lifecycle.
- **Logs**: pino → `/var/log/extraedge/*.log` → `logrotate` daily with 14-day retention. Optional: ship to Axiom free tier (3 GB/mo).
- **Metrics**: `/metrics` (prom-client). Self-hosted Prometheus + Grafana on the same VPS when there's time; otherwise Better Stack free tier.

### Files & recordings
- All user uploads, call recordings, CSV imports/exports, PDF reports → **Cloudflare R2**. Free egress is the main win — CSV exports are a CRM's heaviest traffic.

### Third-party providers
- **Email**: Brevo — SMTP + REST; webhooks for delivered/opened/clicked/bounced/unsubscribed.
- **SMS / OTP**: MessageCentral — send + DLT templates; webhooks for delivery receipts.
- **WhatsApp**: WABridge — template registration, send, inbound webhook.
- **Payments**: Razorpay — payment links + webhooks (signed).
- **Telephony (audio only)**: Exotel — click-to-call + recording webhook.

### Secrets
- `.env` on VPS, mode 600, root-owned.
- Rotate `JWT_SECRET` + provider keys quarterly.

### CI
- GitHub Actions: lint → unit → integration (Actions' Postgres service container) → tarball.
- Deploy: SSH → `git pull` → `npm ci` → `npm run migrate` → `systemctl restart extraedge-api@.service extraedge-worker-*.service`.

---

## 9. Observability, Security, Testing
(unchanged from previous version; logs go to pino files, R2 for archived logs optional)

### Compliance (NEW emphasis)
- **Unsubscribe** link auto-injected into every marketing email (not utility). Click → append `suppression_list` + `optin_log.opted_out_at`.
- **SMS STOP** keyword handled in the MessageCentral inbound webhook: add to `suppression_list`.
- **WhatsApp opt-in** record required before any MARKETING template send; enforced at `/whatsapp/send` — returns 403 `NO_OPTIN` if absent.
- **Hard bounces** auto-suppress via provider webhook.
- **Send-time check**: every outbound worker first `SELECT 1 FROM suppression_list WHERE channel=$1 AND lower(address)=lower($2)` → if present, mark message `suppressed`, skip send.

---

## 10. Phased Delivery (synced to FEATURE_PLAN.md)

**Phase 0 (weeks 1–3) — Foundation**
- Repo scaffold, migrations for all tables.
- System DB, `product_owner` bootstrap script, tenant provisioning.
- Middleware: auth, tenant, rbac, idleGuard, workTracker, optimisticLock.
- Auth flow (login, refresh, logout, `/me`, forgot-password, heartbeat).
- SSE notification skeleton.
- Generic `/uploads` (presign + confirm) against R2.

**Phase 1 (weeks 4–7) — Core lead ops (unblocks frontend)**
- `/users`, `/teams`, `/dropdowns/*`, `/programs`.
- `/leads` CRUD + filters + tabs + search + duplicate check on create.
- `/leads/:id/{timeline,notes,assignments,stage,refer,tags}`.
- `/follow-ups` CRUD + recurrence + overdue + `followup-reminder-scheduler` + `missed-followup-scanner`.
- `/saved-filters`, `/search`, `/quick-add`, `/tags`.
- `/calendar/business-hours` + holidays.
- `/custom-fields` + `/field-permissions` (unblocks tenant-specific lead forms).
- `/users/:id/availability` (feeds assignment rules in Phase 4).

**Phase 2 (weeks 8–9) — Ingestion + verification + duplicates**
- `/bulk/leads/preview` + `/bulk/leads/commit` + workers.
- `/bulk/leads/imports/*`, retry, exports.
- `/raw-data/*` + OTP (MessageCentral) + email verify.
- `/duplicates/*` + `duplicate-scanner` worker.
- `/failed-leads/*`.

**Phase 3 (weeks 10–14) — Communications + payments + notifications + calls**
- `/email/*` (Brevo), `/sms/*` (MessageCentral), `/whatsapp/*` (WABridge) + templates with `language` + webhooks.
- `template_variables` registry + UI.
- `message_log`, delivery tracking, `suppression_list`, `optin_log`.
- `/scheduled-sends` + runner.
- `/subscription/*` (credits).
- `/payments/*` (Razorpay).
- `/notifications/*` + SSE + `notification_preferences`.
- `/calls` audio-only + Exotel + recording → R2 + `/calls/dispositions` (structured outcomes feed drip triggers).
- `touch-recorder` starts logging email/sms/wa events into `lead_touches` (used by Phase 4 attribution).

**Phase 4 (weeks 15–19) — Rules, campaigns, workflows, reports, analytics**
- `rule-processor`, `/assignment-rules/*` + round-robin cursor + availability-aware skipping, `/lead-score/*`.
- `/campaigns/bulk/*` + runner, `/campaigns/drip/*` + scheduler (disposition-triggered steps).
- `/workflows/*` + executor.
- `/analytics/*` (every dashboard card) + `/analytics/attribution` + `attribution-snapshotter`.
- `/reports/*` (PDF).
- `/sla-policies/*` + `/sla-alerts/*` + `sla-scanner`.
- `/referrals/*` + `/referral-policies/*` + `referral-crediter`.

**Phase 5 (weeks 20+) — Integrations, remarketing, outbound webhooks, polish**
- `/integrations/*` (OAuth, inbound webhooks).
- `/remarketing/*` (FB audience sync).
- `/outbound-webhooks/*` + dispatcher.
- `/tickets/*`.
- Warehouse / platform analytics.
- Audit log export.

---

## 11. Decisions to Confirm Before Phase 1

| Topic | Default |
|---|---|
| Password hashing | **argon2id** |
| Migration tool | **node-pg-migrate** |
| Validation | **zod** |
| Logger | **pino** |
| Queue | **BullMQ (Redis) default, in-process fallback** |
| Email provider | **Brevo** |
| SMS / OTP provider | **MessageCentral** |
| WhatsApp provider | **WABridge** |
| Telephony (audio) | **Exotel** |
| Payments | **Razorpay** |
| Object store | **Cloudflare R2** |
| Real-time transport | **SSE** |
| PDF generator | **pdfkit** |
| Recurrence format | **RFC 5545 RRULE** |
| Timezone default | **Asia/Kolkata** |

---

## 12. Frontend-to-Backend Coverage Map

| FE feature | FE file | BE module | Phase |
|---|---|---|---|
| Login/Logout | [Login.jsx](../src/components/Login/Login.jsx) | auth | 0 |
| Protected routes | [ProtectedRoute.jsx](../src/components/ProtectedRoute/ProtectedRoute.jsx) | auth middleware | 0 |
| Header session timer (15-min idle) | [Header.jsx](../src/components/Layout/Header.jsx) | auth heartbeat + idleGuard | 0 |
| Header work-time display | Header.jsx | work-sessions | 0 |
| Header search | Header.jsx | search | 1 |
| Header notifications bell | Header.jsx | notifications + SSE | 3 |
| QuickAdd | [QuickAdd.jsx](../src/components/QuickAdd/QuickAdd.jsx) | leads (quick-add) + duplicates | 1 |
| Raise Ticket | [RaiseTicketModal.jsx](../src/components/Layout/RaiseTicketModal.jsx) | tickets + uploads | 5 |
| Dashboard | [AnalyticsDashboard.jsx](../src/pages/Dashboard/AnalyticsDashboard.jsx) | analytics + reports (PDF export) | 4 |
| Lead list | [LeadList.jsx](../src/pages/LeadList/LeadList.jsx) | leads + tags | 1 |
| FiltersOptions / Filter / SavedList | same as before | leads + saved-filters | 1 |
| LeadCard | [LeadCard.jsx](../src/components/LeadCard/LeadCard.jsx) | leads + activities + tags | 1 |
| AddNewLead (6-tab) | [AddNewLead.jsx](../src/components/AddNewLead/AddNewLead.jsx) | leads + dropdowns + duplicates | 1 |
| UploadLeads wizard | [UploadLeads.jsx](../src/components/UploadLeads/UploadLeads.jsx) | uploads + bulk-ingestion (preview + commit) | 2 |
| RawDataManager | [RawDataManager.jsx](../src/pages/RawDataManager/RawDataManager.jsx) | raw-data + MessageCentral OTP | 2 |
| FailedLeads | [FailedLeads.jsx](../src/pages/FailedLeads/FailedLeads.jsx) | bulk-ingestion failures | 2 |
| BulkUploadList | [BulkUploadList.jsx](../src/pages/BulkUplodList/BulkUploadList.jsx) | bulk-ingestion | 2 |
| FollowUpManager | [FollowUpManager.jsx](../src/pages/FollowUpManager/FollowUpManager.jsx) | follow-ups (incl. recurrence) + calendar | 1 |
| AddFollowUpDrawer | [AddFollowUpDrawer.jsx](../src/components/AddFollowUpDrawer/AddFollowUpDrawer.jsx) | follow-ups | 1 |
| AddNoteDrawer | [AddNoteDrawer.jsx](../src/components/AddNoteDrawer/AddNoteDrawer.jsx) | lead-notes + uploads (attachments) | 1 |
| ReferLeadsDrawer | [ReferLeadsDrawer.jsx](../src/components/ReferLeadsDrawer/ReferLeadsDrawer.jsx) | lead-assignments | 1 |
| ViewTimelineModal | [ViewTimelineModal.jsx](../src/components/ViewTimelineModal/ViewTimelineModal.jsx) | lead-activities | 1 |
| CallModal | [CallModal.jsx](../src/components/CallModal/CallModal.jsx) | calls (audio only, Exotel + recording to R2) | 3 |
| VideoCall (frontend component) | [VideoCall.jsx](../src/components/VideoCall/VideoCall.jsx) | **OUT OF SCOPE — backend does not support video** | — |
| WhatsAppList | [WhatAppsList.jsx](../src/pages/WhatsAppList/WhatAppsList.jsx) | whatsapp (WABridge) | 3 |
| WhatsApp quota / send / usage modals | components | whatsapp + subscriptions | 3 |
| EmailTemplates + builders | [EmailTemplates.jsx](../src/components/EmailTemplates/EmailTemplates.jsx), [AddEmailTemplate.jsx](../src/components/AddEmailTemplate/AddEmailTemplate.jsx) | communications (Brevo) + template-variables + uploads | 3 |
| EmailDrawer | [EmailDrawer.jsx](../src/components/EmailDrawer/EmailDrawer.jsx) | communications (send) + scheduled-sends | 3 |
| SMSTemplates | [SMSTemplates.jsx](../src/components/SMSTemplates/SMSTemplates.jsx) | communications (MessageCentral) | 3 |
| LeadScore | [LeadScore.jsx](../src/components/LeadScore/LeadScore.jsx) | lead-score | 4 |
| AssignmentRules | [AssignmentRules.jsx](../src/components/AssignmentRules/AssignmentRules.jsx) | assignment-rules + state (round-robin cursor) | 4 |
| BulkMarketingCampaign | [BulkMarketingCampaign.jsx](../src/pages/BulkMarketingCampaign/BulkMarketingCampaign.jsx) | campaigns-bulk | 4 |
| DripMarketingCampaign | [DripMarketingCampaign.jsx](../src/pages/DripMarketingCampaign/DripMarketingCampaign.jsx) | campaigns-drip | 4 |
| Remarketing | [Remarketing.jsx](../src/pages/Remarketing/Remarketing.jsx) | remarketing | 5 |
| AutomationWorkflow + WorkflowBuilder | [AutomationWorkflow.jsx](../src/pages/AutomationWorkflow/AutomationWorkflow.jsx) | workflows | 4 |
| ConnectedAccounts + ThirdPartyIntegration | pages | integrations + outbound-webhooks | 5 |
| Settings tabs | [Settings.jsx](../src/pages/Settings/Settings.jsx) | communications + lead-score + assignment-rules | 3/4 |
| AdvancedSettings | [AdvancedSettings.jsx](../src/pages/AdvancedSettings/AdvancedSettings.jsx) | dropdowns + users + teams + subscriptions + calendar + tags | 1/3/5 |

---

## 13. Appendix — Diagram flow mapping
(unchanged; payment webhook path now uses Razorpay, notification worker path unchanged, video-call step removed)

---

## 14. Idle Logout + Work-Time Tracking (NEW)

### 14a. 15-min idle logout — applies to every role (including super_admin)

**Frontend**
- Single module wraps fetch/axios. On every API response, records `lastApiActivityAt = now()`.
- Timer ticks once a second; if `now - lastApiActivityAt > 15 min` → force logout: clear token, `POST /auth/logout` (best-effort), redirect to `/`.
- Optional explicit heartbeat every 5 min of mouse/keyboard activity: `POST /auth/session/heartbeat` — counts as an API call.

**Backend**
- `user_sessions.last_activity_at` is updated on every authenticated request (cheap — UPDATE by id).
- `middleware/idleGuard.js` rejects requests where `now - last_activity_at > 15 min` with `401 SESSION_IDLE`; frontend treats this exactly like a logout.
- Access JWT still has 15-min expiry — double fence: either time-since-issued OR time-since-last-activity > 15 min ⇒ dead.

### 14b. Real work-time tracking — every role **except super_admin**

**Purpose**: know how much real time each counsellor / sales_manager actually worked per day.

**Definition**: a minute counts as "active" if the user made ≥1 authenticated API call during that UTC minute.

**Mechanism**
- `middleware/workTracker.js` runs after `auth.js`. If `req.user.trackWork === false` (super_admin) → skip.
- Otherwise: `INSERT INTO work_activity_minutes (user_id, minute_bucket) VALUES ($1, date_trunc('minute', now())) ON CONFLICT DO NOTHING;` — O(1) write, idempotent.
- Nightly cron compacts `work_activity_minutes` into `work_sessions`:
  - Group consecutive minute-buckets with gaps ≤ 5 min into a single session.
  - `active_minutes = COUNT(buckets)`, `started_at = MIN`, `ended_at = MAX`.
  - Delete compacted raw rows older than 7 days.

**Force-logout marker**
- When `idleGuard` rejects a request, it also writes a `work_sessions` row with `idle_logout=true` for that user's latest bucket cluster, so managers see both total time and how many sessions ended on idle.

**Exemption**
- `users.track_work_time = false` for `role='super_admin'` (default). `platform_users` not tracked at all (different DB).

**Manager views**
- `GET /work-sessions/me/today` — self.
- `GET /work-sessions?user_id=&date_from=&date_to=` — manager sees team hierarchy, filtered by recursive `manager_id`.
- `GET /work-sessions/team-summary` — per-user aggregate (total active minutes, session count, avg session length).

### 14c. Frontend-backend contract for idle + tracking

| Concern | Owner | Contract |
|---|---|---|
| Ticking timer | FE | 1s setInterval, force logout on threshold |
| Last activity | FE | updated on every API response |
| Heartbeat | FE | `POST /auth/session/heartbeat` every 5 min during activity |
| Backend enforcement | BE | `idleGuard` returns 401 `SESSION_IDLE` if last_activity > 15 min |
| Work-minute bucket | BE | `workTracker` writes UTC-minute row, skips super_admin |
| Compaction | BE | Nightly cron: buckets → `work_sessions` |
| Role exemption | BE | `users.track_work_time` flag + `trackWork` JWT claim |

---

## 15. Week 1 Checklist

1. Create `extraedge-backend` repo, push scaffold.
2. Install native Postgres + Redis on dev machines.
3. Land migrations (system + tenant) for every table in §4.
4. Implement middleware trio + `idleGuard` + `workTracker` + `optimisticLock`.
5. Implement `modules/auth` + `modules/tenants` + `scripts/create-product-owner.js` + `scripts/provision-tenant.js`.
6. Implement `modules/uploads` against Cloudflare R2 (presign/confirm).
7. Green CI.
8. Demo: seed product_owner → product_owner provisions a demo tenant → log in as demo super_admin → hit `/auth/me` → leave idle 15 min → get 401 `SESSION_IDLE` → confirm work-minute bucket was written for the active period.
