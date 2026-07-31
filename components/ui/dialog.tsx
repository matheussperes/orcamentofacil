"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

// Task 13.7b (contrato .maestro/tmp/13.7b-contract.md) — primeiro consumo de
// `Dialog` no projeto (Design-System.md Seção 7.11): instala
// `@radix-ui/react-dialog` (mesmo padrão de `@radix-ui/react-tabs`/
// `@radix-ui/react-select` já usados, Task 13.3c/13.2a). Necessário porque
// `/catalogo` precisa de formulário de adicionar/editar produto e de
// confirmação destrutiva (ativar/desativar) SEM `window.confirm` — a Seção
// 7.11 proíbe explicitamente o confirm nativo do navegador. Overlay
// `bg-cinza-900/50`; painel `bg-cinza-0 rounded-xl shadow-lg p-xl`; entrada
// `200ms cubic-bezier(0.16,1,0.3,1)` (`duration-200 ease-out-back`, mesmos
// tokens nomeados de `tailwind.config.ts` já usados pelo drawer da Sidebar),
// saída `150ms ease-in`, overlay fade `150ms linear` (Seção 12).
const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-cinza-900/50 duration-150 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    /** `480px` (confirmação, default) ou `720px` (formulário) — Seção 7.11. */
    tamanho?: "confirmacao" | "formulario"
  }
>(({ className, children, tamanho = "confirmacao", ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-md rounded-xl border border-cinza-200 bg-cinza-0 p-xl shadow-lg duration-200 ease-out-back data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
        tamanho === "formulario" ? "max-w-[720px]" : "max-w-[480px]",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-lg top-lg rounded-sm text-cinza-400 transition-colors duration-120 hover:text-cinza-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-subtle disabled:pointer-events-none">
        <X className="h-4 w-4" />
        <span className="sr-only">Fechar</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-1 pr-lg", className)} {...props} />
)
DialogHeader.displayName = "DialogHeader"

// Rodapé: `flex justify-end gap-sm` — botão secundário (`ghost`) à esquerda
// do primário/destrutivo (Seção 7.11).
const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-wrap justify-end gap-sm", className)} {...props} />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-titulo-secao text-cinza-900", className)}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-corpo-pequeno text-cinza-500", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
