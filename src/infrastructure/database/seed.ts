import prisma from './prisma.js';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 Seeding database...');

  // Limpiar datos existentes (UserPerfilMercado se borra por cascade al borrar User)
  await prisma.marketItemCaracteristica.deleteMany();
  await prisma.marketItemDetalle.deleteMany();
  await prisma.marketItem.deleteMany();
  await prisma.intercambio.deleteMany();
  await prisma.user.deleteMany();

  const defaultPassword = await bcrypt.hash('password123', 10);

  const user1 = await prisma.user.upsert({
    where: { email: 'maria@example.com' },
    update: {},
    create: {
      nombre: 'María García',
      email: 'maria@example.com',
      password: defaultPassword,
      contacto: '+54 11 1234-5678',
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
      saldo: 200,
      limite: 15000,
      rating: 4.9,
      totalResenas: 45,
      ubicacion: 'Belgrano, CABA',
      verificado: true,
    },
  });

  const user3 = await prisma.user.create({
    data: {
      nombre: 'Ana Fernández',
      email: 'ana@example.com',
      password: defaultPassword,
      contacto: '+54 11 3333-9012',
      saldo: 80,
      limite: 15000,
      rating: 4.7,
      totalResenas: 18,
      ubicacion: 'San Telmo, CABA',
      verificado: true,
    },
  });

  const user4 = await prisma.user.create({
    data: {
      nombre: 'Pedro Gómez',
      email: 'pedro@example.com',
      password: defaultPassword,
      contacto: '+54 11 2222-3456',
      saldo: 300,
      limite: 15000,
      rating: 4.6,
      totalResenas: 12,
      ubicacion: 'Caballito, CABA',
      verificado: true,
    },
  });

  const user5 = await prisma.user.create({
    data: {
      nombre: 'Sofía López',
      email: 'sofia@example.com',
      password: defaultPassword,
      contacto: '+54 11 4444-7890',
      saldo: 120,
      limite: 15000,
      rating: 4.9,
      totalResenas: 32,
      ubicacion: 'Palermo, CABA',
      verificado: true,
    },
  });

  const user6 = await prisma.user.create({
    data: {
      nombre: 'Panadería Don José',
      email: 'donjose@example.com',
      password: defaultPassword,
      contacto: '+54 11 6666-1111',
      saldo: 250,
      limite: 15000,
      rating: 5.0,
      totalResenas: 56,
      ubicacion: 'Villa Crespo, CABA',
      verificado: true,
    },
  });

  // Perfil de mercado por usuario (ofrece, necesita, precioOferta)
  await prisma.userPerfilMercado.upsert({
    where: { userId: user1.id },
    create: { userId: user1.id, ofrece: 'Clases de idiomas', necesita: 'Diseño gráfico', precioOferta: 100 },
    update: {},
  });
  await prisma.userPerfilMercado.upsert({
    where: { userId: user2.id },
    create: { userId: user2.id, ofrece: 'Reparación de PC y celulares', necesita: 'Clases de yoga', precioOferta: 150 },
    update: {},
  });
  for (const u of [user3, user4, user5, user6]) {
    await prisma.userPerfilMercado.upsert({
      where: { userId: u.id },
      create: { userId: u.id },
      update: {},
    });
  }

  // Imágenes usando Unsplash (imágenes reales y visibles)
  const images = {
    clases: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=300&fit=crop',
    reparacion: 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=400&h=300&fit=crop',
    pan: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop',
    diseño: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=300&fit=crop',
    bicicleta: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=300&fit=crop',
    yoga: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=300&fit=crop',
    fotografia: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400&h=300&fit=crop',
    muebles: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop',
  };

  // Crear items del market
  const item1 = await prisma.marketItem.create({
    data: {
      titulo: 'Clases de inglés online',
      descripcion: 'Clases personalizadas de inglés para todos los niveles',
      descripcionCompleta: 'Ofrezco clases de inglés online personalizadas para estudiantes de todos los niveles. Material incluido y horarios flexibles.',
      precio: 50,
      rubro: 'servicios',
      ubicacion: 'Palermo, CABA',
      distancia: 2.5,
      imagen: images.clases,
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
      descripcionCompleta: 'Servicio técnico profesional especializado en reparación de computadoras y notebooks. Diagnóstico gratuito y garantía.',
      precio: 80,
      rubro: 'servicios',
      ubicacion: 'Belgrano, CABA',
      distancia: 5.2,
      imagen: images.reparacion,
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

  const item3 = await prisma.marketItem.create({
    data: {
      titulo: 'Pan casero artesanal',
      descripcion: 'Pan de masa madre, hecho a mano con ingredientes orgánicos',
      descripcionCompleta: 'Pan artesanal de masa madre, hecho a mano con ingredientes orgánicos. Fresco todos los días.',
      precio: 30,
      rubro: 'alimentos',
      ubicacion: 'Villa Crespo, CABA',
      distancia: 3.8,
      imagen: images.pan,
      vendedorId: user6.id,
      rating: 5.0,
      detalles: {
        create: [
          { clave: 'tipo', valor: 'Artesanal' },
          { clave: 'conservacion', valor: 'Fresco' },
          { clave: 'cantidad', valor: 'Familiar' },
        ],
      },
      caracteristicas: {
        create: [
          { texto: 'Ingredientes orgánicos' },
          { texto: 'Hecho a mano' },
          { texto: 'Fresco diario' },
        ],
      },
    },
  });

  const item4 = await prisma.marketItem.create({
    data: {
      titulo: 'Diseño de logos',
      descripcion: 'Diseño profesional de identidad visual para tu marca',
      descripcionCompleta: 'Diseño profesional de identidad visual, logos y branding para tu marca o emprendimiento.',
      precio: 120,
      rubro: 'servicios',
      ubicacion: 'San Telmo, CABA',
      distancia: 7.1,
      imagen: images.diseño,
      vendedorId: user3.id,
      rating: 4.7,
      detalles: {
        create: [
          { clave: 'tipo', valor: 'Diseño' },
          { clave: 'modalidad', valor: 'Online' },
          { clave: 'experiencia', valor: 'Profesional' },
        ],
      },
      caracteristicas: {
        create: [
          { texto: '3 revisiones incluidas' },
          { texto: 'Entrega en 5 días' },
          { texto: 'Archivos vectoriales' },
        ],
      },
    },
  });

  const item5 = await prisma.marketItem.create({
    data: {
      titulo: 'Bicicleta usada',
      descripcion: 'Bicicleta de montaña en excelente estado, solo 2 años de uso',
      descripcionCompleta: 'Bicicleta de montaña en excelente estado, solo 2 años de uso. Mantenimiento al día.',
      precio: 200,
      rubro: 'productos',
      ubicacion: 'Caballito, CABA',
      distancia: 4.3,
      imagen: images.bicicleta,
      vendedorId: user4.id,
      rating: 4.6,
      detalles: {
        create: [
          { clave: 'categoria', valor: 'Deportes' },
          { clave: 'estado', valor: 'Usado - Como nuevo' },
          { clave: 'entrega', valor: 'Retiro' },
        ],
      },
      caracteristicas: {
        create: [
          { texto: 'Mantenimiento al día' },
          { texto: 'Accesorios incluidos' },
          { texto: 'Excelente estado' },
        ],
      },
    },
  });

  const item6 = await prisma.marketItem.create({
    data: {
      titulo: 'Taller de yoga',
      descripcion: 'Clases grupales de yoga y meditación en parque',
      descripcionCompleta: 'Clases grupales de yoga y meditación al aire libre en parque. Para todos los niveles.',
      precio: 40,
      rubro: 'experiencias',
      ubicacion: 'Palermo, CABA',
      distancia: 2.1,
      imagen: images.yoga,
      vendedorId: user5.id,
      rating: 4.9,
      detalles: {
        create: [
          { clave: 'tipo', valor: 'Talleres' },
          { clave: 'duracion', valor: '1 hora' },
          { clave: 'participantes', valor: 'Grupo pequeño' },
        ],
      },
      caracteristicas: {
        create: [
          { texto: 'Al aire libre' },
          { texto: 'Material incluido' },
          { texto: 'Todos los niveles' },
        ],
      },
    },
  });

  const item7 = await prisma.marketItem.create({
    data: {
      titulo: 'Fotografía de eventos',
      descripcion: 'Servicio profesional de fotografía para eventos sociales',
      descripcionCompleta: 'Servicio profesional de fotografía para eventos sociales, cumpleaños, casamientos y más.',
      precio: 150,
      rubro: 'servicios',
      ubicacion: 'Recoleta, CABA',
      distancia: 6.5,
      imagen: images.fotografia,
      vendedorId: user5.id,
      rating: 5.0,
      detalles: {
        create: [
          { clave: 'tipo', valor: 'Fotografía' },
          { clave: 'modalidad', valor: 'Presencial' },
          { clave: 'experiencia', valor: 'Profesional' },
        ],
      },
      caracteristicas: {
        create: [
          { texto: 'Edición incluida' },
          { texto: 'Entrega en 48hs' },
          { texto: 'Fotos en alta resolución' },
        ],
      },
    },
  });

  const item8 = await prisma.marketItem.create({
    data: {
      titulo: 'Muebles de madera reciclada',
      descripcion: 'Muebles únicos hechos con madera reciclada, diseño moderno',
      descripcionCompleta: 'Muebles únicos hechos con madera reciclada, diseño moderno y sustentable.',
      precio: 300,
      rubro: 'productos',
      ubicacion: 'Villa Urquiza, CABA',
      distancia: 8.2,
      imagen: images.muebles,
      vendedorId: user4.id,
      rating: 4.8,
      detalles: {
        create: [
          { clave: 'categoria', valor: 'Hogar' },
          { clave: 'estado', valor: 'Nuevo' },
          { clave: 'entrega', valor: 'Ambos' },
        ],
      },
      caracteristicas: {
        create: [
          { texto: 'Material reciclado' },
          { texto: 'Diseño único' },
          { texto: 'Sustentable' },
        ],
      },
    },
  });

  console.log('✅ Seed completed!');
  console.log('Created users:', { 
    user1: user1.id, 
    user2: user2.id, 
    user3: user3.id,
    user4: user4.id,
    user5: user5.id,
    user6: user6.id,
  });
  console.log('Created items:', { 
    item1: item1.id, 
    item2: item2.id,
    item3: item3.id,
    item4: item4.id,
    item5: item5.id,
    item6: item6.id,
    item7: item7.id,
    item8: item8.id,
  });
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
