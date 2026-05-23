import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();
const DEFAULT_TARA_POR_JABA = 5.8;
const APP_TIMEZONE = process.env.APP_TIMEZONE ?? "America/Lima";

function getTodayCode() {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const [day, month, year] = formatter.format(new Date()).split("/");
  return `${day}${month}${year}`;
}

async function main() {
  const granjas = ["Redondos 1", "Redondos 2", "San Fernando", "Piso"];
  const clientes = ["PIZARRO", "MILAGROS", "PERCY", "MARINO", "NAVARRO"];
  const operarioPasswordHash = await bcrypt.hash("coronados2024", 10);
  const cajeroPasswordHash = await bcrypt.hash("coronados2024", 10);
  const adminPasswordHash = await bcrypt.hash("admin2024", 10);

  const createdGranjas = await Promise.all(
    granjas.map((nombre) =>
      prisma.granja.upsert({
        where: { nombre },
        update: { activo: true },
        create: { nombre, activo: true },
      }),
    ),
  );

  await Promise.all(
    clientes.map((nombre) =>
      prisma.cliente.upsert({
        where: { nombre },
        update: { activo: true },
        create: { nombre, activo: true },
      }),
    ),
  );

  await prisma.usuario.upsert({
    where: { username: "operario" },
    update: {
      password_hash: operarioPasswordHash,
      nombre: "Carlos Operario",
      email: null,
      role: UserRole.operario,
      activo: true,
    },
    create: {
      username: "operario",
      password_hash: operarioPasswordHash,
      nombre: "Carlos Operario",
      email: null,
      role: UserRole.operario,
      activo: true,
    },
  });

  const admin = await prisma.usuario.upsert({
    where: { username: "admin" },
    update: {
      password_hash: adminPasswordHash,
      nombre: "María Administradora",
      email: "admin@coronados.com",
      role: UserRole.admin,
      activo: true,
    },
    create: {
      username: "admin",
      password_hash: adminPasswordHash,
      nombre: "María Administradora",
      email: "admin@coronados.com",
      role: UserRole.admin,
      activo: true,
    },
  });

  await prisma.usuario.upsert({
    where: { username: "cajero" },
    update: {
      password_hash: cajeroPasswordHash,
      nombre: "Ana Cajera",
      email: null,
      role: UserRole.cajero,
      activo: true,
      created_by: admin.id,
      updated_by: admin.id,
    },
    create: {
      username: "cajero",
      password_hash: cajeroPasswordHash,
      nombre: "Ana Cajera",
      email: null,
      role: UserRole.cajero,
      activo: true,
      created_by: admin.id,
      updated_by: admin.id,
    },
  });

  await prisma.usuario.updateMany({
    where: {
      username: "operario",
      created_by: null,
    },
    data: {
      created_by: admin.id,
      updated_by: admin.id,
    },
  });

  const codigo = getTodayCode();
  const jornada = await prisma.jornada.upsert({
    where: { codigo },
    update: {
      estado: "abierta",
      fecha: new Date(),
    },
    create: {
      codigo,
      estado: "abierta",
      fecha: new Date(),
    },
  });

  const granja = createdGranjas[0];
  const tara = Number((100 * DEFAULT_TARA_POR_JABA).toFixed(2));
  const pesoBruto = 2000;
  const pesoNeto = Number((pesoBruto - tara).toFixed(2));

  const existingEntrada = await prisma.entradaGranja.findFirst({
    where: {
      jornada_id: jornada.id,
      granja_id: granja.id,
    },
  });

  if (!existingEntrada) {
    await prisma.entradaGranja.create({
      data: {
        jornada_id: jornada.id,
        granja_id: granja.id,
        jabas_total: 100,
        peso_bruto: pesoBruto,
        tara,
        peso_neto: pesoNeto,
        combustible_kg: 0,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
