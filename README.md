# Nyaaya — Indian Legal Guidance MVP

Nyaaya helps a person describe what happened in ordinary language and receive careful, practical guidance grounded in verified Indian legal sources. It is legal information, not legal advice.

## Why this project exists

This project was created solely to help people understand their situation, preserve important information, and identify practical next steps when facing a legal problem in India.

I believe in the Indian judicial system and in making reliable legal information easier for ordinary people to understand. Nyaaya is intended to support access to justice by helping users navigate verified information—not to replace advocates, courts, legal-aid authorities, police, regulators, or any other institution within the Indian justice system.

The project does not promise outcomes, provide professional legal advice, or claim that every legal remedy is available in its current database. When verified legal or procedural material is unavailable, the platform should say so clearly instead of guessing.

## What is included

- Minimal consumer experience with no intake questionnaire
- Hybrid semantic + keyword retrieval over the real official Constitution PDF
- Structure-aware Article ingestion with preserved headings, text and metadata
- Practical immediate-action, evidence, escalation, police, lawyer and RTI guidance
- Structured guidance rendering rather than raw model Markdown
- Citation verification and source drawer
- Explicit knowledge-boundary handling for tenancy, consumer, employment and contract questions
- Emergency-first hierarchy without unverified phone numbers
- Follow-up questions only when facts materially affect the answer
- `/sources` transparency registry

## Architecture

```text
app/                     Next.js routes
components/              Interactive consumer experience
lib/ai/                  Structured guidance generation
lib/legal/               Schemas and source registry
lib/retrieval/           Hybrid retriever abstraction
data/sources/            Original official PDFs + metadata sidecars
data/processed/          Article chunks and deterministic embeddings
scripts/ingest.py        Re-runnable generic PDF pipeline
tests/                   Retrieval and hallucination-guard tests
```

`LegalRetriever` is separate from `generateGuidance`, so a hosted vector store or model provider can replace either without changing the UI. The MVP uses deterministic 384-dimensional hashed embeddings locally, avoiding an API key and keeping ingestion reproducible. Keyword overlap is blended with vector similarity because exact legal concepts matter.

## Setup

Requirements: Node.js 22+, npm, Python 3, and `pypdf`.

```bash
npm install
python3 -m pip install pypdf
npm run ingest -- ./data/sources/constitution-of-india-2026.pdf
npm run dev
```

No environment variables are required for the local MVP. The guidance engine is intentionally extractive and deterministic. A production LLM integration should receive only retrieved chunks and return the existing `Guidance` schema.

## Ingestion

The pipeline extracts every page, removes recurring formatting noise, detects legal provisions rather than slicing at arbitrary character counts, preserves long provisions as linked subchunks, generates local embeddings, and writes searchable JSON. The committed source is the official Legislative Department PDF, **The Constitution of India — as on 1 May 2026**.

## Adding another law

1. Put the official PDF in `data/sources/`.
2. Add a matching sidecar with `id`, `title`, `type`, `jurisdiction`, `state`, `authority`, dates, official `sourceUrl`, `sourceDocument`, and `verified`.
3. Run:

```bash
npm run ingest -- ./data/sources/consumer-protection-act.pdf
```

4. Add the source’s public metadata to `lib/legal/registry.ts`.

The ingestion output carries source, jurisdiction, provision, document and verification metadata. New retrievers can load every JSON file in `data/processed/` without changing the guidance UI.

## Citation verification

Before a provision is shown, the generator checks that the retrieved chunk has a source ID, Article number, document text, and that the text contains the claimed Article. Unsupported candidates are rejected and appear only in developer mode. The source drawer renders the exact ingested text and links to the official document.

## Testing

`npm test` checks the expected constitutional retrieval cases, verifies that a landlord-deposit query cannot invent a tenancy Article, validates core citation integrity, and then performs a production build.

## Known limits

The knowledge base currently contains only the Constitution. It cannot give verified procedures or remedies under consumer, tenancy, labour, criminal-procedure, contract, family, banking or State-specific law. The product says so instead of guessing. The emergency resource registry is also not populated, so the MVP gives safety-first guidance but deliberately shows no unverified phone numbers.
