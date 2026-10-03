import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando la siembra de datos reales (Seeding)...');

  await prisma.appointment.deleteMany();
  await prisma.serviceFrecuencies.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.service.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@salon.com',
      name: 'Fernanda',
      passwordHash,
      role: 'ADMIN',
    },
  });

  const listaServicios = [
    { title: 'Corte de cabello', durationMin: 60, price: 350.00, category: 'Cabello' },
    { title: 'Aplicación de uñas', durationMin: 150, price: 450.00, category: 'Uñas' },
    { title: 'Retoque de uñas', durationMin: 120, price: 300.00, category: 'Uñas' },
    { title: 'Retiro de uñas', durationMin: 60, price: 150.00, category: 'Uñas' },
    { title: 'Manicura', durationMin: 60, price: 250.00, category: 'Uñas' },
    { title: 'Pedicura', durationMin: 90, price: 350.00, category: 'Uñas' },
    { title: 'Efectos de color', durationMin: 300, price: 1500.00, category: 'Cabello' },
    { title: 'Aplicación de tinte', durationMin: 120, price: 800.00, category: 'Cabello' },
    { title: 'Keratina', durationMin: 240, price: 1200.00, category: 'Tratamientos' },
  ];

  for (const servicio of listaServicios) {
    await prisma.service.create({
      data: servicio,
    });
  }

  const clientePrueba = await prisma.customer.create({
    data: {
      name: 'Valeria Gómez',
      phone: '5551234567',
      medicalNotes: 'Alergia severa al amoníaco / Sensibilidad en la piel',
    },
  });

  console.log('✅ Seeding completado con éxito.');
  console.log(`Se insertaron ${listaServicios.length} servicios.`);
}

main()
  .catch((e) => {
    console.error('❌ Error en el seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });