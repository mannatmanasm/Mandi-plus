## Mandi Plus Backend

Node.js / NestJS backend for the Mandi Plus platform. This is a **private company project** – source, environment configuration, and credentials must **not** be shared outside the team.

---

## Tech Stack

- **Runtime**: Node.js (NestJS)
- **Database**: PostgreSQL (TypeORM)
- **Queue**: BullMQ + Redis
- **Storage**: Cloudinary (files & PDFs)
- **Docs**: Swagger (`/api/docs`)

---

## Prerequisites

- Node.js (LTS)
- pnpm
- PostgreSQL
- Redis

Optional (for local file uploads to work):

- Cloudinary account + API keys

---

## Environment Setup

This project uses **pushenv** to sync `.env.*` files securely inside the team.

### 1. Install pushenv (once)

```bash
npm install -g pushenv
```

### 2. Pull env files

Ask your team for the **pushenv passphrase** for this project.  
From the project root (`Mandi-plus`), run:

```bash
pushenv pull
```

When prompted, enter the passphrase shared by the team.  
This will download the required `.env.*` files (for example: `.env.development`, `.env.production`) directly into the project.

> Do **not** commit these `.env` files. They are already ignored by git.

---

## Running the Project

Install dependencies:

```bash
pnpm install
```

Run database migrations:

```bash
pnpm run migration:run
```

Start the dev server:

```bash
pnpm run start:dev
```

The API will be available at:

- REST: `http://localhost:3005`
- Swagger UI: `http://localhost:3005/api/docs`

---

## Key Modules (High Level)

- **Users**: user management, identities (SUPPLIER, BUYER, TRANSPORTER, AGENT)
- **Trucks**: truck management, claim count tracking
- **Invoices**:
  - Create / update invoices
  - Upload weighment slips (Cloudinary)
  - Async invoice PDF generation via BullMQ
  - Export invoices to Excel
- **Claim Requests**:
  - One-to-one with `Invoice`
  - Create claim request by truck number (latest invoice)
  - Admin listing + filters (status, invoice, truck)
  - Update claim status (pending → inprogress → surveyor_assigned → completed)
  - Upload supporting media (stored on Cloudinary)

For detailed change history, see `docs/changes/`.

---

## Conventions

- **Code style**: ESLint + Prettier
- **Migrations**: TypeORM (`src/migrations/*`)
- **Docs**: Any major API / entity / config change should:
  - Update or add a markdown file under `docs/changes/changes-YYYY-MM-DD.md`
  - Briefly describe:
    - What changed
    - Why it changed
    - How it affects existing code / migrations
    - Any developer notes (commands to run, things to test)

---

## Safety Notes

- Never hardcode secrets in the codebase. Always use env vars synced via **pushenv**.
- This repo is **private**; do not upload it (or any generated env files) to public GitHub or any external service.
- For production changes, always:
  - Run migrations on a staging DB first
  - Verify PDFs, uploads, and queues in staging


