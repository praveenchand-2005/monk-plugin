# Enterprise Intelligence Platform

Enterprise investigation Workbench with evidence-aware AI analysis, entity resolution, relationship graphs, auditability, and a pluggable collection layer.

## Current architecture

- Next.js + TypeScript application
- PostgreSQL via Prisma
- Server-side OpenAI Responses API integration
- Investigation Workbench UI
- Evidence / entity / relationship / finding data model
- Organization and role primitives
- Audit event model

## Security

`OPENAI_API_KEY` is server-only. Never place API keys in browser code or commit them to Git.

The collection layer is designed for lawful public and organization-authorized sources. It must respect source access controls, rate limits, privacy requirements, and applicable law.

## Required environment

Copy `.env.example` to `.env.local` for local development and configure a PostgreSQL database.

## Run

```bash
npm install
npx prisma generate
npm run dev
```

The application currently provides a Workbench shell and an evidence-conscious AI investigation endpoint. Live connector integrations, production authentication, deployment configuration, and end-to-end tests are being added incrementally.
