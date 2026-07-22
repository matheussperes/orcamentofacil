import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Task 5.2 — variantes redefinidas por docs/Design-System.md Seção 6.1
// (substituem default/destructive/outline/secondary/link/lg do shadcn
// stock): primary/ghost/danger + tamanhos default/sm/icon.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-corpo font-medium transition-colors duration-120 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-subtle focus-visible:ring-offset-0 focus-visible:border-accent disabled:pointer-events-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      // Histórico (Task 6.4): `size` foi declarado antes de `variant` como
      // workaround — com `tailwind-merge` sem configuração customizada,
      // `text-corpo-pequeno` (do `sm`) e `text-cinza-700` (do `danger`/
      // `ghost`) eram tratados como conflitantes entre si (mesmo "grupo"),
      // e essa ordem garantia que a cor sobrevivesse à custa do tamanho de
      // fonte. A Task 7.1b corrigiu a causa raiz em `lib/utils.ts`
      // (`extendTailwindMerge` registra os tokens de `fontSize` num
      // classGroup próprio, separado de `text-color`) — `text-corpo`/
      // `text-corpo-pequeno` e a cor do `variant` agora coexistem
      // corretamente independente da ordem das chaves aqui.
      size: {
        default: "h-9 px-[14px]",
        sm: "h-7 px-[10px] text-corpo-pequeno",
        icon: "h-8 w-8 rounded-md p-0",
      },
      variant: {
        primary:
          "bg-accent text-cinza-0 hover:bg-accent-hover active:bg-accent-active disabled:bg-cinza-200 disabled:text-cinza-400",
        ghost:
          "bg-transparent border border-cinza-300 text-cinza-700 hover:bg-cinza-100 disabled:text-cinza-400 disabled:border-cinza-200",
        danger:
          "bg-transparent border border-cinza-300 text-cinza-700 hover:border-erro hover:text-erro hover:bg-erro-subtle disabled:text-cinza-400 disabled:border-cinza-200",
        iconActive: "bg-accent-subtle border border-accent-border text-accent",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
