"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

// Task 13.3c (contrato .maestro/tmp/13.3c-contract.md) — shadcn `Tabs`
// (Design-System.md Seção 7.8): estilo "underline", não "pill". Primeiro
// consumo real no produto (abas do orçamento — Ambientes/Corte & Material/
// Financeiro/Proposta, `/orcamento/[id]`) — instala `@radix-ui/react-tabs`
// (não estava em `package.json` antes desta task, mesmo padrão de
// `@radix-ui/react-select`/`@radix-ui/react-label` já usados no projeto).
const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    // Design-System Seção 10 ("< md: tabs com overflow-x-auto se não
    // couberem"): 4 abas com ícone + label não cabem em 375px — rola
    // horizontalmente em vez de quebrar linha ou espremer os triggers.
    className={cn(
      "flex gap-lg overflow-x-auto border-b border-cinza-200",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-1 py-sm text-corpo font-medium text-cinza-500 transition-colors duration-150 ease-out hover:text-cinza-700 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-accent data-[state=active]:text-accent [&_svg]:size-4 [&_svg]:shrink-0",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("mt-xl focus-visible:outline-none", className)}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
