/**
 * Seed: crea 1 cuenta de prueba y 100 productos con la imagen del logo.
 * No borra datos existentes.
 * Ejecutar: npx tsx src/infrastructure/database/seed-100-products.ts
 */

import prisma from './prisma.js';
import bcrypt from 'bcryptjs';

const LOGO_URL = '/logo.jpg';

const PRODUCTOS = [
  { titulo: 'Clases de inglés online', descripcion: 'Clases personalizadas para todos los niveles', rubro: 'servicios' as const, precio: 50, ubicacion: 'Palermo, CABA' },
  { titulo: 'Clases de francés', descripcion: 'Aprendé francés con método conversacional', rubro: 'servicios' as const, precio: 60, ubicacion: 'Belgrano, CABA' },
  { titulo: 'Clases de portugués', descripcion: 'Preparación para viajes y negocios', rubro: 'servicios' as const, precio: 45, ubicacion: 'Recoleta, CABA' },
  { titulo: 'Clases de yoga', descripcion: 'Hatha y vinyasa para principiantes y avanzados', rubro: 'servicios' as const, precio: 40, ubicacion: 'Palermo, CABA' },
  { titulo: 'Clases de pilates', descripcion: 'Reforma y mat pilates', rubro: 'servicios' as const, precio: 55, ubicacion: 'Caballito, CABA' },
  { titulo: 'Clases de guitarra', descripcion: 'Iniciación y nivel intermedio', rubro: 'servicios' as const, precio: 70, ubicacion: 'San Telmo, CABA' },
  { titulo: 'Clases de piano', descripcion: 'Método para niños y adultos', rubro: 'servicios' as const, precio: 80, ubicacion: 'Villa Crespo, CABA' },
  { titulo: 'Clases de cocina', descripcion: 'Cocina italiana y pastas caseras', rubro: 'servicios' as const, precio: 90, ubicacion: 'Palermo, CABA' },
  { titulo: 'Reparación de PC', descripcion: 'Formateo, upgrade y diagnóstico', rubro: 'servicios' as const, precio: 75, ubicacion: 'Belgrano, CABA' },
  { titulo: 'Reparación de celulares', descripcion: 'Cambio de pantalla y batería', rubro: 'servicios' as const, precio: 100, ubicacion: 'Caballito, CABA' },
  { titulo: 'Diseño de logos', descripcion: 'Identidad visual para tu marca', rubro: 'servicios' as const, precio: 120, ubicacion: 'San Telmo, CABA' },
  { titulo: 'Diseño web', descripcion: 'Landing y sitios corporativos', rubro: 'servicios' as const, precio: 200, ubicacion: 'Palermo, CABA' },
  { titulo: 'Fotografía de eventos', descripcion: 'Cumpleaños, casamientos y eventos', rubro: 'servicios' as const, precio: 150, ubicacion: 'Recoleta, CABA' },
  { titulo: 'Fotografía de productos', descripcion: 'Fotos para redes y catálogos', rubro: 'servicios' as const, precio: 80, ubicacion: 'Palermo, CABA' },
  { titulo: 'Clases de Excel', descripcion: 'Desde básico hasta tablas dinámicas', rubro: 'servicios' as const, precio: 65, ubicacion: 'Belgrano, CABA' },
  { titulo: 'Consultoría en marketing', descripcion: 'Redes sociales y posicionamiento', rubro: 'servicios' as const, precio: 180, ubicacion: 'Palermo, CABA' },
  { titulo: 'Traducción inglés-español', descripcion: 'Documentos y sitios web', rubro: 'servicios' as const, precio: 50, ubicacion: 'Caballito, CABA' },
  { titulo: 'Corte y confección', descripcion: 'Arreglos y prendas a medida', rubro: 'servicios' as const, precio: 95, ubicacion: 'Villa Crespo, CABA' },
  { titulo: 'Paseo de perros', descripcion: 'Paseos grupales por el barrio', rubro: 'servicios' as const, precio: 35, ubicacion: 'Palermo, CABA' },
  { titulo: 'Cuidador de mascotas', descripcion: 'Cuidado en tu hogar cuando viajes', rubro: 'servicios' as const, precio: 60, ubicacion: 'Belgrano, CABA' },
  { titulo: 'Bicicleta usada', descripcion: 'Bici de paseo en buen estado', rubro: 'productos' as const, precio: 85, ubicacion: 'Caballito, CABA' },
  { titulo: 'Bicicleta de montaña', descripcion: 'Rodado 29, suspensiones', rubro: 'productos' as const, precio: 250, ubicacion: 'Palermo, CABA' },
  { titulo: 'Notebook usada', descripcion: 'Intel i5, 8GB RAM, ideal para estudio', rubro: 'productos' as const, precio: 180, ubicacion: 'Belgrano, CABA' },
  { titulo: 'Monitor 24 pulgadas', descripcion: 'Full HD, muy buen estado', rubro: 'productos' as const, precio: 90, ubicacion: 'San Telmo, CABA' },
  { titulo: 'Teclado mecánico', descripcion: 'RGB, switches red', rubro: 'productos' as const, precio: 70, ubicacion: 'Palermo, CABA' },
  { titulo: 'Mouse inalámbrico', descripcion: 'Ergonómico, batería recargable', rubro: 'productos' as const, precio: 25, ubicacion: 'Caballito, CABA' },
  { titulo: 'Auriculares Bluetooth', descripcion: 'Cancelación de ruido', rubro: 'productos' as const, precio: 65, ubicacion: 'Recoleta, CABA' },
  { titulo: 'Libros de programación', descripcion: 'JavaScript, Python y React', rubro: 'productos' as const, precio: 40, ubicacion: 'Belgrano, CABA' },
  { titulo: 'Libros de cocina', descripcion: 'Recetarios varios', rubro: 'productos' as const, precio: 30, ubicacion: 'Palermo, CABA' },
  { titulo: 'Mochila de trekking', descripcion: '40L, impermeable', rubro: 'productos' as const, precio: 95, ubicacion: 'Caballito, CABA' },
  { titulo: 'Carpa 2 personas', descripcion: 'Ligera, para camping', rubro: 'productos' as const, precio: 120, ubicacion: 'Palermo, CABA' },
  { titulo: 'Zapatillas running', descripcion: 'Talle 42, poco uso', rubro: 'productos' as const, precio: 75, ubicacion: 'Belgrano, CABA' },
  { titulo: 'Ropa deportiva', descripcion: 'Remeras y shorts varios talles', rubro: 'productos' as const, precio: 35, ubicacion: 'San Telmo, CABA' },
  { titulo: 'Bebé: cochecito', descripcion: 'Cochecito doble uso, reclinable', rubro: 'productos' as const, precio: 150, ubicacion: 'Palermo, CABA' },
  { titulo: 'Juguetes infantiles', descripcion: 'Lote de juguetes en buen estado', rubro: 'productos' as const, precio: 45, ubicacion: 'Caballito, CABA' },
  { titulo: 'Mueble biblioteca', descripcion: 'Madera, 5 estantes', rubro: 'productos' as const, precio: 110, ubicacion: 'Villa Crespo, CABA' },
  { titulo: 'Mesa de luz', descripcion: 'MDF blanco, minimalista', rubro: 'productos' as const, precio: 55, ubicacion: 'Belgrano, CABA' },
  { titulo: 'Silla de escritorio', descripcion: 'Ergonómica, respaldo alto', rubro: 'productos' as const, precio: 85, ubicacion: 'Palermo, CABA' },
  { titulo: 'Lámpara vintage', descripcion: 'Estilo industrial', rubro: 'productos' as const, precio: 60, ubicacion: 'San Telmo, CABA' },
  { titulo: 'Pan de masa madre', descripcion: 'Hecho a mano, orgánico', rubro: 'alimentos' as const, precio: 35, ubicacion: 'Villa Crespo, CABA' },
  { titulo: 'Facturas caseras', descripcion: 'Medialunas y facturas variadas', rubro: 'alimentos' as const, precio: 25, ubicacion: 'Caballito, CABA' },
  { titulo: 'Tortas personalizadas', descripcion: 'Cumpleaños y eventos', rubro: 'alimentos' as const, precio: 95, ubicacion: 'Palermo, CABA' },
  { titulo: 'Mermeladas artesanales', descripcion: 'Frutilla, durazno, ciruela', rubro: 'alimentos' as const, precio: 30, ubicacion: 'Belgrano, CABA' },
  { titulo: 'Dulce de leche casero', descripcion: 'Hecho en olla de cobre', rubro: 'alimentos' as const, precio: 40, ubicacion: 'San Telmo, CABA' },
  { titulo: 'Empanadas caseras', descripcion: 'Carne, pollo, jamón y queso', rubro: 'alimentos' as const, precio: 20, ubicacion: 'Palermo, CABA' },
  { titulo: 'Alfajores artesanales', descripcion: 'Maicena y chocolate', rubro: 'alimentos' as const, precio: 28, ubicacion: 'Recoleta, CABA' },
  { titulo: 'Budines caseros', descripcion: 'Naranja, limón, chocolate', rubro: 'alimentos' as const, precio: 32, ubicacion: 'Villa Crespo, CABA' },
  { titulo: 'Galletas de avena', descripcion: 'Sin TACC, veganas', rubro: 'alimentos' as const, precio: 22, ubicacion: 'Caballito, CABA' },
  { titulo: 'Tour por San Telmo', descripcion: 'Recorrido histórico guiado', rubro: 'experiencias' as const, precio: 45, ubicacion: 'San Telmo, CABA' },
  { titulo: 'Clase de tango', descripcion: 'Iniciación para parejas', rubro: 'experiencias' as const, precio: 70, ubicacion: 'Palermo, CABA' },
  { titulo: 'Degustación de vinos', descripcion: '5 vinos con maridaje', rubro: 'experiencias' as const, precio: 90, ubicacion: 'Recoleta, CABA' },
  { titulo: 'Taller de cerámica', descripcion: 'Piezas únicas, 2 horas', rubro: 'experiencias' as const, precio: 80, ubicacion: 'Belgrano, CABA' },
  { titulo: 'Picnic en parque', descripcion: 'Canasta para 2 personas', rubro: 'experiencias' as const, precio: 55, ubicacion: 'Palermo, CABA' },
  { titulo: 'Fotografía de retrato', descripcion: 'Sesión 1 hora, 20 fotos editadas', rubro: 'experiencias' as const, precio: 120, ubicacion: 'Recoleta, CABA' },
  { titulo: 'Paseo en bicicleta', descripcion: 'Recorrido por la costa', rubro: 'experiencias' as const, precio: 40, ubicacion: 'Puerto Madero, CABA' },
  { titulo: 'Noche de juegos de mesa', descripcion: 'Grupo de hasta 6 personas', rubro: 'experiencias' as const, precio: 35, ubicacion: 'Caballito, CABA' },
  { titulo: 'Clase de dibujo', descripcion: 'Lápiz y acuarela', rubro: 'experiencias' as const, precio: 65, ubicacion: 'San Telmo, CABA' },
  { titulo: 'Meditación grupal', descripcion: 'Sesión semanal en parque', rubro: 'experiencias' as const, precio: 30, ubicacion: 'Palermo, CABA' },
];

