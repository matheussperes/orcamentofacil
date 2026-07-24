import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PRECOS_REFERENCIA } from "../lib/engine/prices";

// Seed: carrega a tabela de preços de referência (doc 07, Nível 1) + um
// tenant/admin de exemplo. Rodar: npm run db:seed
// Task 10.1: seed da Biblioteca de Engenharia (motor V1) removido junto com
// `lib/engine/templates.ts`.
const prisma = new PrismaClient();

async function main() {
  // 1. Catálogo + preços de referência.
  const p = PRECOS_REFERENCIA;
  const criarItemComPreco = async (
    tipo: string,
    descricao: string,
    atributos: object,
    valor: number,
    unidade: string
  ) => {
    const item = await prisma.catalogoItem.create({
      data: { tipo, descricao, atributos },
    });
    await prisma.preco.create({
      data: { catalogoItemId: item.id, valor, unidade, referencia: true },
    });
  };

  for (const [esp, valor] of Object.entries(p.chapaPorEspessura)) {
    await criarItemComPreco(
      "mdf",
      `MDF ${esp}mm (referência)`,
      { espessura: Number(esp) },
      valor,
      "chapa"
    );
  }
  await criarItemComPreco("fita", "Fita de borda (referência)", {}, p.fitaMetro, "m");
  for (const [item, valor] of Object.entries(p.ferragens)) {
    await criarItemComPreco("ferragem", item.replace(/_/g, " "), { codigo: item }, valor, "un");
  }
  console.log("Preços de referência carregados.");

  // 2. Tenant + admin de exemplo.
  const tenant = await prisma.tenant.create({ data: { nome: "Marcenaria Demo" } });
  await prisma.usuario.create({
    data: {
      tenantId: tenant.id,
      nome: "Admin Demo",
      email: "admin@demo.com",
      senhaHash: await bcrypt.hash("demo1234", 10),
      papel: "admin",
    },
  });
  console.log("Tenant/admin de exemplo: admin@demo.com / demo1234");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
