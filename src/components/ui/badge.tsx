'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { TONE_SOFT_VAR, TONE_VAR } from '@/lib/constants'

export type Tone = 'good' | 'warning' | 'serious' | 'critical' | 'neutral' | 'info'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
  /** Solid dot carries the status alongside the label, so colour is never the only cue. */
  dot?: boolean
  size?: 'sm' | 'md'
  variant?: 'soft' | 'outline' | 'solid'
}

export function Badge({
  tone = 'neutral',
  dot = false,
  size = 'sm',
  variant = 'soft',
  className,
  children,
  ...props
}: BadgeProps) {
  const color = TONE_VAR[tone]
  const soft = TONE_SOFT_VAR[tone]

  const style: React.CSSProperties =
    variant === 'solid'
      ? { backgroundColor: color, color: '#fff' }
      : variant === 'outline'
        ? { borderColor: color, color }
        : { backgroundColor: soft, color }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md font-medium leading-none tracking-tight',
        size === 'sm' ? 'h-[22px] px-2 text-[11px]' : 'h-7 px-2.5 text-xs',
        variant === 'outline' && 'border bg-transparent',
        className,
      )}
      style={style}
      {...props}
    >
      {dot && (
        <span
          aria-hidden
          className="size-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: variant === 'solid' ? '#fff' : color }}
        />
      )}
      {children}
    </span>
  )
}

/** Neutral, non-status chip for metadata such as product family or region. */
export function Chip({ className, children, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex h-[22px] items-center rounded-md border border-[var(--line)] bg-[var(--subtle)] px-2 text-[11px] font-medium text-[var(--ink-secondary)]',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
