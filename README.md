# Memoria'26 — Event Ticketing & Gate Access Management Platform

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/react-18.x-61dafb.svg)](https://reactjs.org/)
[![Database](https://img.shields.io/badge/database-PostgreSQL%2016-blue.svg)](https://www.postgresql.org/)

A high-performance, enterprise-grade ticketing, bank-transfer verification, and gate access management system built for **Memoria'26 — The Eclipse Of Memories** (Annual Cultural Event, University of Sri Jayewardenepura).

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Technology Stack](#2-technology-stack)
3. [User Roles & RBAC Matrix](#3-user-roles--rbac-matrix)
4. [Core Business Logic & Features](#4-core-business-logic--features)
5. [Database Schema & Architecture](#5-database-schema--architecture)
6. [API Reference](#6-api-reference)
7. [Email Delivery Engine & SMTP Guide](#7-email-delivery-engine--smtp-guide)
8. [Installation & Setup](#8-installation--setup)
9. [Development & Server Operations](#9-development--server-operations)
10. [Automated Testing Suite](#10-automated-testing-suite)
11. [Administrative Playbook & Troubleshooting](#11-administrative-playbook--troubleshooting)

---

## 1. System Architecture

Memoria'26 separates concerns between a reactive client application and a hardened, transaction-safe Node.js backend backed by **PostgreSQL 16** with asynchronous connection pooling and row-level locking for zero gate check-in contention:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Client (Browser)                              │
│  React 18 + Vite + Tailwind CSS + Lucide Icons + Framer Motion + HTML5  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP / REST / JSON
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Express API Server (Port 5000)                     │
│  - Correlation ID Middleware (X-Request-Id)                             │
│  - JWT Bearer Authentication & Strict RBAC Enforcement                  │
│  - Anti-Tampering Price Calculation                                     │
│  - Rate Limiting, CORS & Error Handling                                 │
├─────────────────┬───────────────────┬───────────────────┬───────────────┤
│  Auth Service   │  Ticket Service   │ Approval Service  │ Checkin Serv. │
├─────────────────┴───────────────────┴───────────────────┴───────────────┤
│  Email Service (Nodemailer Pool + Dynamic SMTP + Gmail Deliverability)  │
├─────────────────────────────────────────────────────────────────────────┤
│  Audit & Error Management Engine (System & Activity Audit Logs)         │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Asynchronous Connection Pool (pg.Pool)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              PostgreSQL Database (Port 5432 / Local / Cloud)            │
│  - Row-level locking (FOR UPDATE) for simultaneous gate scanners        │
│  - Atomic allocation decrement & idempotent check-ins                   │
│  - 10 Relational Tables: Users, Submissions, History, Audits, SMTP, etc.│
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Bundler & Dev Server**: Vite 5.4
- **Routing**: React Router DOM v6
- **Styling**: Tailwind CSS, CSS Custom Properties, PostCSS
- **Animation**: Framer Motion
- **Icons**: Lucide React
- **QR Scanner**: `html5-qrcode` (dual-engine: environment camera + file fallback)
- **State Management**: Zustand & React Context

### Backend
- **Runtime**: Node.js 18+ (tested on Node v22)
- **Server Framework**: Express 5
- **Execution**: TypeScript via `tsx`
- **Database**: Pure PostgreSQL 16 via `pg.Pool` (connection pooling, parameterized queries)
- **Security & Crypto**: `bcryptjs` (password hashing), `jsonwebtoken` (JWTs), native Node `crypto` (secure tokens)
- **Email Delivery**: `nodemailer` (connection pooling, dynamic transport, RFC 5322 formatting)
- **File Uploads**: `multer` with MIME verification & size limiting

---

## 3. User Roles & RBAC Matrix

The system implements Role-Based Access Control (RBAC) across four user levels:

| Feature / Action | Public / Attendee | Approver | Check-in Staff | Administrator |
| :--- | :---: | :---: | :---: | :---: |
| Submit Ticket Registration | ✅ | ✅ | ✅ | ✅ |
| Upload Bank Payment Slip | ✅ | — | — | — |
| View Pending Review Queue | — | ✅ | — | ✅ |
| Verify Bank Transfer Slip | — | ✅ | — | ✅ |
| Approve Application & Issue Pass | — | ✅ | — | ✅ |
| Reject Application with Reason | — | ✅ | — | ✅ |
| Trigger Suspicious Admin Alert | — | ✅ | — | ✅ |
| Resend Ticket Pass Email | — | ✅ | — | ✅ |
| Scan Admission QR Codes at Gate | — | — | ✅ | ✅ |
| Manual Ticket Check-in by ID/RegNo | — | — | ✅ | ✅ |
| View Live Gate Attendance Sync | — | — | ✅ | ✅ |
| Edit Submission Details | — | — | — | ✅ |
| Emergency QR Pass Reissuance | — | — | — | ✅ |
| User & Role Administration | — | — | — | ✅ |
| SMTP Configuration & Reset | — | — | — | ✅ |
| System Error Logs & Audit Management | — | — | — | ✅ |
| Permanent Record Deletion | — | — | — | ✅ |
| Event Pricing & Database Reset | — | — | — | ✅ |

---

## 4. Core Business Logic & Features

### 1. Authoritative Pricing & Anti-Tampering
Pricing is strictly calculated server-side in `server/services/ticketService.ts`:
- **University Student Pass**: Fixed at **Rs. 200** per registration (requires valid University Registration Number).
- **General Attendee Pass**: Fixed at **Rs. 1,000 × Quantity** (1 to 10 passes per registration).
- Any client-submitted `total_price` or altered price values are discarded and recalculated authoritatively.

### 2. Student Registration Normalization & Deduplication
- Student registration numbers (e.g. `AR/10928`, `ar-10928`, `Ar 10928`) are normalized to lowercase alphanumeric (`ar10928`) stored in `normalized_reg_number`.
- Enforces strict database uniqueness against approved tickets to prevent one student ID from obtaining multiple discounted passes.

### 3. Cryptographic QR Token Generation
- During approval, `qrService` generates a 32-byte cryptographically secure random token (`crypto.randomBytes(32).toString("hex")`).
- Payload format: `MEM26:<TICKET_ID>:<QR_TOKEN>`.
- The QR image is generated as high-resolution PNG data and stored alongside the record.

### 4. Gate Admission & Check-in Protection
- **Single-Use Scans**: Scans execute inside an atomic SQLite transaction:
  ```sql
  UPDATE submissions
  SET is_checked_in = 1, checked_in_at = ?, checked_in_by = ?
  WHERE id = ? AND is_checked_in = 0
  ```
- **Duplicate Prevention**: If `changes === 0`, the scan is rejected immediately with code `ALREADY_CHECKED_IN` and returns the exact earlier check-in timestamp and operator.
- **Revocation Check**: The system checks the `revoked_qr_tokens` table. Any regenerated or replaced QR code is blocked at the gate.

### 5. Email Delivery Hardening & Decoupling
- **Decoupled Lifecycle**: Approval transitions the ticket to `approved` first in an atomic transaction. Outbound email dispatch is decoupled—an SMTP connection failure never invalidates the issued ticket pass.
- **Status Tracking**: The system records `email_status` (`PENDING`, `SENT`, `FAILED`), `email_last_error`, `email_sent_at`, and `email_attempt_count`.
- **Manual Resend**: Both Approvers and Admins can trigger pass re-delivery with 1 click.

---

## 5. Database Schema & Architecture

The database file resides at `./data/memoria.db` with 10 tables:

### 1. `users`
Administrative and operational personnel:
- `id` (TEXT PRIMARY KEY, e.g. `usr-1`)
- `name` (TEXT)
- `email` (TEXT UNIQUE)
- `password_hash` (TEXT, bcrypt cost 10)
- `role` (TEXT: `"admin"`, `"approver"`, `"staff"`)
- `created_at`, `updated_at`

### 2. `submissions`
Primary attendee registration and ticket record:
- `id` (TEXT PRIMARY KEY, e.g. `sub-145778`)
- `ticket_id` (TEXT UNIQUE, e.g. `MEM-26-9235`)
- `name`, `email`, `phone`
- `ticket_type` (`"student"` | `"outsider"`)
- `quantity` (INTEGER)
- `total_price` (INTEGER)
- `university_registration_number` (TEXT)
- `normalized_reg_number` (TEXT)
- `payment_slip_url` (TEXT)
- `status` (`"pending"` | `"approved"` | `"rejected"`)
- `qr_token` (TEXT UNIQUE)
- `qr_payload` (TEXT)
- `qr_image_data` (TEXT, base64 PNG data URL)
- `is_checked_in` (INTEGER 0 or 1)
- `checked_in_at`, `checked_in_by`
- `email_status` (`"PENDING"` | `"SENT"` | `"FAILED"`)
- `email_sent_at`, `email_last_error`, `email_attempt_count`
- `submitted_at`, `approved_at`, `approver`, `rejected_at`, `rejection_reason`, `deleted_at`

### 3. `approval_history`
Immutable log of review actions (`"approved"`, `"rejected"`).

### 4. `scan_audit_logs`
Chronological log of gate admission attempts (`"SUCCESS"`, `"DUPLICATE"`, `"INVALID"`).

### 5. `activity_logs`
User and operator audit trail with JSON metadata.

### 6. `system_audit_logs`
Comprehensive system audit logging engine with correlation IDs (`request_id`), severity, and resolution statuses.

### 7. `admin_alerts`
Approver-flagged suspicious payment slips awaiting administrative resolution.

### 8. `revoked_qr_tokens`
Invalidated QR tokens after emergency regeneration to prevent gate re-entry.

### 9. `smtp_settings`
Persistent runtime SMTP configuration:
- `id` (INTEGER PRIMARY KEY CHECK(id = 1))
- `smtp_host`, `smtp_port`, `smtp_user`, `smtp_pass`, `smtp_secure`, `smtp_from`, `sender_name`, `updated_at`, `updated_by`

### 10. `event_settings`
Event metadata, schedule, and gate capacity.

---

## 6. API Reference

All requests accept and return `application/json`. Authenticated routes require `Authorization: Bearer <JWT>`.

### Public Routes
- `POST /api/tickets/submit` — Submit registration with bank slip proof (multipart/form-data).
- `GET /api/tickets/lookup/:ticketId` — Public pass status check.
- `GET /api/health` — System uptime and database health check.

### Authentication Routes (`/api/auth`)
- `POST /api/auth/login` — Authenticate user and receive JWT token.
- `GET /api/auth/me` — Retrieve current authenticated profile.

### Approval Desk Routes (`/api/approve`) — *Requires `admin` or `approver`*
- `GET /api/approve/pending` — Fetch pending applications queue.
- `GET /api/approve/submissions/:id` — Fetch single application with bank slip.
- `POST /api/approve/approve/:id` — Approve application, issue ticket, dispatch pass email.
- `POST /api/approve/reject/:id` — Reject application with formal reason.
- `POST /api/approve/alert` — Flag suspicious application for Admin review.
- `GET /api/approve/history` — Fetch approval history log.
- `GET /api/approve/stats` — Centralized stats for approver dashboard.
- `POST /api/approve/submissions/:id/resend-email` — Re-dispatch pass email to buyer.

### Gate Check-in Routes (`/api/checkin`) — *Requires `admin` or `staff`*
- `POST /api/checkin/scan` — Process QR admission scan payload.
- `POST /api/checkin/manual` — Check in attendee manually by Ticket ID or Student Reg No.
- `GET /api/checkin/stats` — Real-time attendance counters and sync status.
- `GET /api/checkin/recent` — Recent admission audit logs.

### Administration Routes (`/api/admin`) — *Requires `admin`*
- `GET /api/admin/stats` & `GET /api/admin/statistics` — Authoritative financial and ticket analytics.
- `GET /api/admin/submissions` — Query submissions with sorting, search, and pagination.
- `PUT /api/admin/submissions/:id` — Edit submission attendee details or student reg number.
- `POST /api/admin/submissions/:id/regenerate-qr` — Emergency QR pass replacement & invalidation.
- `POST /api/admin/submissions/:id/resend-email` — Re-dispatch pass email from admin console.
- `DELETE /api/admin/submissions/:id` — Soft-delete or permanently purge submission.
- `GET /api/admin/users` & `POST /api/admin/users` — Manage staff and approver accounts.
- `PUT /api/admin/users/:id/role` — Modify user access tier (protects last admin).
- `GET /api/admin/smtp` & `POST /api/admin/smtp` — View and update runtime SMTP credentials.
- `POST /api/admin/smtp/reset` — Reset runtime SMTP settings to unconfigured default.
- `POST /api/admin/email/test` — Dispatch diagnostic test email.
- `GET /api/admin/system-audit-logs` — Query comprehensive operational log events.
- `POST /api/admin/reset-database` — Full production database reset with admin credentials.

---

## 7. Email Delivery Engine & SMTP Guide

### Gmail SMTP Setup Instructions

1. **Enable 2-Step Verification**:
   Log into your Google account (e.g. `memoria.26.event@gmail.com`) and ensure 2-Step Verification is active.
2. **Generate an App Password**:
   - Navigate to [Google Account Security -> App Passwords](https://myaccount.google.com/apppasswords).
   - Enter App name: `Memoria Ticketing`.
   - Click **Create**. Copy the 16-character code (e.g. `abcd efgh ijkl mnop`).
3. **Configure in Admin Panel**:
   - Log into Memoria'26 as Administrator.
   - Navigate to **Admin Console -> SMTP Settings**.
   - Set parameters:
     - **Host**: `smtp.gmail.com`
     - **Port**: `465` (SSL) or `587` (STARTTLS)
     - **Secure**: `Checked` for port 465, `Unchecked` for 587
     - **Username**: `memoria.26.event@gmail.com`
     - **Password**: `<Your 16-character App Password>`
     - **Sender Address**: `memoria.26.event@gmail.com`
     - **Sender Display Name**: `Memoria'26 Ticketing Desk`
   - Click **Save Settings** (applies dynamically without node restart).
   - Click **Test SMTP Connection** to verify with 1 click.

### Deliverability Optimizations Implemented
- **Standard Attachments**: Pass QR codes are sent as standard attached PNG images (`Memoria26-Ticket-MEM-26-XXXX.png`), preventing Gmail spam quarantines caused by inline `cid:` tags.
- **Clean RFC 5322 Headers**: Properly formatted `"Sender Name" <email@domain.com>` with matching `replyTo`.
- **Dual Content**: Full plaintext alternative alongside lightweight, high text-to-image HTML.

---

## 8. Installation & Setup

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Step-by-Step Installation

1. **Clone repository**:
   ```bash
   git clone <repository_url>
   cd antigry
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set Up PostgreSQL (No Docker Needed)**:
   You can use either a free cloud database or native local PostgreSQL:
   - **Option A (Easiest — Free Cloud DB)**: Create a free database on [Neon.tech](https://neon.tech) or [Supabase.com](https://supabase.com). Copy the connection string directly to your `.env` file as `DATABASE_URL`.
   - **Option B (Local Native Install on Ubuntu/Debian)**:
     ```bash
     sudo apt update && sudo apt install -y postgresql postgresql-contrib
     sudo -u postgres psql -c "CREATE USER memoria WITH PASSWORD 'memoria2026';"
     sudo -u postgres psql -c "CREATE DATABASE memoria OWNER memoria;"
     sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE memoria TO memoria;"
     ```

4. **Configure Environment Variables**:
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` as required:
   ```env
   PORT=5000
   NODE_ENV=development
   DATABASE_URL=postgresql://memoria:memoria2026@localhost:5432/memoria
   PGHOST=localhost
   PGPORT=5432
   PGUSER=memoria
   PGPASSWORD=memoria2026
   PGDATABASE=memoria
   JWT_SECRET=your_super_secret_jwt_key_for_production
   QR_SECRET=your_cryptographically_secure_qr_secret
   FRONTEND_URL=http://localhost:5173
   UNIVERSITY_TICKET_PRICE=200
   OUTSIDER_TICKET_PRICE=1000
   UPLOAD_DIR=./uploads
   ```

5. **Bootstrap & Seed Database**:
   Initial schema creation and seed users are executed automatically on first server boot:
   - **Admin**: `admin@memoria.lk` / `admin123`
   - **Approver**: `approver@memoria.lk` / `approve123`
   - **Staff**: `staff@memoria.lk` / `staff123`

---

## 9. Development & Server Operations

### Running in Development

Run both backend and frontend concurrently:
```bash
npm run dev:all
```

Or run services in dedicated terminals:
- **Backend API Server**:
  ```bash
  npm run server
  ```
  Runs on `http://localhost:5000` (Health: `http://localhost:5000/api/health`).
- **Frontend Development Server**:
  ```bash
  npm run dev
  ```
  Runs on `http://localhost:5173`.

### Production Build

Compile TypeScript and build optimized frontend bundles:
```bash
npm run build
```
The output is generated in `./dist`.

---

## 10. Automated Testing Suite

The repository contains an exhaustive integration and regression test suite covering pricing integrity, student registration uniqueness, concurrent gate scans, audit logging, dynamic SMTP reloads, and RBAC:

```bash
npm run test:backend
```

**Test Coverage (56/56 Tests Passing - 100%)**:
- **Test Group 1**: Pricing & Anti-Tampering (Rs. 200 student, Rs. 1,000 outsider)
- **Test Group 2**: Student Registration Uniqueness & Normalization
- **Test Group 3**: Approval Lifecycle & QR Generation
- **Test Group 4**: Concurrency & Single-Use Check-In (Simulated Simultaneous Scans)
- **Test Group 5**: Email Decoupling & Failure Tolerance
- **Test Group 6**: Permanent QR Association & Retrieval
- **Test Group 7**: Submission Ordering & Filtering
- **Test Group 8**: Centralized Statistics Snapshot
- **Test Group 9**: Role Permission Matrix API Enforcement (401/403)
- **Test Group 10**: High-Risk Deletion & Auditing
- **Test Group 11**: Approver -> Admin Alert Flow
- **Test Group 12**: Privilege Management & Last Admin Protection
- **Test Group 13**: Admin Full Submission Editing
- **Test Group 14**: QR Code Regeneration & Revocation
- **Test Group 15**: Admin-Only Admin Creation
- **Test Group 16**: Password & Profile Management
- **Test Group 17**: Diagnostic Test Email Dispatch
- **Test Group 18**: Database Reset with Admin Password Verification
- **Test Group 19**: 15,000 Attendee Scale Simulation (Indexed lookups < 20ms)
- **Test Group 20**: Revenue Dividend Distribution
- **Test Group 21**: System Audit Logging & Dynamic SMTP Configuration
- **Test Group 22**: Production Hardening & System Error Management
- **Test Group 24**: SMTP Reset, Log Purging & Pass Resend Endpoints

---

## 11. Administrative Playbook & Troubleshooting

### Emergency QR Code Regeneration
If an attendee reports a compromised, stolen, or misdirected QR pass:
1. Log into **Admin Console -> Submissions**.
2. Locate the attendee record and click **Regenerate QR**.
3. Confirm the action in the prompt.
4. The system immediately:
   - Invalidates the old token and writes it to `revoked_qr_tokens`.
   - Generates a new cryptographically secure QR token.
   - Updates the database atomically.
   - Dispatches a replacement pass email with the new QR pass attached.
   - Any attempt to scan the revoked QR at entrance scanners is immediately rejected.

### Resolving Gmail `535-5.7.8 BadCredentials`
If the admin test email or ticket dispatch returns `BadCredentials`:
1. Log into [myaccount.google.com/security](https://myaccount.google.com/security).
2. Verify that 2-Step Verification is active.
3. Generate a new App Password under **App Passwords**.
4. Open **Admin Console -> SMTP Settings**, paste the new 16-character password, and click **Save Settings**.
5. Click **Test SMTP Connection** to verify immediately.

### Authoritative Attendance Synchronization
Gate scanners and admin consoles query the authoritative SQLite database:
- `is_checked_in = 1`
- `checked_in_at IS NOT NULL`
Both `/api/admin/statistics` and `/api/checkin/stats` return identical counts calculated from the database with 0 double-counting.
