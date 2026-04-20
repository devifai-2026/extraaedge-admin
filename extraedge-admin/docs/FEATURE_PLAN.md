# ExtraaEdge Admin — Feature-Wise Plan

**Product:** Lead management & marketing automation CRM for educational institutions
**Frontend stack:** React 19 + Vite + MUI v9 + React Router v7 + Recharts
**Current state:** UI-complete frontend with mock data; no backend integration

---

## Legend

- ✅ UI fully built
- 🟡 UI built, behavior partial
- 🔴 Not started / stubbed
- 🔌 Needs backend wiring

---

## 1. Authentication & Session Management

**Routes:** [/](src/components/Login/Login.jsx)
**Status:** 🟡 Mock localStorage auth

### Sub-features
| Feature | Status | Notes |
|---|---|---|
| Email/password login | ✅ 🔌 | Hardcoded navigation to /dashboard; no API validation |
| Protected routes | ✅ 🔌 | [ProtectedRoute.jsx](src/components/ProtectedRoute/ProtectedRoute.jsx) checks localStorage token only |
| Logout | ✅ 🔌 | Clears localStorage from Header user menu |
| Remember me | ✅ 🔴 | Checkbox exists, no persistence logic |
| Forgot password | 🔴 | Link only, no flow |
| Session timer | 🟡 | 20-min countdown shown in Header, not tied to real session |
| Role-based access (RBAC) | 🔴 | No roles/permissions model |
| Token refresh | 🔴 | No JWT, no refresh logic |
| Audit logging | 🔴 | No user action tracking |

### Phase priority
- **P0 (MVP):** Real login, JWT issuance/validation, protected API calls, logout
- **P1:** Forgot password, token refresh, session expiry enforcement
- **P2:** RBAC, audit log, SSO

---

## 2. Lead Management (Core)

**Routes:** [/leadlist](src/pages/LeadList/LeadList.jsx)
**Key components:** [LeadCard.jsx](src/components/LeadCard/LeadCard.jsx), [AddNewLead.jsx](src/components/AddNewLead/AddNewLead.jsx)
**Status:** 🟡 UI complete, mock data

### Sub-features
| Feature | Status | Notes |
|---|---|---|
| List leads (card view) | ✅ 🔌 | Scrollable cards with expandable sections |
| Create lead (6-tab form) | ✅ 🔌 | Applicant, Education, Program/Status, Address, Family, Source |
| Edit lead | ✅ 🔌 | In-place from LeadCard menu |
| Delete lead | ✅ 🔌 | Menu action |
| Lead detail / timeline | ✅ 🔌 | [ViewTimelineModal.jsx](src/components/ViewTimelineModal/ViewTimelineModal.jsx) |
| Lead notes | ✅ 🔌 | [AddNoteDrawer.jsx](src/components/AddNoteDrawer/AddNoteDrawer.jsx) |
| Refer / reassign lead | ✅ 🔌 | [ReferLeadsDrawer.jsx](src/components/ReferLeadsDrawer/ReferLeadsDrawer.jsx) |
| Lead status tabs | ✅ 🔌 | [TabsSection.jsx](src/components/TabsSection/TabsSection.jsx) — 13 stages |
| Pagination | 🟡 🔴 | Not visible on lead list; only on bulk pages |
| Bulk select / actions | 🟡 | Group action in FiltersOptions, no real bulk backend |
| Duplicate detection | 🔴 | No UI warning for existing phone/email |

### Data model (from mock)
- Personal: name, email, phone, whatsapp, alternateContact, gender
- Education: UG/PG degree, specialization, university, gradYear
- Program: selected program, stage, subStage, remarks, leadScore
- Address: country, state, district, city, pincode
- Family: father/mother names, mobiles, emails
- Source: channel, source, campaign, medium (array — multi-source)
- Ownership: currentOwner, previousOwner, leadAge, createdAt, updatedAt

### Phase priority
- **P0:** CRUD, list with filters, single source
- **P1:** Timeline, notes, reassign, multi-source tracking
- **P2:** Duplicate detection, lead merging, custom fields

---

## 3. Lead Ingestion (Bulk Import)

**Routes:** [/bulkuploadlist](src/pages/BulkUplodList/BulkUploadList.jsx), [/failedleads](src/pages/FailedLeads/FailedLeads.jsx)
**Key component:** [UploadLeads.jsx](src/components/UploadLeads/UploadLeads.jsx)
**Status:** 🟡 UI complete

