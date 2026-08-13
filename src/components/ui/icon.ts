import type { ComponentPropsWithoutRef, ForwardRefExoticComponent, RefAttributes } from 'react'

/**
 * Phosphor's `Icon` type is only exported from the package root, which pulls in
 * the client-side icon registry. We render from `@phosphor-icons/react/dist/ssr`
 * for server components, so the type is mirrored here instead.
 */
export type IconWeight = 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone'

export interface IconProps extends ComponentPropsWithoutRef<'svg'>, RefAttributes<SVGSVGElement> {
  alt?: string
  color?: string
  size?: string | number
  weight?: IconWeight
  mirrored?: boolean
}

export type Icon = ForwardRefExoticComponent<IconProps>
