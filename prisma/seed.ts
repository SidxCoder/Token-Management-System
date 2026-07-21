import { PrismaClient, Role } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// Plaintext passwords by project decision (internal LAN app) — see plan.md §11.
const users = [
  { username: "admin", password: "admin123", display_name: "Administrator", role: Role.ADMIN },
  { username: "packager", password: "packager123", display_name: "Packager", role: Role.PACKAGER },
  { username: "greeter", password: "greeter123", display_name: "Greeter", role: Role.GREETER },
  { username: "runner", password: "runner123", display_name: "Runner", role: Role.RUNNER },
  { username: "cashier", password: "cashier123", display_name: "Cashier", role: Role.CASHIER },
];

async function main() {
  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: {
        username: u.username,
        password_hash: u.password,
        display_name: u.display_name,
        role: u.role,
      },
    });
  }
  console.log(`Seeded ${users.length} users: ${users.map((u) => u.username).join(", ")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
