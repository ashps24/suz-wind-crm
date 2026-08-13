'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-150 disabled:pointer-events-none disabled:opacity-45 [&_svg]:shrink-0 active:scale-[0.985] select-none',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--brand)] text-white shadow-[var(--shadow-sm)] hover:bg-[var(--brand-hover)]',
        secondary:
          'bg-[var(--elevated)] text-[var(--ink)] border border-[var(--line)] shadow-[var(--shadow-sm)] hover:bg-[var(--subtle)]',
        ghost: 'text-[var(--ink-secondary)] hover:bg-[var(--subtle)] hover:text-[var(--ink)]',
        outline:
          'border border-[var(--line-strong)] text-[var(--ink)] hover:bg-[var(--subtle)]',
        danger: 'bg-[var(--status-critical)] text-white hover:brightness-110',
        soft: 'bg-[var(--brand-soft)] text-[var(--brand-ink)] hover:brightness-[0.97] dark:hover:brightness-125',
        link: 'text-[var(--brand)] underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        xs: 'h-7 px-2.5 text-xs [&_svg]:size-3.5',
        sm: 'h-8 px-3 [&_svg]:size-4',
        md: 'h-9 px-3.5 [&_svg]:size-4',
        lg: 'h-11 px-5 text-[15px] [&_svg]:size-5',
        icon: 'h-9 w-9 [&_svg]:size-[18px]',
        'icon-sm': 'h-8 w-8 [&_svg]:size-4',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
  },
)
Button.displayName = 'Button'

export { buttonVariants }