### Sub-features
| Feature | Status | Notes |
|---|---|---|
| 3-step CSV upload wizard | ✅ 🔌 | Map fields → Upload file → Validate |
| Field mapping | ✅ 🔌 | CSV columns → CRM fields (15+ fields) |
| Default value overrides | ✅ 🔌 | Default channel, source, stage, sub-stage per import |
| Welcome email/SMS toggle | ✅ 🔌 | Triggers notification on import success |
| Failed imports log | ✅ 🔌 | [FailedLeads.jsx](src/pages/FailedLeads/FailedLeads.jsx) — table with error messages |
| Retry failed rows | 🟡 🔴 | Icon present, no retry logic |
| Bulk download (CSV export) | ✅ 🔌 | In BulkUploadList |
| Bulk status change | ✅ 🔌 | Tab in BulkUploadList |
| Bulk refer/assign | ✅ 🔌 | Tab in BulkUploadList |
| File size/row limit UX | 🔴 | No limits declared in UI |

### Phase priority
- **P0:** CSV upload with mapping, validation, failed-row report
- **P1:** CSV download, bulk status change, bulk refer
- **P2:** Duplicate handling on import, scheduled imports, API-based ingestion

---

## 4. Raw Data / Cold Lead Management

**Routes:** [/rawdata](src/pages/RawDataManager/RawDataManager.jsx)
**Status:** 🟡 UI only

### Sub-features
| Feature | Status | Notes |
|---|---|---|
| Verification status tabs | ✅ 🔌 | All, Cold, Mobile Verified, Email Verified, Both Verified, Warm |
| Empty state | ✅ | With upload CTA |
| Upload raw leads | 🟡 🔌 | Same wizard as active leads |
| Verify mobile/email | 🔴 | No verification flow |
| Promote to active lead | 🔴 | No conversion UI |

### Phase priority
- **P1:** Verification status tracking, mobile OTP, email confirm
- **P2:** Auto-promotion rules, third-party verification integration

---

## 5. Filtering, Sorting & Saved Lists

**Components:** [FiltersOptions.jsx](src/components/FiltersOptions/FiltersOptions.jsx), [Filter.jsx](src/components/Filter/Filter.jsx), [SavedList.jsx](src/components/SavedList/SavedList.jsx)
**Status:** 🟡 UI only

### Sub-features
| Feature | Status | Notes |
|---|---|---|
| Sort (added on, score, updated, followup) | ✅ 🔌 | |
| Group by counselor | ✅ 🔌 | |
| Advanced filter modal | ✅ 🔌 | Multi-criteria |
| Save filter as list | ✅ 🔌 | |
| View saved lists | ✅ 🔌 | Drawer |
| Refresh lead list | ✅ 🔌 | |
| Global search (header) | ✅ 🔌 | Context toggle: applicant vs application |
| Date range picker | ✅ 🔌 | [DatePicker.jsx](src/components/DatePicker/DatePicker.jsx) |

### Phase priority
- **P0:** Server-side pagination, basic filters (stage, owner, date)
- **P1:** Saved filters persistence, advanced boolean filters
- **P2:** Shared saved lists, filter permissions

---

## 6. Follow-Up Management

**Routes:** [/followupmanager](src/pages/FollowUpManager/FollowUpManager.jsx)
**Component:** [AddFollowUpDrawer.jsx](src/components/AddFollowUpDrawer/AddFollowUpDrawer.jsx)
**Status:** 🟡 UI only

### Sub-features
| Feature | Status | Notes |
|---|---|---|
| Schedule follow-up | ✅ 🔌 | Date, time, remarks |
| Follow-up list by date | ✅ 🔌 | Sidebar collapsed on this route |
| Complete follow-up | 🟡 🔌 | `followupType: 'done'` exists in mock |
| Follow-up reminders/notifications | 🔴 | No push/notification system |
| Recurring follow-ups | 🔴 | |
| Calendar view | 🟡 | Date-sorted, no true calendar |

### Phase priority
- **P0:** Create, list by date, mark complete
- **P1:** Notification on due follow-up, overdue tracking
- **P2:** Calendar integration (Google/Outlook), reminders via SMS/WA

---

