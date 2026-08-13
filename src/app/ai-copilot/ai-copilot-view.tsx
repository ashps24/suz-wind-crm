'use client'

import * as React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  ArrowsClockwise,
  Buildings,
  FileText,
  HardHat,
  MapTrifold,
  PaperPlaneTilt,
  Sparkle,
  Wind,
  Wrench,
} from '@phosphor-icons/react/dist/ssr'
import type { Icon } from '@/components/ui/icon'
import { Badge, Chip } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, Textarea } from '@/components/ui/primitives'
import { BarChart, LineChart } from '@/components/charts'
import { SeverityBadge } from '@/components/cards/status'
import { ErrorState } from '@/components/feedback/states'
import { api } from '@/lib/api'
import { SUGGESTED_PROMPTS } from '@/lib/mocks/ai'
import { TONE_VAR } from '@/lib/constants'
import { fmtTime } from '@/lib/formatters'
import { DEMO_NOW, cn } from '@/lib/utils'
import type { AiMessage, AiRelatedRecord, AiResponseCard } from '@/types'

const RECORD_ICON: Record<AiRelatedRecord['kind'], Icon> = {
  turbine: Wind,
  'wind-farm': MapTrifold,
  'work-order': Wrench,
  project: HardHat,
  account: Buildings,
  document: FileText,
}

export function AiCopilotView() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q')
  const [messages, setMessages] = React.useState<AiMessage[]>([])
  const [input, setInput] = React.useState('')
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const started = React.useRef(false)

  const ask = useMutation({
    mutationFn: (prompt: string) => api.ai.query(prompt),
    onSuccess: (card, prompt) => {
      setMessages((current) => [
        ...current.filter((m) => !m.pending),
        {
          id: `a-${current.length}`,
          role: 'assistant',
          content: card.summary,
          at: DEMO_NOW.toISOString(),
          card,
        },
      ])
    },
    onError: () => {
      setMessages((current) => current.filter((m) => !m.pending))
    },
  })

  const send = React.useCallback(
    (prompt: string) => {
      const text = prompt.trim()
      if (!text || ask.isPending) return
      setMessages((current) => [
        ...current,
        { id: `u-${current.length}`, role: 'user', content: text, at: DEMO_NOW.toISOString() },
        { id: `p-${current.length}`, role: 'assistant', content: '', at: DEMO_NOW.toISOString(), pending: true },
      ])
      setInput('')
      ask.mutate(text)
    },
    [ask],
  )

  React.useEffect(() => {
    if (initialQuery && !started.current) {
      started.current = true
      send(initialQuery)
    }
  }, [initialQuery, send])

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const empty = messages.length === 0

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col px-4 md:px-6">
      <div className="shrink-0 py-5">
        <h1 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-[var(--ink)] md:text-[22px]">
          <span className="flex size-8 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
            <Sparkle className="size-[18px]" weight="fill" aria-hidden />
          </span>
          AI Copilot
        </h1>
        <p className="mt-1 text-[13px] text-[var(--ink-muted)]">
          Ask about assets, sites, customers or environmental exposure. Answers are generated from the current fleet
          data in this prototype.
        </p>
      </div>

      <div ref={scrollRef} className="scrollbar-thin min-h-0 flex-1 space-y-5 overflow-y-auto pb-5">
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center py-8">
            <div className="w-full max-w-2xl">
              <p className="mb-3 text-center text-[13px] font-medium text-[var(--ink-secondary)]">
                Try one of these
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {SUGGESTED_PROMPTS.map((prompt, i) => (
                  <motion.button
                    key={prompt}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: i * 0.035 }}
                    onClick={() => send(prompt)}
                    className="panel px-3.5 py-3 text-left text-[13px] text-[var(--ink-secondary)] transition-all hover:border-[var(--brand)] hover:text-[var(--ink)]"
                  >
                    {prompt}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((message) =>
              message.role === 'user' ? (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-end gap-3"
                >
                  <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-[var(--brand)] px-4 py-2.5">
                    <p className="text-[13.5px] leading-relaxed text-white">{message.content}</p>
                  </div>
                  <Avatar name="Vikram Deshpande" size={30} />
                </motion.div>
              ) : message.pending ? (
                <motion.div key={message.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                  <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]">
                    <Sparkle className="size-4" weight="fill" aria-hidden />
                  </span>
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="size-1.5 animate-[shimmer_1.2s_ease-in-out_infinite] rounded-full bg-[var(--ink-muted)]"
                        style={{ animationDelay: `${i * 0.16}s` }}
                      />
                    ))}
                    <span className="ml-1.5 text-[12px] text-[var(--ink-muted)]">Reading fleet data…</span>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                  className="flex gap-3"
                >
                  <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]">
                    <Sparkle className="size-4" weight="fill" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    {message.card ? <ResponseCard card={message.card} /> : <p>{message.content}</p>}
                    <p className="mt-1.5 text-[10.5px] text-[var(--ink-muted)]">{fmtTime(message.at)}</p>
                  </div>
                </motion.div>
              ),
            )}
          </AnimatePresence>
        )}

        {ask.isError && (
          <ErrorState
            title="The Copilot could not answer"
            description={ask.error instanceof Error ? ask.error.message : undefined}
            onRetry={() => {
              const lastUser = [...messages].reverse().find((m) => m.role === 'user')
              if (lastUser) send(lastUser.content)
            }}
          />
        )}
      </div>

      <div className="shrink-0 pb-5">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
          className="relative"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send(input)
              }
            }}
            rows={2}
            placeholder="Ask about turbines, sites, customers, maintenance or environmental risk…"
            aria-label="Ask the AI Copilot"
            className="resize-none pr-12 text-[13.5px]"
          />
          <Button
            type="submit"
            variant="primary"
            size="icon-sm"
            disabled={!input.trim() || ask.isPending}
            className="absolute bottom-2.5 right-2.5"
            aria-label="Send message"
          >
            <PaperPlaneTilt weight="fill" aria-hidden />
          </Button>
        </form>
        <p className="mt-2 text-center text-[10.5px] text-[var(--ink-muted)]">
          Responses are generated from mock fleet data for demonstration. Verify before acting on operational decisions.
        </p>
      </div>
    </div>
  )
}

