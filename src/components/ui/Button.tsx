import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  icon?: ReactNode
}

export function Button({ variant = 'secondary', icon, children, className = '', ...props }: ButtonProps) {
  return (
    <button className={`button button--${variant} ${className}`} type="button" {...props}>
      {icon}
      {children ? <span>{children}</span> : null}
    </button>
  )
}
