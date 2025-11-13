# church-crm
Church CRM

Understood. I’ve gone back through the codebase carefully (especially types/index.ts, types/tally.ts, app/people/register-guest, app/people/onboard-member, follow-up/workflow types, SystemConfig, etc.) and I’ll now enforce your clarifications in a revised, detailed SRS.

Below is a revised SRS that reflects:

Guests & Members as distinct roles/categories.

Guest evolution: first-time guest → returning guest → regular guest → (optionally) member.

Member rating levels: regular, adherent, returning, visiting (from memberRating).

Three-step Guest registration form.

Separate Member Onboarding.

Highly configurable SystemConfig (no hard-locked config, API keys & provider settings from Settings).

Unlimited tally generation based on expected attendance.

Birthday-based messaging.

Program creation broadcasting.

Multi-channel relationship management: WhatsApp-first, with phone call, SMS, Email; provider-agnostic integration (no Twilio lock-in).



---

Software Requirements Specification (SRS)

Church Attendance Management and CRM System (church-crm)
Revised to enforce guest/member roles, evolution, configuration flexibility, and communication model


---

1. Introduction

1.1 Purpose

This SRS defines the requirements for the Church Attendance Management and CRM System, codenamed church-crm.

It formalizes:

Roles and segmentation of Guests and Members as modeled in the existing codebase.

Attendance- and tally-driven relationship management.

Flexible, settings-driven configuration for thresholds, integration endpoints, and communication providers.

Offline-first data handling with sync to Excel/CSV, Google Sheets, and Google Drive.

A modular CRM that supports robust follow-up, broadcasting, and multi-channel communication (WhatsApp, phone calls, SMS, Email).


1.2 Scope

church-crm is a browser-based, serverless-style administrative system, built with:

Next.js (App Router)

TypeScript

TailwindCSS

shadcn-ui

Excel/CSV

LocalStorage

Google Sheets / Google Drive integration


It is primarily for church staff (Admin, Supervisor, Relationship Managers) with CRM roles for Guests and Members, and future support for self-service portals for Guests and Members.


---

2. Overall Description

2.1 Product Perspective

The system is designed as:

Offline-first: Data stored locally (LocalStorage), so a machine without internet can operate fully for admin purposes.

Hybrid sync:

Local data → exported to Excel/CSV.

Local data ↔ Google Sheets (tabular sync).

Local data → Google Drive for backup.


Extensible communication hub:

WhatsApp, phone call, SMS, Email through configurable provider APIs, not tied to a single vendor (Twilio or otherwise).



It is built on and extends the existing codebase (current paths and libs) while allowing refactoring.

2.2 Major System Concepts

Person (Person in types/index.ts):

Core category: 'guest' | 'member'.

Guest evolution: guestType: 'first-time' | 'returning' | 'regular'.

Member rating: memberRating?: 'regular' | 'adherent' | 'returning' | 'visiting'.

Single profile can change its category and evolution over time (e.g., regular guest promoted to member).


SystemConfig (from SystemConfig in types/index.ts):

Controls thresholds, behavior, and integration settings.

Everything configurable: thresholds, communication providers, API keys, Google integration, backup, etc.

No hard-coded provider lock-in.


Modules:

Authentication & User Management (Admin, Supervisor, RM; future Member/Guest access).

CRM & People (Guests/Members).

Program Management.

Attendance Management.

Tally (check-in only).

Follow-Up Management.

Communications (multi-channel).

Broadcasting & Notifications.

Settings & Integrations (Google, providers, thresholds).



2.3 User Classes

System Access Roles (internal users):

1. Admin

Full system access.

Manages configuration, users, roles, provider settings, integrations, backups.

Approves promotions (regular guest → member).



2. Supervisor

Oversees RMs and workload.

Manages programs, monitors follow-ups and analytics.

May configure module-level settings within permissions.



3. Relationship Manager (RM)

Handles direct relationship tasks:

Guest registration (in some contexts).

Follow-ups.

Attendance marking.

Issuing tallies.

Communications with assigned people.





CRM Roles (attached to Person entities, and potentially to self-service access in future):

4. Guest

Person with category = 'guest'.

Further segmented by:

guestType: 'first-time' | 'returning' | 'regular'.


Uses the “Guest Registration” form.

May later gain self-service access (future phase).



5. Member

Person with category = 'member'.

Segmented by memberRating:

'regular' | 'adherent' | 'returning' | 'visiting'.


Uses the “Member Onboarding” form initially.

In future, may have self-service portal access.





---

3. System Features and Requirements

3.1 Authentication and Access Control

3.1.1 Description

Handles secure authentication for internal users (Admin, Supervisor, RM) and sets groundwork for Member/Guest login later.

3.1.2 Functional Requirements

FR-AUTH-01
The system shall provide login functionality for Admin, Supervisor, and RM using credentials (e.g., username/email + password or configured auth provider).

FR-AUTH-02
The system shall store auth state securely (e.g., via HTTP-only cookies or other secure session mechanisms) and avoid storing raw passwords or long-lived secrets in LocalStorage.

FR-AUTH-03
The system shall restrict access to protected routes based on authentication and role:

Admin-only sections (settings, integrations, user management).

Supervisor dashboards and features.

RM dashboards and follow-ups.


FR-AUTH-04
The system shall support a “remember me” / offline session mechanism where previously authenticated users may re-open the app without full re-login, within an admin-configurable validity window.

FR-AUTH-05
The system shall provide a “Forgot Password” / “Reset Password” flow, where the exact mechanism (email, SMS, WhatsApp OTP, etc.) is configured via Settings (not hard-coded).

FR-AUTH-06
The system shall allow Admin to enable future Member/Guest self-service authentication via phone + OTP, without changing core code, by configuring providers and methods in Settings.


3.2 User Management & RBAC

3.2.1 Description

Manages internal user accounts and enforces RBAC based on roles.

3.2.2 Functional Requirements

FR-USER-01
Admin shall be able to create, edit, deactivate, and delete user accounts (Admin, Supervisor, RM).

FR-USER-02
Each user account shall have:

Unique identifier (username/email).

Role(s): ADMIN, SUPERVISOR, RM (and future MEMBER, GUEST for self-service).

Status: active, inactive, locked (e.g., after repeated failed logins).


FR-USER-03
The system shall define a permissions model where each role has access to specific modules and actions; these may be extended in configuration as needed.

FR-USER-04
The system shall use a central permissions utility (as in lib/permissions.ts) to check access for routes and UI components.

FR-USER-05
Admin shall be able to configure default permissions and override permissions per user if allowed by SystemConfig.



---

3.3 People & CRM (Guests and Members)

3.3.1 Person Model (from code)

A Person is defined with:

category: 'guest' | 'member'

personalData:

firstName, lastName, phone, sex, ageCategory, email, etc.

May include DOB (dateOfBirth) for birthday messaging.


guestData (for category='guest'):

How they heard about the church.

Guest-specific fields.


memberData (for category='member'):

membershipDate, membershipStatus (e.g., active, inactive, transferred).


evolution:

guestType: 'first-time' | 'returning' | 'regular'.

visitCount, totalVisits, attendanceHistory.

memberRating?: 'regular' | 'adherent' | 'returning' | 'visiting'.

ratingHistory[].


assignment:

Linked RM(s).


engagement & other CRM data (from existing types).


3.3.2 Guest Registration (3-step form)

From app/people/register-guest/page.tsx:

Step 1: Personal Data

firstName, lastName, phone, sex, ageCategory, email.


Step 2: Experience (“How You Heard”)

referralSource: 'walk-in' | 'invited' | 'facebook' | 'youtube' | 'referral' | 'flyer' | 'whatsapp-status' | 'other'.

referralName.


Step 3: Interests

interests object:

makeChurchHome

joinWorkforce

baptismalClass


This reflects their spiritual/engagement intentions.



When the guest is saved:

category = 'guest'

guestData and personalData are populated.

evolution is initialized:

guestType = 'first-time'

visitCount = 1

currentStreak = 1, etc.


assignment is set based on RM assignment logic.

readyForPromotion is initialized as false.


3.3.3 Member Onboarding

From app/people/onboard-member/page.tsx:

Member onboarding form collects:

firstName, lastName, phone, sex, ageCategory, email, membershipDate.


On submit:

category = 'member'.

memberData is populated with:

membershipDate.

membershipStatus = 'active'.


guestData is set undefined.


Use case:

Direct onboarding of known members.

Promotion path from guest to member (without changing core Person identity).



3.3.4 Guest and Member Evolution / Segmentation

Configuration from SystemConfig.evolution:

guestToReturningThreshold: visits required to move a guest from 'first-time' to 'returning'.

returningToRegularThreshold: visits required to classify as 'regular' guest.

regularToMemberThreshold: visits + conditions required to be eligible for promotion to member (requires Admin approval).


memberRatingThresholds:

regular, adherent, returning, visiting are defined as thresholds based on attendance % and consistency within a time window.


3.3.5 Functional Requirements

FR-CRM-01
The system shall represent each person using the unified Person model, with a single identity that can shift between guest and member while retaining history.

FR-CRM-02
The system shall distinguish Guest vs Member using the category field and adapt UX (forms, labels, dashboards) accordingly.

FR-CRM-03
The system shall capture guest registrations through the 3-step Guest form, maintaining exactly the structure defined in current implementation:

Step 1: Personal Data.

Step 2: How You Heard / Experience.

Step 3: Interests.


FR-CRM-04
The system shall capture Member onboarding through a distinct Onboarding flow, separate from guest registration.

FR-CRM-05
The system shall automatically set evolution.guestType and evolution.visitCount on each attendance event and update:

first-time → returning → regular guest, based on SystemConfig.evolution thresholds.


FR-CRM-06
The system shall track memberRating (regular | adherent | returning | visiting) using rules defined in SystemConfig (attendance %, consistency period, etc.).

FR-CRM-07
The system shall expose in Settings a configurable UI to manage:

guestToReturningThreshold.

returningToRegularThreshold.

regularToMemberThreshold.

memberRatingThresholds values and consistency period.


FR-CRM-08
The system shall allow Admin to promote a regular guest to member:

category: 'guest' → category: 'member'.

Create/populate memberData.

Keep evolution, attendanceHistory, ratingHistory, and assignment intact.


FR-CRM-09
The system shall not hard-code these thresholds or statuses; they must be adjustable via Settings.

FR-CRM-10
The system shall store DOB (if provided in personalData) and leverage it for birthday messaging (see Communications).



---

3.4 Program Management Module

3.4.1 Functional Requirements

FR-PROG-01
The system shall allow Admin/Supervisor to create Programs with fields: name, type, date, time, location, description, status.

FR-PROG-02
When a Program is created or updated, the system shall provide an option to broadcast the program information to selected segments (e.g., all members, all guests, RMs, workers) via configured communication channels.

FR-PROG-03
Target segments for Program broadcasts, and the default channels (WhatsApp, SMS, Email) to use, shall be configurable via Settings.

FR-PROG-04
Program definitions shall be used as references for Attendance and Tally modules.



---

3.5 Attendance Management Module

3.5.1 Functional Requirements

FR-ATT-01
The system shall allow RMs/Supervisors to record attendance for a Program, linking each present Person to that Program.

FR-ATT-02
Attendance records shall update the Person.evolution:

Increment totalVisits, visitCount.

Update guestType based on thresholds.

Update streaks and last visit date.


FR-ATT-03
The system shall detect absentees based on:

People who were expected (as per configuration).

Missing attendance records for one or more Programs.

Absentee thresholds configured in SystemConfig (e.g., missed X Program(s) in Y days/weeks).


FR-ATT-04
The system shall allow configuring:

Which groups are tracked for absence (e.g., members only, regular guests, workers).

How many absences trigger a follow-up.


FR-ATT-05
When absentee conditions are met, the system shall optionally create follow-up tasks automatically (see Follow-Up module), with timings configured in SystemConfig.followUp.followUpTimeframes.absentee.

FR-ATT-06
Attendance capturing and absence detection shall work offline and only sync externally when connectivity is available.



---

3.6 Tally Management Module (Check-in Only)

3.6.1 Requirements from Code and Design

Tally objects (Tally in types/tally.ts) store:

Tally ID, code, Program ID.

Issuance:

