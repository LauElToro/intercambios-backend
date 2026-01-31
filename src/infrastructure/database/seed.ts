import prisma from './prisma.js';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 Seeding database...');

  // Hash de contraseña por defecto para usuarios de prueba
  const defaultPassword = await bcrypt.hash('password123', 10);

  // Crear usuarios de ejemplo
  const user1 = await prisma.user.upsert({
    where: { email: 'maria@example.com' },
    update: {},
    create: {
      nombre: 'María García',
      email: 'maria@example.com',
      password: defaultPassword,
      contacto: '+54 11 1234-5678',
      ofrece: 'Diseño gráfico, logos, flyers',
      necesita: 'Clases de inglés, reparación de electrodomésticos',
      precioOferta: 100,
      saldo: 150,
      limite: 15000,
      rating: 4.8,
      totalResenas: 24,
      ubicacion: 'Palermo, CABA',
      verificado: true,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'carlos@example.com' },
    update: {},
    create: {
      nombre: 'Carlos Rodríguez',
      email: 'carlos@example.com',
      password: defaultPassword,
      contacto: '+54 11 5555-1234',
      ofrece: 'Reparación de computadoras y celulares',
      necesita: 'Diseño gráfico, fotografía',
      precioOferta: 80,
      saldo: 200,
      limite: 15000,
      rating: 4.9,
      totalResenas: 45,
      ubicacion: 'Belgrano, CABA',
      verificado: true,
    },
  });

  // Crear items del market
  const item1 = await prisma.marketItem.create({
    data: {
      titulo: 'Clases de inglés online',
      descripcion: 'Clases personalizadas de inglés para todos los niveles',
      descripcionCompleta: 'Ofrezco clases de inglés online personalizadas para estudiantes de todos los niveles.',
      precio: 50,
      rubro: 'servicios',
      ubicacion: 'Palermo, CABA',
      distancia: 2.5,
      imagen: 'https://via.placeholder.com/300x200?text=Clases+Ingles',
      vendedorId: user1.id,
      rating: 4.8,
      detalles: {
        create: [
          { clave: 'tipo', valor: 'Clases' },
          { clave: 'modalidad', valor: 'Online' },
          { clave: 'experiencia', valor: 'Profesional' },
        ],
      },
      caracteristicas: {
        create: [
          { texto: 'Material incluido' },
          { texto: 'Horarios flexibles' },
          { texto: 'Certificado de finalización' },
        ],
      },
    },
  });

  const item2 = await prisma.marketItem.create({
    data: {
      titulo: 'Reparación de computadoras',
      descripcion: 'Servicio técnico profesional para PC y notebooks',
      descripcionCompleta: 'Servicio técnico profesional especializado en reparación de computadoras y notebooks.',
      precio: 80,
      rubro: 'servicios',
      ubicacion: 'Belgrano, CABA',
      distancia: 5.2,
      imagen: 'https://via.placeholder.com/300x200?text=Reparacion+PC',
      vendedorId: user2.id,
      rating: 4.9,
      detalles: {
        create: [
          { clave: 'tipo', valor: 'Reparaciones' },
          { clave: 'modalidad', valor: 'Presencial' },
          { clave: 'experiencia', valor: 'Profesional' },
        ],
      },
      caracteristicas: {
        create: [
          { texto: 'Diagnóstico gratuito' },
          { texto: 'Garantía de 30 días' },
          { texto: 'Atención en el día' },
        ],
      },
    },
  });

  console.log('✅ Seed completed!');
  console.log('Created users:', { user1: user1.id, user2: user2.id });
  console.log('Created items:', { item1: item1.id, item2: item2.id });
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
