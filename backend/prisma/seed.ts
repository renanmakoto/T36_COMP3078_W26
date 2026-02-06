import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();

async function seedServices() {
  const services = [
    {
      name: 'Haircut',
      description: 'Classic cut with wash and style.',
      durationMinutes: 45,
      priceCents: 2000,
      isActive: true,
    },
    {
      name: 'Beard Trim',
      description: 'Line-up, trim, and finish.',
      durationMinutes: 30,
      priceCents: 1500,
      isActive: true,
    },
    {
      name: 'Haircut + Beard',
      description: 'Full cut plus beard trim.',
      durationMinutes: 60,
      priceCents: 2500,
      isActive: true,
    },
  ];

  for (const service of services) {
    await prisma.service.upsert({
      where: { name: service.name },
      update: {
        description: service.description,
        durationMinutes: service.durationMinutes,
        priceCents: service.priceCents,
        isActive: service.isActive,
      },
      create: service,
    });
  }
}

async function seedUsers() {
  // Dev-only credentials:
  // user: user@example.com / Passw0rd!
  // admin: admin@example.com / Admin123!
  const userPassword = await hashPassword('Passw0rd!');
  const adminPassword = await hashPassword('Admin123!');

  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: { passwordHash: userPassword, role: 'USER' },
    create: {
      email: 'user@example.com',
      passwordHash: userPassword,
      role: 'USER',
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { passwordHash: adminPassword, role: 'ADMIN' },
    create: {
      email: 'admin@example.com',
      passwordHash: adminPassword,
      role: 'ADMIN',
    },
  });

  return { user, admin };
}

async function seedAppointments(userId: string) {
  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  if (services.length === 0) return;

  const now = new Date();
  const day1 = new Date(now);
  day1.setDate(day1.getDate() + 1);
  day1.setHours(10, 0, 0, 0);

  const day2 = new Date(now);
  day2.setDate(day2.getDate() + 3);
  day2.setHours(14, 0, 0, 0);

  const day3 = new Date(now);
  day3.setDate(day3.getDate() - 2);
  day3.setHours(11, 0, 0, 0);

  const appts = [
    { start: day1, service: services[0], status: 'CONFIRMED' as const },
    { start: day2, service: services[1] ?? services[0], status: 'CONFIRMED' as const },
    { start: day3, service: services[2] ?? services[0], status: 'CANCELLED' as const },
  ];

  for (const appt of appts) {
    const end = new Date(appt.start);
    end.setMinutes(end.getMinutes() + appt.service.durationMinutes);

    const existing = await prisma.appointment.findFirst({
      where: {
        userId,
        serviceId: appt.service.id,
        startTime: appt.start,
        endTime: end,
      },
      select: { id: true },
    });

    if (existing) continue;

    await prisma.appointment.create({
      data: {
        userId,
        serviceId: appt.service.id,
        startTime: appt.start,
        endTime: end,
        status: appt.status,
      },
    });
  }
}

async function main() {
  await seedServices();
  const { user } = await seedUsers();
  await seedAppointments(user.id);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