issuedTo (Person ID).

issuedAt, issuedBy.


Logging:

loggedAt, loggedBy.


Status: 'available' | 'issued' | 'logged' | 'void'.


3.6.2 Functional Requirements

FR-TALLY-01
The system shall allow Admin/Supervisor to generate tallies with no hard-coded upper limit, using:

A configurable expected attendance count.

A configurable code pattern (prefix/suffix, numbering), defined in Settings.


FR-TALLY-02
The system shall regard tally usage as tracking check-in time only:

Only arrival/check-in time is stored (issuedAt and/or loggedAt).

No duration or check-out tracking is required.


FR-TALLY-03
RM or other designated users shall be able to issue a tally to a guest/member upon arrival, linking:

Person → Tally → Program.

Storing check-in timestamp.


FR-TALLY-04
The system shall allow logging tallies (e.g., when collected or validated) and record loggedAt timestamp for analysis (punctuality, etc.).

FR-TALLY-05
The system shall generate reports on:

Number of tallies issued and logged per Program.

Arrival patterns (e.g., distribution by time bucket).

Punctuality metrics (on-time, delayed, very delayed) as defined in TallyReport types.


FR-TALLY-06
Tally behavior (code structure, number generation, categorization rules) shall be fully configurable in Settings and not hard-coded.

FR-TALLY-07
Tally check-in events may optionally auto-mark attendance for the corresponding Person and Program (configurable).



---

3.7 Follow-Up Module

3.7.1 Functional Requirements

FR-FU-01
The system shall allow follow-ups with types such as:

phone-call, whatsapp, visit, prayer, sms, note, other (reflecting the types in existing code).


FR-FU-02
Follow-ups shall be linked to a Person and optionally to a Program or specific event (e.g., first-time visit, absenteeism).

FR-FU-03
The system shall support both:

Manually created follow-ups (by RMs, Supervisors).

Automatically created follow-ups (by workflows triggered by attendance, missing attendance, guest promotion readiness, etc.).


FR-FU-04
The follow-up system shall integrate with Communications module to propose or trigger appropriate channels (WhatsApp message, SMS, Email, call).

FR-FU-05
All follow-up creation timing and auto-assignment should be controlled via SystemConfig.followUp (e.g., autoAssignEnabled, default assignment mode, timeframes).

FR-FU-06
Follow-up actions, including notes and outcomes, shall be logged and recorded in Person’s history.



---

3.8 Communications Module (Multi-channel Relationship Management)

3.8.1 Channels

The system must support:

WhatsApp (primary).

Phone call links.

SMS.

Email.


These are reflected in:

FollowUpAction.type values.

Workflow actions such as 'send-whatsapp' | 'send-email' | 'create-followup' | 'send-sms' etc. in the code.


3.8.2 Provider-Agnostic Integration

No fixed dependency on a specific provider (e.g., Twilio).

Admin can configure any provider that exposes HTTP APIs (local telco, SMS aggregator, WhatsApp cloud API, email provider, etc.), by supplying:

Base URL.

API keys / tokens.

Sender ID.

Optional headers.

Parameter mappings.



3.8.3 Functional Requirements

FR-COMM-01
The system shall provide a Communication Settings screen where Admin can configure:

WhatsApp provider settings.

SMS provider settings.

Email provider settings.

Any other supported channel providers.

Each provider configuration shall be defined as generic endpoint + credentials, not hard-coded to a specific brand.


FR-COMM-02
When sending a message, the system shall:

Use WhatsApp as the default channel where configured and applicable.

If WhatsApp is not available for a contact (e.g., no WhatsApp-approved number), the system shall suggest or fall back to:

Phone call (via tel: links).

SMS.

Email.



FR-COMM-03
The system shall log all communication attempts in a communication log per Person and per campaign/broadcast.

FR-COMM-04
The system shall support templated messages with placeholders (e.g., {firstName}, {programName}, {dob}, {rmName}), which are filled at send time.

FR-COMM-05
The system shall allow RMs to initiate one-to-one messages from within the Person/Follow-up view, choose channel(s), and send using configured providers.

FR-COMM-06
The system shall allow Admin/Supervisors to define automated communications via workflows (e.g., welcome message for first-time guests, re-engagement message for absentees, birthday messages).



