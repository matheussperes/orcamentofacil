import * as React from "react"

import { cn } from "@/lib/utils"

// Task 13.2a — variantes redefinidas por docs/Design-System.md Seção 6.7
// (substituem os tokens genéricos `border-input`/`text-base`/`ring-ring` do
// stock shadcn), mesmo padrão já aplicado ao Button na Task 5.2.
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-sm border border-cinza-300 bg-cinza-0 px-[10px] text-corpo text-cinza-900 shadow-none transition-colors file:border-0 file:bg-transparent file:text-corpo-pequeno file:font-medium placeholder:text-cinza-400 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-subtle disabled:cursor-not-allowed disabled:border-cinza-200 disabled:bg-cinza-100 disabled:text-cinza-400",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
