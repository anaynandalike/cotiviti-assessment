# Clinical Note → Structured Data Extractor

A single-page proof-of-concept that turns **unstructured clinical text** into
**structured, codeable data** — vitals, diagnoses, medications, procedures — plus
**suggested ICD-10 codes with confidence scores**, using the Anthropic Messages
API (`claude-sonnet-4-6`).

Built for a Clinical Natural Language Technology hackathon. The strategic hook is
**LLM-assisted medical coding / payment integrity**, so the ICD-10 output is the
centerpiece.

## What it does

- **Left panel** — a clinical note. Pre-loaded with one synthetic note plus
  buttons to instantly swap in others (cardiology, endocrine, ED respiratory,
  ortho post-op). Zero typing needed for a screenshare demo.
- **Right panel** — structured output rendered as clean cards/tables, with the
  ICD-10 suggestions shown prominently and confidence as colored bars/badges.
- **Rule-based baseline toggle** — a naive regex/keyword extractor shown
  side-by-side with the LLM output to illustrate *past vs present* NLP.
- Loading and error states for the API call; defensive JSON parsing (strips
  stray markdown fences, validates the schema).

### Extraction schema

The model is instructed to return **strict JSON only** matching:

```json
{
  "vitals":      [{ "name": "", "value": "", "unit": "" }],
  "diagnoses":   [{ "name": "", "status": "" }],
  "medications": [{ "name": "", "dose": "", "frequency": "" }],
  "procedures":  [{ "name": "", "date": "" }],
  "icd10_suggestions": [{ "code": "", "description": "", "confidence": 0.0 }]
}
```

## Run it

```bash
npm install

# Supply your own Anthropic API key:
cp .env.example .env
#   then edit .env and set VITE_ANTHROPIC_API_KEY=sk-ant-...

npm run dev
```

Open the printed local URL. Pick a sample note (or paste your own synthetic
note) and click **Extract structured data**.

> You must supply your own Anthropic API key — get one at
> <https://console.anthropic.com/>. The key is read from the
> `VITE_ANTHROPIC_API_KEY` environment variable; it is never hardcoded.

### A note on the API key & browser calls

For demo simplicity this POC calls the Anthropic API **directly from the
browser** (via the `anthropic-dangerous-direct-browser-access` header). That
exposes the key to the client, which is acceptable for a local hackathon demo
but **not for production** — there the call must be proxied through a small
backend so the key never ships to the browser.

## Past · Present · Future

- **Past** — rule-based NLP: regex and keyword dictionaries. Brittle, no
  context, no normalization, no codes. (Toggle the baseline to see it.)
- **Present** — an LLM reads the note like a clinician would: normalizes
  terminology, infers status, links findings, and proposes billable ICD-10
  codes with confidence — in one call. *(This demo.)*
- **Future** — human-in-the-loop coder review, retrieval over the full
  ICD-10-CM / CPT code sets for guaranteed-valid codes, payment-integrity checks
  (e.g. flagging unsupported or up-coded claims), and audit trails — proxied
  securely through a backend.

## ⚠️ Synthetic data — no PHI

**All clinical text in this project is fully synthetic and de-identified.** The
sample notes were written for this demo and do not represent any real patient.
No protected health information (PHI) is included anywhere in this repository.
Do not paste real patient data into this demo.