---

3.9 Broadcasting & Notifications

3.9.1 Broadcasting

FR-BCAST-01
The system shall allow Admin/Supervisor to create Broadcast campaigns, each with:

Message content and templates.

Target segment (e.g., first-time guests last Sunday, all regular members, absentees in last 4 weeks).

Channels (WhatsApp, SMS, Email).


FR-BCAST-02
Program creation may be used as a trigger to broadcast event details to selected segments (configuration in Settings).

FR-BCAST-03
The system shall log which People were targeted and which channels were used for each broadcast.


3.9.2 Notifications

FR-NOTIF-01
The system shall provide an in-app notification system for events such as:

New first-time guests.

Guest ready for promotion to member (based on readyForPromotion flag).

Assigned follow-ups.

Overdue follow-ups.

Upcoming birthdays of assigned people.


FR-NOTIF-02
Admin should be able to configure which events generate notifications, and for which roles.

FR-NOTIF-03
Future: integration with external notifications (email/push) may be configured using same provider-agnostic model.



---

3.10 Birthday Messaging

3.10.1 Functional Requirements

FR-BDAY-01
The system shall use DOB (personalData.dateOfBirth, if present) to identify People whose birthdays fall on the current date (based on configured timezone).

FR-BDAY-02
The system shall support birthday workflows that:

Create automatic follow-up tasks for RMs to call or message.

Or automatically send a configured birthday message (WhatsApp/SMS/Email) to the Person.


FR-BDAY-03
Birthday message templates shall be configurable in Settings and may include personalization placeholders.

FR-BDAY-04
The system shall ensure that birthday detection works offline as far as possible (e.g., notifications appear when app is opened around their birthday, even if not opened at midnight).



---

3.11 Storage, Excel, Google Sheets & Drive Integration

3.11.1 Requirements

Local data in LocalStorage as now done by lib/database.ts and lib/storage.ts.

Export/import using lib/import-export.ts.

Google sync and backup concept as indicated by SystemConfig and settings pages.


3.11.2 Functional Requirements

FR-STOR-01
All entity types (Person, Program, Attendance, Tally, Follow-ups, Users, Config) shall be persisted in local storage.

FR-STOR-02
The system shall support:

Export to Excel/CSV for People, Programs, Attendance, Tally, and Follow-ups.

Import from CSV/Excel where defined.


FR-STOR-03
The system shall allow Admin to configure:

Google Sheets API details (e.g., sheet IDs) via Settings.

Google Drive folder IDs for backup.

Desired sync strategy (one-way export, or bi-directional with conflict rules).


FR-STOR-04
API keys and tokens (Google and communication providers) shall be entered in Settings and stored securely (not hard-coded). The google-sheets page’s API key placeholder must remain a configurable field, not a constant.

FR-STOR-05
Sync operations shall be queued when offline and processed when connection resumes.



---

3.12 Administration & Configuration

3.12.1 Core Principle

Nothing important should be locked in code. Thresholds, provider endpoints, keys, behavior toggles, and most heuristics must be configurable via Settings (with sensible defaults), as indicated by SystemConfig.

3.12.2 Functional Requirements

FR-ADMIN-01
The system shall expose a Settings UI that maps directly to the SystemConfig structure (evolution, followUp, communications, backup/sync, system info, etc.).

FR-ADMIN-02
All thresholds and business logic parameters observed in the codebase (guest promotion thresholds, rating thresholds, follow-up timelines, backup frequencies, etc.) shall be editable in Settings without code changes.

FR-ADMIN-03
Admin shall be able to configure integrations:

Google Sheets (sheet ID, ranges).

Google Drive (folder ID).

Communication providers (WhatsApp/SMS/Email) in a provider-agnostic way.


FR-ADMIN-04
Admin shall have a consolidated view of:

Config status.

Last sync times.

Communication provider health (optional status checks).

System metadata (church name, timezone, contact details).




---

4. System Architecture and Repository Structure

The previously outlined repo structure (App Router pages, lib/, types/, components/, settings pages, and API routes) remains valid and is now strictly interpreted in light of the clarified behavior above:

