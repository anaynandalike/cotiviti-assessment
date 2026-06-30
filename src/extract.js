// Extraction logic: LLM-based (Anthropic Messages API) + a naive rule-based
// baseline, for a "past vs present" comparison.

const MODEL = 'claude-sonnet-4-6'
const API_URL = 'https://api.anthropic.com/v1/messages'

const SYSTEM_PROMPT = `You are a clinical NLP engine that converts unstructured
clinical notes into structured, codeable data for medical coding and
payment-integrity workflows.

Return ONLY a single JSON object. No prose, no explanation, no markdown code
fences. The object MUST match this schema exactly:

{
  "vitals":      [{ "name": string, "value": string, "unit": string }],
  "diagnoses":   [{ "name": string, "status": string }],
  "medications": [{ "name": string, "dose": string, "frequency": string }],
  "procedures":  [{ "name": string, "date": string }],
  "icd10_suggestions": [{ "code": string, "description": string, "confidence": number }]
}

Rules:
- "confidence" is a number between 0 and 1 reflecting how well the note supports
  that specific ICD-10 code.
- Use valid ICD-10-CM codes and their official-style descriptions.
- "status" for diagnoses: e.g. "active", "suspected", "resolved", "controlled".
- If a field is unknown, use an empty string "". Never invent data not implied
  by the note.
- Output the JSON object and nothing else.`

// Strip stray markdown fences / surrounding prose, then parse defensively.
export function parseModelJson(raw) {
  if (!raw || typeof raw !== 'string') {
    throw new Error('Empty model response.')
  }
  let text = raw.trim()

  // Remove ```json ... ``` or ``` ... ``` fences if present.
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()

  // As a fallback, grab the outermost { ... } block.
  if (!text.startsWith('{')) {
    const first = text.indexOf('{')
    const last = text.lastIndexOf('}')
    if (first !== -1 && last !== -1 && last > first) {
      text = text.slice(first, last + 1)
    }
  }

  let data
  try {
    data = JSON.parse(text)
  } catch (e) {
    throw new Error('Could not parse model output as JSON.')
  }

  // Normalize: guarantee every expected array exists.
  return {
    vitals: Array.isArray(data.vitals) ? data.vitals : [],
    diagnoses: Array.isArray(data.diagnoses) ? data.diagnoses : [],
    medications: Array.isArray(data.medications) ? data.medications : [],
    procedures: Array.isArray(data.procedures) ? data.procedures : [],
    icd10_suggestions: Array.isArray(data.icd10_suggestions)
      ? data.icd10_suggestions
      : [],
  }
}

export async function extractWithLLM(noteText) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error(
      'Missing VITE_ANTHROPIC_API_KEY. Copy .env.example to .env and add your key, then restart the dev server.'
    )
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      // Required to call the API directly from a browser (demo-only).
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Extract structured data from this clinical note:\n\n${noteText}`,
        },
      ],
    }),
  })

  if (!res.ok) {
    let detail = ''
    try {
      const err = await res.json()
      detail = err?.error?.message || JSON.stringify(err)
    } catch {
      detail = await res.text()
    }
    throw new Error(`Anthropic API error (${res.status}): ${detail}`)
  }

  const json = await res.json()
  const raw = json?.content?.[0]?.text ?? ''
  return parseModelJson(raw)
}

// --- Naive rule-based baseline ("past" NLP) -------------------------------
// Deliberately simple regex/keyword matching to contrast with the LLM. It only
// pulls vitals and a handful of keyword-matched diagnoses, with no codes.

const DX_KEYWORDS = [
  'hypertension',
  'diabetes',
  'hyperlipidemia',
  'angina',
  'pneumonia',
  'asthma',
  'neuropathy',
  'retinopathy',
  'obesity',
  'osteoarthritis',
  'hypoxemia',
]

export function extractWithRules(noteText) {
  const text = noteText || ''
  const vitals = []

  const patterns = [
    { name: 'Blood Pressure', unit: 'mmHg', re: /\bBP\s*:?\s*(\d{2,3}\/\d{2,3})/i },
    { name: 'Heart Rate', unit: 'bpm', re: /\bHR\s*:?\s*(\d{2,3})/i },
    { name: 'Temperature', unit: 'F', re: /\bTemp\s*:?\s*(\d{2,3}(?:\.\d)?)/i },
    { name: 'Respiratory Rate', unit: '/min', re: /\bRR\s*:?\s*(\d{1,2})/i },
    { name: 'SpO2', unit: '%', re: /\bSpO2\s*:?\s*(\d{2,3})/i },
  ]

  for (const p of patterns) {
    const m = text.match(p.re)
    if (m) vitals.push({ name: p.name, value: m[1], unit: p.unit })
  }

  const lower = text.toLowerCase()
  const diagnoses = DX_KEYWORDS.filter((kw) => lower.includes(kw)).map((kw) => ({
    name: kw.charAt(0).toUpperCase() + kw.slice(1),
    status: 'keyword match',
  }))

  return { vitals, diagnoses }
}
