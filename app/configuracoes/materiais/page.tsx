"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  CATALOGO_PADRAO,
  carregarCatalogo,
  salvarCatalogo,
  type AcabamentoMdf,
  type Catalogo,
} from "@/lib/catalog";

// V2-6 — Cadastro de materiais e produtos. Persiste no localStorage (MVP); a
// versão final grava nas tabelas Prisma. O motor de custos consome estes preços.

let seq = 1;
const novoId = () => `mdf${Date.now()}${seq++}`;

export default function ConfigMateriais() {
  const [cat, setCat] = useState<Catalogo | null>(null);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => setCat(carregarCatalogo()), []);

  if (!cat) return null;

  function set(patch: Partial<Catalogo>) {
    setCat((c) => (c ? { ...c, ...patch } : c));
    setSalvo(false);
  }
  function setMdf(id: string, patch: Partial<AcabamentoMdf>) {
    set({ mdf: cat!.mdf.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
  }
  function addMdf() {
    set({
      mdf: [
        ...cat!.mdf,
        { id: novoId(), cor: "Nova cor", espessura: 18, precoChapa: 300 },
      ],
    });
  }
  function removeMdf(id: string) {
    set({ mdf: cat!.mdf.filter((m) => m.id !== id) });
  }

  function salvar() {
    salvarCatalogo(cat!);
    setSalvo(true);
  }
  function restaurar() {
    setCat(CATALOGO_PADRAO);
    setSalvo(false);
  }

  return (
    <div className="mx-auto max-w-[1080px] px-5 pb-20 pt-6">
      <header className="mb-6">
        <h1 className="text-display font-bold text-cinza-900">Materiais e produtos</h1>
        <p className="mt-1 text-corpo text-cinza-500">
          Cadastro de insumos e preços que alimentam o motor de custos.{" "}
          <a href="/" className="text-accent hover:text-accent-hover hover:underline">
            ← voltar à calculadora
          </a>
        </p>
      </header>

      <div className="mb-md flex flex-wrap gap-sm">
        <Button variant="primary" onClick={salvar}>
          {salvo ? "Salvo ✓" : "Salvar catálogo"}
        </Button>
        <Button variant="ghost" onClick={restaurar}>
          Restaurar padrão
        </Button>
      </div>

      <Card className="mb-md">
        <CardHeader>
          <CardTitle>Chapas de MDF (por cor × espessura)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cor / Acabamento</TableHead>
                  <TableHead className="w-[110px]">Espessura</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead className="w-[130px] text-right">Preço/chapa (R$)</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {cat.mdf.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <Input
                        value={m.cor}
                        onChange={(e) => setMdf(m.id, { cor: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={String(m.espessura)}
                        onValueChange={(v) => setMdf(m.id, { espessura: Number(v) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[6, 15, 18].map((e) => (
                            <SelectItem key={e} value={String(e)}>
                              {e} mm
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={m.fornecedor ?? ""}
                        placeholder="—"
                        onChange={(e) => setMdf(m.id, { fornecedor: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={m.precoChapa}
                        onChange={(e) => setMdf(m.id, { precoChapa: Number(e.target.value) })}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="danger"
                        size="icon"
                        aria-label={`Remover ${m.cor}`}
                        onClick={() => removeMdf(m.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Button variant="ghost" className="mt-sm" onClick={addMdf}>
            + Adicionar acabamento
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-md">
        <CardHeader>
          <CardTitle>Ferragens e acessórios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Código (engine)</TableHead>
                  <TableHead className="w-[130px] text-right">Preço unit. (R$)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cat.ferragens.map((f, i) => (
                  <TableRow key={f.codigo}>
                    <TableCell>{f.nome}</TableCell>
                    <TableCell>
                      <code>{f.codigo}</code>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={f.preco}
                        onChange={(e) => {
                          const preco = Number(e.target.value);
                          set({
                            ferragens: cat.ferragens.map((x, j) =>
                              j === i ? { ...x, preco } : x
                            ),
                          });
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Outros custos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-md sm:grid-cols-3">
            <div>
              <Label htmlFor="fita-metro">Fita de borda (R$/m)</Label>
              <Input
                id="fita-metro"
                type="number"
                value={cat.fitaMetro}
                onChange={(e) => set({ fitaMetro: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="montagem-m2">Montagem (R$/m²)</Label>
              <Input
                id="montagem-m2"
                type="number"
                value={cat.montagemPorM2}
                onChange={(e) => set({ montagemPorM2: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="frete-fixo">Frete fixo (R$)</Label>
              <Input
                id="frete-fixo"
                type="number"
                value={cat.freteFixo}
                onChange={(e) => set({ freteFixo: Number(e.target.value) })}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