## 7. Multi-Channel Communications

### 7a. Email
**Components:** [EmailTemplates.jsx](src/components/EmailTemplates/EmailTemplates.jsx), [AddEmailTemplate.jsx](src/components/AddEmailTemplate/AddEmailTemplate.jsx), [AddBasicEmailTemplate.jsx](src/components/AddBasicEmailTemplate/AddBasicEmailTemplate.jsx), [EmailDrawer.jsx](src/components/EmailDrawer/EmailDrawer.jsx)

| Feature | Status | Notes |
|---|---|---|
| Template CRUD | ✅ 🔌 | Published/Draft status |
| Advanced builder | ✅ 🔌 | Rich editor |
| Basic builder | ✅ 🔌 | Simple form |
| Template variables (%Lead.FullName% etc.) | ✅ 🔌 | Dropdown |
| Send email to lead | ✅ 🔌 | Drawer from lead card |
| Delivery/open/click tracking | 🔴 🔌 | Campaign stats imply support |
| Bounce/unsubscribe handling | 🔴 | |

### 7b. SMS
**Components:** [SMSTemplates.jsx](src/components/SMSTemplates/SMSTemplates.jsx), [AddSMSTemplateDrawer.jsx](src/components/SMSTemplates/AddSMSTemplateDrawer.jsx)

| Feature | Status | Notes |
|---|---|---|
| SMS template CRUD | ✅ 🔌 | Visibility toggle |
| Send SMS to lead | ✅ 🔌 | |
| DLT template approval | 🔴 | India regulatory — needed |
| Delivery tracking | 🔴 🔌 | |
| SMS credit tracking | 🟡 🔌 | Subscription manager UI |

### 7c. WhatsApp
**Routes:** [/whatsapplist](src/pages/WhatsAppList/WhatAppsList.jsx)
**Components:** [WhatsApp.jsx](src/components/WhatsApp/WhatsApp.jsx), [WhatsAppSendModal.jsx](src/components/WhatsAppSendModal/WhatsAppSendModal.jsx), [WhatsAppUsageModal.jsx](src/components/WhatsAppUsageModal/WhatsAppUsageModal.jsx), [WhatsAppFilter.jsx](src/components/WhatsAppFilter/WhatsAppFilter.jsx)

| Feature | Status | Notes |
|---|---|---|
| Send WhatsApp message | ✅ 🔌 | |
| Template selection | ✅ 🔌 | Business-initiated vs session |
| Quota display (monthly/daily/session) | ✅ 🔌 | |
| Multi-number send (lead/father/mother) | ✅ 🔌 | |
| Response routing | ✅ 🔌 | Sender vs current owner |
| Open in WhatsApp Web | ✅ | Link-out |
| Usage modal | ✅ 🔌 | |
| Inbox / two-way chat | 🔴 | Not built — major gap |
| Read receipts | 🟡 🔌 | Data shape supports (waDeliveredSeen) |

### 7d. Calls & Video
**Components:** [CallModal.jsx](src/components/CallModal/CallModal.jsx), [VideoCall.jsx](src/components/VideoCall/VideoCall.jsx)

| Feature | Status | Notes |
|---|---|---|
| Log call | ✅ 🔌 | |
| Initiate call (click-to-call) | 🔴 | UI present, no dialer integration |
| Video call invite | 🟡 🔌 | Template-based |
| Live video call | 🔴 | No WebRTC/third-party integration |
| Call recording | 🔴 | |

### Phase priority
- **P0:** Email send, SMS send, WA template send (outbound only)
- **P1:** Template CRUD with variable substitution, delivery tracking, DLT
- **P2:** Two-way WA inbox, click-to-call (Exotel/Twilio), video calls, recordings

---

## 8. Marketing Campaigns

### 8a. Bulk Campaigns
**Routes:** [/bulkmarketingcampaign](src/pages/BulkMarketingCampaign/BulkMarketingCampaign.jsx)
**Status:** 🟡 UI only

| Feature | Status | Notes |
|---|---|---|
| List campaigns | ✅ 🔌 | With rich stats column |
| Create campaign | ✅ 🔌 | |
| Edit/clone/delete | ✅ 🔌 | |
| Launch/stop campaign | ✅ 🔌 | Status: COMPLETED, STOPPED, IN_PROGRESS |
| Per-channel stats | ✅ 🔌 | Email/SMS/WA triggered, delivered, opened, clicked, bounced |
| Audience rule builder | 🟡 🔌 | Rule column in table, builder UI unclear |
| Campaign scheduling | 🔴 🔌 | |
| A/B testing | 🔴 | |

