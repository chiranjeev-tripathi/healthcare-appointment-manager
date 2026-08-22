import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Create Admin ──────────────────────────────────────
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@healthcare.app' },
    update: {},
    create: {
      name: 'System Admin',
      email: 'admin@healthcare.app',
      passwordHash: adminPassword,
      role: Role.ADMIN,
    },
  });
  console.log(`✅ Admin created: ${admin.email}`);

  // ─── Create Doctors ────────────────────────────────────
  const doctorPassword = await bcrypt.hash('doctor123', 10);

  const defaultWorkingHours = {
    monday: { start: '09:00', end: '17:00' },
    tuesday: { start: '09:00', end: '17:00' },
    wednesday: { start: '09:00', end: '17:00' },
    thursday: { start: '09:00', end: '17:00' },
    friday: { start: '09:00', end: '17:00' },
  };

  const doctors = [
    {
      name: 'Dr. Sarah Chen',
      email: 'sarah.chen@healthcare.app',
      specialisation: 'Cardiology',
      slotDuration: 30,
    },
    {
      name: 'Dr. James Wilson',
      email: 'james.wilson@healthcare.app',
      specialisation: 'Dermatology',
      slotDuration: 20,
    },
    {
      name: 'Dr. Priya Patel',
      email: 'priya.patel@healthcare.app',
      specialisation: 'Pediatrics',
      slotDuration: 30,
    },
    {
      name: 'Dr. Michael Brown',
      email: 'michael.brown@healthcare.app',
      specialisation: 'Orthopedics',
      slotDuration: 45,
    },
    {
      name: 'Dr. Emily Roberts',
      email: 'emily.roberts@healthcare.app',
      specialisation: 'Neurology',
      slotDuration: 30,
    },
  ];

  for (const doc of doctors) {
    const user = await prisma.user.upsert({
      where: { email: doc.email },
      update: {},
      create: {
        name: doc.name,
        email: doc.email,
        passwordHash: doctorPassword,
        role: Role.DOCTOR,
      },
    });

    await prisma.doctorProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        specialisation: doc.specialisation,
        workingHours: defaultWorkingHours,
        slotDurationMinutes: doc.slotDuration,
      },
    });

    console.log(`✅ Doctor created: ${doc.name} (${doc.specialisation})`);
  }

  // ─── Create Sample Patients ────────────────────────────
  const patientPassword = await bcrypt.hash('patient123', 10);

  const patients = [
    { name: 'Alice Johnson', email: 'alice@example.com' },
    { name: 'Bob Smith', email: 'bob@example.com' },
    { name: 'Carol Williams', email: 'carol@example.com' },
  ];

  for (const pat of patients) {
    const user = await prisma.user.upsert({
      where: { email: pat.email },
      update: {},
      create: {
        name: pat.name,
        email: pat.email,
        passwordHash: patientPassword,
        role: Role.PATIENT,
      },
    });
    console.log(`✅ Patient created: ${pat.name}`);
  }

  console.log('\n🎉 Seeding complete!');
  console.log('\n📋 Login Credentials:');
  console.log('   Admin:   admin@healthcare.app / admin123');
  console.log('   Doctor:  sarah.chen@healthcare.app / doctor123');
  console.log('   Patient: alice@example.com / patient123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
