# Enterprise Intelligence Platform

Enterprise investigation Workbench with evidence-aware AI analysis, entity resolution, relationship graphs, auditability, and a pluggable collection layer.

## Current architecture

- Next.js + TypeScript application
- PostgreSQL via Prisma
- Server-side NVIDIA NIM integration through the OpenAI-compatible SDK
- Investigation Workbench UI
- Evidence / entity / relationship / finding data model
- Organization and role primitives
- Audit event model

## AI provider

The platform uses NVIDIA hosted NIM APIs through `https://integrate.api.nvidia.com/v1`. NVIDIA documents these endpoints as OpenAI-compatible, so the application uses the standard OpenAI Node SDK with a NVIDIA base URL. The default model is `nvidia/nemotron-3-super-120b-a12b`, selected for reasoning, planning, and tool-calling workloads. citeturn407120search9turn407120search0

## Security

`NVIDIA_API_KEY` is server-only. Never place API keys in browser code or commit them to Git.

The collection layer is designed for lawful public and organization-authorized sources. It must respect source access controls, rate limits, privacy requirements, and applicable law.

## Required environment

Copy `.env.example` to `.env.local` for local development and configure a PostgreSQL database plus your NVIDIA API key.

```text
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/enterprise_intelligence"
NVIDIA_API_KEY="your-nvidia-key"
NVIDIA_BASE_URL="https://integrate.api.nvidia.com/v1"
NVIDIA_MODEL="nvidia/nemotron-3-super-120b-a12b"
```

## Run

```bash
npm install
npx prisma generate
npm run dev
```

The application currently provides a Workbench shell and an evidence-conscious AI investigation endpoint. Live connector integrations, production authentication, deployment configuration, and end-to-end tests are being added incrementally.