### 8b. Drip Campaigns
**Routes:** [/dripmarketingcampaign](src/pages/DripMarketingCampaign/DripMarketingCampaign.jsx)
**Components:** [AddRuleModal.jsx](src/pages/DripMarketingCampaign/AddRuleModal.jsx), [EditRuleModal.jsx](src/pages/DripMarketingCampaign/EditRuleModal.jsx)

| Feature | Status | Notes |
|---|---|---|
| List drip rules | ✅ 🔌 | |
| Create/edit rule | ✅ 🔌 | Time-based triggers |
| Activate/deactivate toggle | ✅ 🔌 | |
| Trigger conditions | 🟡 🔌 | Needs rule engine design |
| Rule execution history | 🔴 🔌 | |

### 8c. Remarketing (Facebook)
**Routes:** [/remarketing](src/pages/Remarketing/Remarketing.jsx)
**Status:** 🔴 Empty placeholder

### Phase priority
- **P0:** Bulk campaign create + launch to static audience on one channel
- **P1:** Drip rule engine, multi-channel, full stats pipeline
- **P2:** Facebook Audiences sync, A/B testing, segmentation builder

---

## 9. Workflow Automation

**Routes:** [/automations](src/pages/AutomationWorkflow/AutomationWorkflow.jsx)
**Components:** [WorkflowBuilder.jsx](src/pages/AutomationWorkflow/WorkflowBuilder.jsx), [EditAutomationWorkflow.jsx](src/pages/AutomationWorkflow/EditAutomationWorkflow.jsx), [CreateWorkflowCategory.jsx](src/pages/AutomationWorkflow/CreateWorkflowCategory.jsx)
**Status:** 🟡 UI skeleton

### Sub-features
| Feature | Status | Notes |
|---|---|---|
| Workflow list | ✅ 🔌 | |
| Create workflow | ✅ 🔌 | Category picker |
| Visual builder | 🟡 🔌 | Component exists, completion unclear |
| Trigger types | 🟡 🔌 | Time-based, event-based |
| Action library | 🔴 🔌 | Send email/SMS/WA, assign, schedule call |
| Conditional branches | 🔴 | |
| Categories CRUD | ✅ 🔌 | |
| Activation toggle | ✅ 🔌 | |
| Test run | 🔴 🔌 | |
| Execution logs | 🔴 🔌 | |

### Phase priority
- **P1:** Simple trigger → single action workflows
- **P2:** Visual DAG builder, conditional branches, test runner, execution history

---

## 10. Analytics & Dashboard

**Routes:** [/dashboard](src/pages/Dashboard/AnalyticsDashboard.jsx)
**Components:** [LeadFunnel.jsx](src/components/LeadFunnel/LeadFunnel.jsx), [LeadsTimelineReport.jsx](src/components/LeadsTimelineReport/LeadsTimelineReport.jsx), [TableProgramWise.jsx](src/components/ProgramWise/TableProgramWise.jsx), [ChannelSource.jsx](src/components/ChannnelSource/ChannelSource.jsx), [programStatus.jsx](src/components/programStatus/programStatus.jsx), [coldEnquiries.jsx](src/components/ColdEnquiries/coldEnquiries.jsx)
**Status:** 🟡 UI with mock data

### Metrics shown
| Metric | Status | Notes |
|---|---|---|
| Total leads KPI | ✅ 🔌 | |
| Communications consumed (email/SMS/WA) | ✅ 🔌 | |
| Active programs count | ✅ 🔌 | |
| Conversion rate | ✅ 🔌 | |
| Lead funnel (stages) | ✅ 🔌 | Recharts funnel |
| Leads timeline (line chart) | ✅ 🔌 | |
| Program-wise breakdown | ✅ 🔌 | Table |
| Channel/source breakdown | ✅ 🔌 | Chart |
| Program status | ✅ 🔌 | |
| Cold enquiries | ✅ 🔌 | |
| Counselor filter | ✅ 🔌 | |
| Date range filter | ✅ 🔌 | |
| Export summary report | 🔴 🔌 | Button exists |
| Per-counselor leaderboards | 🔴 | |