function ResponseCard({ card }: { card: AiResponseCard }) {
  return (
    <div className="space-y-3 rounded-2xl rounded-tl-md border border-[var(--line)] bg-[var(--surface)] p-4">
      <p className="text-[13.5px] leading-relaxed text-[var(--ink)]">{card.summary}</p>

      <div className="rounded-lg border border-[var(--line)] bg-[var(--brand-soft)] px-3.5 py-3">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--brand-ink)]">Insight</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--brand-ink)]">{card.insight}</p>
      </div>

      {card.chart && (
        <div className="rounded-lg border border-[var(--line)] bg-[var(--elevated)] p-3.5">
          {card.chart.kind === 'bar' ? (
            <BarChart
              title={card.chart.title}
              unit={card.chart.unit === '%' ? '%' : ` ${card.chart.unit}`}
              decimals={card.chart.unit === 'score' ? 0 : 1}
              height={180}
              data={card.chart.data}
            />
          ) : (
            <LineChart
              title={card.chart.title}
              unit={` ${card.chart.unit}`}
              height={180}
              axis={card.chart.data.map((d) => d.label)}
              series={[{ label: card.chart.title, values: card.chart.data.map((d) => d.value) }]}
            />
          )}
        </div>
      )}

      {card.affectedAssets.length > 0 && (
        <div>
          <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--ink-muted)]">
            Affected assets
          </p>
          <ul className="space-y-1.5">
            {card.affectedAssets.slice(0, 6).map((asset) => (
              <li
                key={asset.id}
                className="flex items-start gap-3 rounded-lg border border-[var(--line)] bg-[var(--elevated)] px-3 py-2"
              >
                <span
                  aria-hidden
                  className="mt-1.5 size-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      asset.severity === 'critical'
                        ? TONE_VAR.critical
                        : asset.severity === 'high'
                          ? TONE_VAR.serious
                          : asset.severity === 'medium'
                            ? TONE_VAR.warning
                            : TONE_VAR.good,
                  }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-medium text-[var(--ink)]">{asset.label}</span>
                  <span className="block truncate text-[11px] text-[var(--ink-muted)]">{asset.detail}</span>
                </span>
                <SeverityBadge severity={asset.severity} />
              </li>
            ))}
          </ul>
          {card.affectedAssets.length > 6 && (
            <p className="mt-1.5 text-[11px] text-[var(--ink-muted)]">
              +{card.affectedAssets.length - 6} more affected
            </p>
          )}
        </div>
      )}

      <div
        className="rounded-lg border px-3.5 py-3"
        style={{
          borderColor: 'color-mix(in oklab, var(--status-good) 30%, transparent)',
          backgroundColor: 'var(--status-good-soft)',
        }}
      >
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.07em]" style={{ color: TONE_VAR.good }}>
          Recommended action
        </p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--ink)]">{card.recommendedAction}</p>
      </div>

      {card.relatedRecords.length > 0 && (
        <div>
          <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--ink-muted)]">
            Related records
          </p>
          <div className="flex flex-wrap gap-1.5">
            {card.relatedRecords.map((record) => {
              const RecordIcon = RECORD_ICON[record.kind]
              return (
                <Link
                  key={`${record.kind}-${record.id}`}
                  href={record.href}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--elevated)] px-2.5 py-1.5 text-[11.5px] font-medium text-[var(--ink-secondary)] transition-colors hover:border-[var(--brand)] hover:text-[var(--brand-ink)]"
                >
                  <RecordIcon className="size-3.5" aria-hidden />
                  {record.label}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {card.cta && (
        <Button variant="primary" size="sm" asChild className="w-full sm:w-auto">
          <Link href={card.cta.href}>
            {card.cta.label}
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      )}
    </div>
  )
}
