import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Task 13.2a — Design-System.md Seção 6.10: "px-[10px] py-2 border-l-[3px]
// rounded-r text-corpo-pequeno text-cinza-800", 3 variantes semânticas
// (Seção 2.3) — substitui default/destructive do stock shadcn.
const alertVariants = cva(
  "relative w-full rounded-r border-l-[3px] px-[10px] py-2 text-corpo-pequeno text-cinza-800 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-[10px] [&>svg]:top-2 [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        aviso: "border-l-aviso bg-aviso-subtle",
        erro: "border-l-erro bg-erro-subtle",
        sucesso: "border-l-sucesso bg-sucesso-subtle",
      },
    },
    defaultVariants: {
      variant: "aviso",
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