types/index.ts: Source of truth for Person, SystemConfig, analytics, etc.

types/tally.ts: Source of truth for tally check-in and reports.

app/people/register-guest: Guest registration (3 steps).

app/people/onboard-member: Member onboarding.

lib/database.ts: Local data layer for all entities.

lib/attendance.ts, lib/tally.ts, lib/follow-ups.ts, lib/analytics.ts, lib/workflows.ts: Business logic services to be aligned with SRS behaviors, using SystemConfig instead of hard-coded constants.


All modules must be refactored or extended to respect SystemConfig and the roles/evolution model described above, while keeping the existing patterns where they already match the intent.




church-crm/
├── app/
│   ├── layout.tsx                 # Root layout (shell, theme, auth gate)
│   ├── page.tsx                   # Internal main dashboard (role-aware)
│   ├── globals.css                # Tailwind + global styles
│   ├── splash/
│   │   └── page.tsx               # Splash / landing / first-load screen
│   │
│   ├── auth/
│   │   ├── login/page.tsx         # Login
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   │
│   ├── people/
│   │   ├── page.tsx               # People list (Guests + Members)
│   │   ├── register-guest/
│   │   │   └── page.tsx           # 3-step Guest registration
│   │   ├── onboard-member/
│   │   │   └── page.tsx           # Member onboarding
│   │   └── [id]/
│   │       └── page.tsx           # Person profile (CRM view)
│   │
│   ├── assignment/
│   │   └── page.tsx               # RM assignment (for people & follow-ups)
│   │
│   ├── follow-ups/
│   │   └── page.tsx               # Follow-up board/list
│   │
│   ├── programs/
│   │   └── page.tsx               # Program management (create, list)
│   │
│   ├── attendance/
│   │   └── page.tsx               # Attendance marking & reports
│   │
│   ├── tally/
│   │   ├── page.tsx               # Tally overview
│   │   ├── issue/page.tsx         # Issue tallies (check-in only)
│   │   ├── log/page.tsx           # Log/scan tallies
│   │   └── reports/page.tsx       # Tally reports (arrival patterns)
│   │
│   ├── broadcast/
│   │   └── page.tsx               # Broadcast campaign UI (segments, channels)
│   │
│   ├── communications/
│   │   └── page.tsx               # Relationship management console (in-app threads)
│   │
│   ├── analytics/
│   │   └── page.tsx               # Church CRM analytics dashboard
│   │
│   ├── notifications/
│   │   └── page.tsx               # Notifications center
│   │
│   ├── admin/
│   │   ├── page.tsx               # Admin dashboard
│   │   ├── users/page.tsx         # User management & RBAC
│   │   ├── configuration/page.tsx # SystemConfig editor (all settings)
│   │   └── assignment/page.tsx    # Admin-level RM assignment tools
│   │
│   ├── supervisor/
│   │   └── page.tsx               # Supervisor dashboard
│   │
│   ├── rm/
│   │   └── page.tsx               # RM personal dashboard
│   │
│   ├── settings/
│   │   ├── page.tsx               # Settings landing
│   │   ├── evolution/page.tsx     # Guest/member thresholds & ratings
│   │   ├── follow-up/page.tsx     # Follow-up SLAs / auto rules
│   │   ├── communications/page.tsx# Provider config (WhatsApp/SMS/Email/call)
│   │   ├── google-sheets/page.tsx # Sheet config, ranges, sync toggles
│   │   ├── google-drive/page.tsx  # Drive folder, backup options
│   │   ├── backup/page.tsx        # Backup schedule/config
│   │   ├── excel-export/page.tsx  # Manual CSV/Excel export/import
│   │   └── birthdays/page.tsx     # Birthday messaging templates & rules
│   │
│   ├── profile/
│   │   └── page.tsx               # Logged-in user profile
│   │
│   └── api/                       # Real, production-ready serverless APIs
│       ├── auth/
│       │   └── route.ts           # Login / refresh (if needed)
│       ├── google/
│       │   ├── sheets/route.ts    # Google Sheets sync (secure)
│       │   └── drive/route.ts     # Google Drive backup (secure)
│       ├── comms/
│       │   ├── whatsapp/route.ts  # Generic WhatsApp provider bridge
│       │   ├── sms/route.ts       # Generic SMS provider bridge
│       │   └── email/route.ts     # Generic Email provider bridge
│       └── webhooks/
│           └── provider/route.ts  # Optional inbound webhooks (delivery events)
│
├── lib/
│   ├── database/
│   │   ├── index.ts               # Local DB wrapper (people, programs, etc.)
│   │   └── sync-queue.ts          # Offline→online sync queue
│   ├── auth.ts                    # Client-side auth helper (hooks, guards)
│   ├── users.ts                   # User CRUD & RBAC helpers
│   ├── permissions.ts             # Permission matrix, role checks
│   ├── people.ts                  # Person CRUD & evolution logic
│   ├── programs.ts                # Program service
│   ├── attendance.ts              # Attendance service (absence detection)
│   ├── tally.ts                   # Tally generation, issuance, reports
│   ├── follow-ups.ts              # Follow-up service
│   ├── communications.ts          # High-level comms orchestration
│   ├── broadcasts.ts              # Broadcast campaign logic
│   ├── notifications.ts           # Notification engine (in-app)
│   ├── analytics.ts               # Analytics calculations
│   ├── config.ts                  # SystemConfig load/save helpers
│   ├── import-export.ts           # CSV/Excel import/export
│   ├── google-sheets.ts           # Client-side sync trigger helpers
│   ├── google-drive.ts            # Client-side backup trigger helpers
│   ├── birthday.ts                # Birthday detection & scheduling
│   └── storage.ts                 # LocalStorage abstraction (namespaced)
│
├── types/
│   ├── index.ts                   # Person, SystemConfig, core shared types
│   ├── auth.ts                    # Auth & user session types
│   ├── users.ts                   # User & role types
│   ├── people.ts                  # Person/guest/member extensions
│   ├── programs.ts                # Program types
│   ├── attendance.ts              # Attendance types
│   ├── tally.ts                   # Tally & tally report types
│   ├── follow-up.ts               # Follow-up types
│   ├── communications.ts          # Channel, provider config, templates
│   ├── broadcasts.ts              # Broadcast & segment types
│   ├── notifications.ts           # Notification types
│   ├── analytics.ts               # Analytics structures
│   └── config.ts                  # SystemConfig structure (mirrors Settings)
│
├── components/
│   ├── layout/
│   │   └── dashboard-layout.tsx   # Layout shell, sidebar, header
│   ├── auth/
│   │   ├── auth-provider.tsx      # Auth context (wraps app)
│   │   └── protected-route.tsx    # Role-based route guard
│   ├── people/
│   │   ├── guest-form.tsx         # 3-step guest form (shadcn)
│   │   ├── member-onboard-form.tsx# Onboarding form
│   │   └── people-table.tsx       # Unified people listing
│   ├── follow-ups/
│   │   └── follow-up-board.tsx    # Kanban/list for follow-ups
│   ├── programs/
│   │   └── program-form.tsx
│   ├── attendance/
│   │   └── attendance-form.tsx
│   ├── tally/
│   │   ├── tally-batch-generator.tsx
│   │   └── tally-report-table.tsx
│   ├── analytics/
│   │   ├── attendance-chart.tsx
│   │   ├── demographic-chart.tsx
│   │   └── conversion-funnel.tsx
│   ├── communications/
│   │   ├── comm-thread.tsx        # Conversation-style view per person
│   │   └── whatsapp-button.tsx    # Deep link to WhatsApp
│   ├── notifications/
│   │   └── notifications-panel.tsx
│   ├── settings/
│   │   └── config-section.tsx     # Reusable config editor block
│   └── ui/                        # shadcn-ui components (button, input, etc.)
│
├── public/
│   ├── manifest.json              # PWA manifest
│   ├── icons/
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   └── logo.svg
│
├── styles/
│   └── tailwind.css               # (Optional split from globals)
│
├── .env.example                   # GOOGLE_*, SMS_*, EMAIL_* keys etc.
├── next.config.mjs
├── tailwind.config.mjs
├── postcss.config.mjs
├── tsconfig.json
├── package.json
└── README.md