const UBICACIONES = [
  'Palermo, CABA', 'Belgrano, CABA', 'Caballito, CABA', 'San Telmo, CABA',
  'Recoleta, CABA', 'Villa Crespo, CABA', 'Puerto Madero, CABA', 'La Boca, CABA',
  'Almagro, CABA', 'Flores, CABA', 'Villa Urquiza, CABA',
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log('🌱 Seed 100 productos...');

  const defaultPassword = await bcrypt.hash('password123', 10);

  const user = await prisma.user.upsert({
    where: { email: 'seed100@intercambius.com' },
    update: {},
    create: {
      nombre: 'Usuario Seed (100 productos)',
      email: 'seed100@intercambius.com',
      password: defaultPassword,
      contacto: '+54 11 0000-0000',
      saldo: 5000,
      limite: 150000,
      rating: 5.0,
      totalResenas: 0,
      ubicacion: 'Palermo, CABA',
      verificado: true,
    },
  });

  console.log('Usuario creado:', user.email, '(password: password123)');

  const baseProductos = [...PRODUCTOS];
  const created: number[] = [];

  for (let i = 0; i < 100; i++) {
    const base = baseProductos[i % baseProductos.length];
    const precioVariado = base.precio + randomInt(-15, 25);
    const precioFinal = Math.max(10, precioVariado);

    await prisma.marketItem.create({
      data: {
        titulo: base.titulo + (i >= baseProductos.length ? ` #${Math.floor(i / baseProductos.length) + 1}` : ''),
        descripcion: base.descripcion,
        precio: precioFinal,
        rubro: base.rubro,
        ubicacion: randomItem(UBICACIONES),
        imagen: LOGO_URL,
        vendedorId: user.id,
        rating: 4 + Math.random(),
      },
    });
    created.push(i + 1);
    if ((i + 1) % 20 === 0) console.log(`  ${i + 1}/100 productos creados`);
  }

  console.log('✅ Listo! 100 productos creados con imagen', LOGO_URL);
  console.log('   Login: seed100@intercambius.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
