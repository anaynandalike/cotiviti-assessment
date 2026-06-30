import { useState } from 'react'
import { SAMPLE_NOTES } from './samples'
import { extractWithLLM, extractWithRules } from './extract'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Activity,
  Stethoscope,
  Pill,
  Scissors,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
} from 'lucide-react'

export default function App() {
  const [note, setNote] = useState(SAMPLE_NOTES[0].text)
  const [activeSample, setActiveSample] = useState(SAMPLE_NOTES[0].id)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showBaseline, setShowBaseline] = useState(false)

  const baseline = showBaseline ? extractWithRules(note) : null

  function loadSample(sample) {
    setNote(sample.text)
    setActiveSample(sample.id)
    setResult(null)
    setError(null)
  }

  async function runExtraction() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await extractWithLLM(note)
      setResult(data)
    } catch (e) {
      setError(e.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Stethoscope className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                Clinical Note → Structured Data Extractor
              </h1>
              <p className="text-sm text-muted-foreground">
                LLM-assisted medical coding &amp; payment-integrity proof of concept
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Synthetic data · No PHI
          </Badge>
        </header>

        {/* Panels */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* LEFT: input */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Clinical Note</CardTitle>
                <span className="text-xs text-muted-foreground">
                  unstructured input
                </span>
              </div>
              <CardDescription>
                Load a synthetic sample or paste your own de-identified note.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {SAMPLE_NOTES.map((s) => (
                  <Button
                    key={s.id}
                    size="sm"
                    variant={activeSample === s.id ? 'default' : 'outline'}
                    onClick={() => loadSample(s)}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>

              <Textarea
                value={note}
                onChange={(e) => {
                  setNote(e.target.value)
                  setActiveSample(null)
                }}
                spellCheck={false}
                className="min-h-[360px] resize-y font-mono text-xs leading-relaxed"
              />

              <div className="flex items-center justify-between">
                <Button
                  onClick={runExtraction}
                  disabled={loading || !note.trim()}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  {loading ? 'Extracting…' : 'Extract structured data'}
                </Button>

                <div className="flex items-center gap-2">
                  <Switch
                    id="baseline"
                    checked={showBaseline}
                    onCheckedChange={setShowBaseline}
                  />
                  <Label htmlFor="baseline" className="text-muted-foreground">
                    Rule-based baseline
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* RIGHT: results */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Structured Output</CardTitle>
                <span className="text-xs text-muted-foreground">codeable data</span>
              </div>
              <CardDescription>
                Normalized fields and suggested billable codes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Extraction failed</AlertTitle>
                  <AlertDescription className="break-words">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {loading && <LoadingState />}

              {!loading && !error && !result && (
                <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed text-center text-sm text-muted-foreground">
                  <Activity className="mb-3 h-8 w-8 opacity-40" />
                  <p className="max-w-xs">
                    Run an extraction to see structured vitals, diagnoses,
                    medications, procedures, and suggested ICD-10 codes.
                  </p>
                </div>
              )}

              {result && <Results data={result} />}
            </CardContent>
          </Card>
        </div>

        {/* Comparison */}
        {showBaseline && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Past vs Present: Rule-based NLP vs LLM</CardTitle>
              <CardDescription>
                The same note, two eras of clinical NLP.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <BaselineColumn baseline={baseline} />
              <LlmColumn result={result} />
            </CardContent>
          </Card>
        )}

        <footer className="mt-8 text-center text-xs text-muted-foreground">
          All clinical text is fully synthetic and de-identified · Built for a
          Clinical NLP hackathon
        </footer>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4 animate-pulse text-primary" />
        Analyzing note with claude-sonnet-4-6…
      </div>
      <Skeleton className="h-28 w-full rounded-lg" />
      <Skeleton className="h-20 w-full rounded-lg" />
      <Skeleton className="h-20 w-full rounded-lg" />
    </div>
  )
}

function Results({ data }) {
  return (
    <div className="space-y-5">
      <IcdSection items={data.icd10_suggestions} />

      <DataCard
        icon={<Activity className="h-4 w-4" />}
        title="Vitals"
        count={data.vitals.length}
        columns={['Measure', 'Value', 'Unit']}
        rows={data.vitals.map((v) => [v.name, v.value, v.unit])}
      />
      <DataCard
        icon={<Stethoscope className="h-4 w-4" />}
        title="Diagnoses"
        count={data.diagnoses.length}
        columns={['Diagnosis', 'Status']}
        rows={data.diagnoses.map((d) => [d.name, d.status])}
      />
      <DataCard
        icon={<Pill className="h-4 w-4" />}
        title="Medications"
        count={data.medications.length}
        columns={['Medication', 'Dose', 'Frequency']}
        rows={data.medications.map((m) => [m.name, m.dose, m.frequency])}
      />
      <DataCard
        icon={<Scissors className="h-4 w-4" />}
        title="Procedures"
        count={data.procedures.length}
        columns={['Procedure', 'Date']}
        rows={data.procedures.map((p) => [p.name, p.date])}
      />
    </div>
  )
}

function IcdSection({ items }) {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-primary">
          Suggested ICD-10 Codes
        </h3>
        <Badge className="ml-auto">{items.length}</Badge>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No codes suggested.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-4 rounded-lg border bg-card p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="rounded-md bg-primary/10 px-2 py-1 font-mono text-sm font-bold text-primary">
                  {item.code}
                </span>
                <span className="truncate text-sm">{item.description}</span>
              </div>
              <ConfidenceBar value={item.confidence} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ConfidenceBar({ value }) {
  const pct = Math.round((Number(value) || 0) * 100)
  const tier = pct >= 80 ? 'high' : pct >= 50 ? 'med' : 'low'
  const fill = {
    high: 'bg-emerald-500',
    med: 'bg-amber-500',
    low: 'bg-rose-500',
  }[tier]
  const text = {
    high: 'text-emerald-400',
    med: 'text-amber-400',
    low: 'text-rose-400',
  }[tier]
  return (
    <div className="flex flex-shrink-0 items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full', fill)} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn('w-9 text-right text-xs font-bold', text)}>{pct}%</span>
    </div>
  )
}

function DataCard({ icon, title, count, columns, rows }) {
  return (
    <div className="rounded-xl border">
      <div className="flex items-center gap-2 border-b px-4 py-2.5">
        <span className="text-muted-foreground">{icon}</span>
        <h3 className="text-sm font-medium">{title}</h3>
        <Badge variant="secondary" className="ml-auto">
          {count}
        </Badge>
      </div>
      <div className="px-1.5 pb-1">
        <SimpleTable columns={columns} rows={rows} />
      </div>
    </div>
  )
}

function SimpleTable({ columns, rows }) {
  if (!rows.length) {
    return (
      <p className="px-3 py-4 text-sm text-muted-foreground">None detected.</p>
    )
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((c) => (
            <TableHead key={c}>{c}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => (
          <TableRow key={i}>
            {row.map((cell, j) => (
              <TableCell key={j} className={j === 0 ? 'font-medium' : ''}>
                {cell || <span className="text-muted-foreground">—</span>}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function BaselineColumn({ baseline }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">Rule-based baseline</h3>
        <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-400">
          past
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Regex + keyword matching. No codes, no context.
      </p>
      <DataCard
        icon={<Activity className="h-4 w-4" />}
        title="Vitals"
        count={baseline.vitals.length}
        columns={['Measure', 'Value', 'Unit']}
        rows={baseline.vitals.map((v) => [v.name, v.value, v.unit])}
      />
      <DataCard
        icon={<Stethoscope className="h-4 w-4" />}
        title="Diagnoses (keyword hits)"
        count={baseline.diagnoses.length}
        columns={['Diagnosis', 'Status']}
        rows={baseline.diagnoses.map((d) => [d.name, d.status])}
      />
    </div>
  )
}

function LlmColumn({ result }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">LLM extraction</h3>
        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
          present
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Context-aware, normalized, with suggested billable codes.
      </p>
      {result ? (
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Vitals" value={result.vitals.length} hint="with units" />
          <Stat label="Diagnoses" value={result.diagnoses.length} hint="with status" />
          <Stat label="Medications" value={result.medications.length} hint="dose + freq" />
          <Stat label="Procedures" value={result.procedures.length} hint="captured" />
          <Stat
            label="ICD-10 codes"
            value={result.icd10_suggestions.length}
            hint="with confidence"
            highlight
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Run an extraction to populate this column.
        </p>
      )}
    </div>
  )
}

function Stat({ label, value, hint, highlight }) {
  return (
    <div
      className={cn(
        'rounded-lg border p-3',
        highlight && 'border-primary/30 bg-primary/5'
      )}
    >
      <div className={cn('text-2xl font-bold', highlight && 'text-primary')}>
        {value}
      </div>
      <div className="text-xs font-medium">{label}</div>
      <div className="text-[11px] text-muted-foreground">{hint}</div>
    </div>
  )
}