### Phase priority
- **P0:** Core KPIs + funnel + timeline
- **P1:** Program/channel breakdowns, date range, counselor filter
- **P2:** Scheduled report delivery, leaderboards, custom dashboards

---

## 11. Settings & Configuration

**Routes:** [/settings](src/pages/Settings/Settings.jsx), [/advancedsettings](src/pages/AdvancedSettings/AdvancedSettings.jsx)

### Basic Settings (tabs)
| Tab | Feature | Status |
|---|---|---|
| Email Templates | CRUD | ✅ 🔌 |
| SMS Templates | CRUD | ✅ 🔌 |
| Lead Score | Criteria config | 🟡 🔌 — [LeadScore.jsx](src/components/LeadScore/LeadScore.jsx) UI only |
| Assignment Rules | Auto-assign config | 🟡 🔌 — [AssignmentRules.jsx](src/components/AssignmentRules/AssignmentRules.jsx) UI only |

### Advanced Settings
| Section | Feature | Status |
|---|---|---|
| Dropdown Values | Manage custom dropdowns | 🔴 🔌 |
| Users & Roles | User/role management | 🔴 🔌 |
| Communications | Template-wide settings | 🔴 🔌 |
| Subscription Manager | WhatsApp credits | 🔴 🔌 |

### Phase priority
- **P0:** Dropdown management (needed for lead form), user list
- **P1:** Lead score engine, assignment rule engine, subscription/billing
- **P2:** Per-role permissions, multi-tenant settings

---

## 12. Integrations

**Routes:** [/connectedaccounts](src/pages/ConnectedAccounts/ConnectedAccounts.jsx), [/thirdpartyintegration](src/pages/ThirdPartyIntegration/ThirdPartyIntegration.jsx)
**Component:** [AddIntegrationDialog.jsx](src/components/AddIntegrationDialog/AddIntegrationDialog.jsx)

### Sub-features
| Feature | Status | Notes |
|---|---|---|
| Connected accounts display | ✅ | ExtraaEdge API, Facebook Ads cards |
| Third-party integration CRUD | ✅ 🔌 | Published/Unpublished status |
| Grid/list view toggle | ✅ | |
| OAuth flow | 🔴 🔌 | No OAuth callback handling |
| API key management | 🔴 | |
| Webhook receivers | 🔴 | For inbound lead from FB/Google |
| Integration health checks | 🔴 🔌 | |

### Phase priority
- **P0:** Webhook receiver for inbound leads (Facebook, Google, website forms)
- **P1:** OAuth for Facebook Ads, Gmail/Outlook email sync
- **P2:** Custom integration builder, marketplace

---

## 13. Cross-Cutting Concerns (needed across all features)

| Concern | Status | Notes |
|---|---|---|
| Loading states / skeletons | 🔴 | No skeletons anywhere |
| Error boundaries | 🔴 | No global error handling |
| Toast/snackbar notifications | 🔴 | No notification system visible |
| Global state management | 🔴 | No Redux/Zustand/Context — all local useState |
| API client abstraction | 🔴 | No fetch/axios service layer |
| Form validation | 🟡 | Required attributes, no schema validation |
| Accessibility (a11y) | 🟡 | MUI defaults; no audit |
| i18n | 🔴 | English-only, hardcoded |
| Mobile responsive | 🟡 | Admin-desktop-first; needs testing |
| Real-time updates | 🔴 | No WebSocket/SSE |
| File upload backend | 🔴 | |
| PDF/CSV export | 🟡 🔌 | UI only |

---

## Suggested Delivery Phasing

### Phase 0 — Foundation (weeks 1–3)
- Backend scaffolding (see [BACKEND_PLAN.md](./BACKEND_PLAN.md))
- Auth (JWT login/logout, protected routes)
- API client abstraction on frontend (axios/fetch wrapper, interceptors, error handling)
- Global state (React Context or Zustand for auth/user)
- Toast notifications, loading states, error boundary

### Phase 1 — Core Lead Ops (weeks 4–7)
- Lead CRUD (wire AddNewLead, LeadList, LeadCard)
- Basic filtering + server-side pagination
- Follow-up scheduling
- Lead timeline & notes
- Dropdown values management (unblocks forms)

