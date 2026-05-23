import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma";

type DefaultUserConfig = {
  email: string | null;
  nombre: string;
  password: string;
  role: UserRole;
  username: string;
};

const defaultUsers: DefaultUserConfig[] = [
  {
    email: "admin@coronados.com",
    nombre: "María Administradora",
    password: process.env.DEFAULT_ADMIN_PASSWORD ?? "admin2024",
    role: UserRole.admin,
    username: process.env.DEFAULT_ADMIN_USERNAME ?? "admin",
  },
  {
    email: null,
    nombre: "Carlos Operario",
    password: process.env.DEFAULT_OPERARIO_PASSWORD ?? "coronados2024",
    role: UserRole.operario,
    username: process.env.DEFAULT_OPERARIO_USERNAME ?? "operario",
  },
  {
    email: null,
    nombre: "Ana Cajera",
    password: process.env.DEFAULT_CAJERO_PASSWORD ?? "coronados2024",
    role: UserRole.cajero,
    username: process.env.DEFAULT_CAJERO_USERNAME ?? "cajero",
  },
];

export async function ensureDefaultUsers() {
  const existingAdmin = await prisma.usuario.findFirst({
    where: {
      role: UserRole.admin,
    },
    orderBy: {
      id: "asc",
    },
    select: {
      id: true,
    },
  });

  let adminId = existingAdmin?.id ?? null;

  for (const user of defaultUsers) {
    const existingUser = await prisma.usuario.findUnique({
      where: {
        username: user.username,
      },
      select: {
        id: true,
        role: true,
      },
    });

    const createdBy = user.role === UserRole.admin ? null : adminId;

    const savedUser = await prisma.usuario.upsert({
      where: {
        username: user.username,
      },
      update: {
        activo: true,
        email: user.email,
        nombre: user.nombre,
        role: user.role,
        updated_by: createdBy,
      },
      create: {
        activo: true,
        created_by: createdBy,
        email: user.email,
        nombre: user.nombre,
        password_hash: await bcrypt.hash(user.password, 10),
        role: user.role,
        updated_by: createdBy,
        username: user.username,
      },
      select: {
        id: true,
        role: true,
        username: true,
      },
    });

    if (savedUser.role === UserRole.admin && !adminId) {
      adminId = savedUser.id;
    }

    if (!existingUser) {
      console.log(`Default user ensured: ${savedUser.username}`);
    }
  }
}