### Phase 2 — Ingestion (weeks 8–9)
- CSV bulk import with mapping
- Failed leads log + retry
- Bulk export, bulk status change, bulk refer
- Webhook receivers for inbound leads

### Phase 3 — Communications (weeks 10–13)
- Email send (template + variable substitution)
- SMS send (with DLT templates)
- WhatsApp send (Business API integration)
- Delivery tracking, message history per lead

### Phase 4 — Campaigns & Automation (weeks 14–18)
- Bulk campaigns (audience rule → send → stats)
- Drip rules (trigger engine, scheduler)
- Workflow automation (simple version)
- Campaign analytics pipeline

### Phase 5 — Analytics & Settings (weeks 19–21)
- Dashboard metrics endpoints
- Lead scoring engine
- Assignment rule engine
- Advanced settings (users, roles, subscriptions)

### Phase 6 — Integrations & Polish (weeks 22+)
- Facebook Ads / Remarketing
- Video calls / click-to-call
- Role-based access control
- Audit log, mobile polish, i18n

---

## Open Questions for Product Review

1. **RBAC model** — what roles exist (Counselor, Admin, Manager, SuperAdmin)? What can each do?
2. **Multi-tenancy** — one DB for all institutes or tenant-per-institute?
3. **Lead ownership** — round-robin, geo, program, or manual? (Assignment Rules UI suggests configurable)
4. **WhatsApp provider** — Meta Cloud API direct, or aggregator (Gupshup, Interakt, WATI)?
5. **SMS provider** — MSG91, Twilio, others? DLT compliance for India?
6. **Email provider** — SendGrid, SES, Postmark, in-house SMTP?
7. **Telephony provider** — Exotel, Twilio, Knowlarity for click-to-call?
8. **Data retention** — how long to keep call recordings, message logs?
9. **Pricing/quota model** — per-user, per-lead, communication credits?
10. **Lead source deduplication** — merge vs reject vs flag?

---

## File reference index

- Analytics: [src/pages/Dashboard/AnalyticsDashboard.jsx](src/pages/Dashboard/AnalyticsDashboard.jsx)
- Lead list: [src/pages/LeadList/LeadList.jsx](src/pages/LeadList/LeadList.jsx)
- Raw data: [src/pages/RawDataManager/RawDataManager.jsx](src/pages/RawDataManager/RawDataManager.jsx)
- Failed leads: [src/pages/FailedLeads/FailedLeads.jsx](src/pages/FailedLeads/FailedLeads.jsx)
- Bulk ops: [src/pages/BulkUplodList/BulkUploadList.jsx](src/pages/BulkUplodList/BulkUploadList.jsx)
- Follow-ups: [src/pages/FollowUpManager/FollowUpManager.jsx](src/pages/FollowUpManager/FollowUpManager.jsx)
- WhatsApp: [src/pages/WhatsAppList/WhatAppsList.jsx](src/pages/WhatsAppList/WhatAppsList.jsx)
- Bulk campaigns: [src/pages/BulkMarketingCampaign/BulkMarketingCampaign.jsx](src/pages/BulkMarketingCampaign/BulkMarketingCampaign.jsx)
- Drip campaigns: [src/pages/DripMarketingCampaign/DripMarketingCampaign.jsx](src/pages/DripMarketingCampaign/DripMarketingCampaign.jsx)
- Remarketing: [src/pages/Remarketing/Remarketing.jsx](src/pages/Remarketing/Remarketing.jsx)
- Automation: [src/pages/AutomationWorkflow/AutomationWorkflow.jsx](src/pages/AutomationWorkflow/AutomationWorkflow.jsx)
- Connected accounts: [src/pages/ConnectedAccounts/ConnectedAccounts.jsx](src/pages/ConnectedAccounts/ConnectedAccounts.jsx)
- Settings: [src/pages/Settings/Settings.jsx](src/pages/Settings/Settings.jsx)
- Advanced settings: [src/pages/AdvancedSettings/AdvancedSettings.jsx](src/pages/AdvancedSettings/AdvancedSettings.jsx)
- Third-party: [src/pages/ThirdPartyIntegration/ThirdPartyIntegration.jsx](src/pages/ThirdPartyIntegration/ThirdPartyIntegration.jsx)
- Routes: [src/App.jsx](src/App.jsx)
- Theme: [src/theme/colors.js](src/theme/colors.js)
