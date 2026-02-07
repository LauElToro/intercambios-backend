import { MarketItem } from '../../domain/entities/MarketItem.js';
import { IMarketItemRepository, MarketItemFilters } from '../../domain/repositories/IMarketItemRepository.js';
import prisma from '../database/prisma.js';

/** Distancia en km entre dos puntos (fórmula de Haversine) */
function haversineDistanceKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

type PrismaItem = {
  id: number;
  titulo: string;
  descripcion: string;
  precio: number;
  tipoPago?: string | null;
  rubro: string;
  vendedorId: number;
  descripcionCompleta: string | null;
  ubicacion: string;
  lat: number | null;
  lng: number | null;
  distancia: number | null;
  imagen: string;
  rating: number;
  detalles: { clave: string; valor: string }[];
  caracteristicas: { texto: string }[];
  createdAt: Date;
  updatedAt: Date;
  slug?: string | null;
  status?: string | null;
  condition?: string | null;
  availability?: string | null;
  brand?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogImage?: string | null;
  categoryId?: number | null;
  images?: { url: string; alt: string | null; position: number; isPrimary: boolean; mediaType?: string }[];
};

function mapToEntity(itemData: PrismaItem): MarketItem {
  const detalles: Record<string, string> = {};
  itemData.detalles.forEach((d) => { detalles[d.clave] = d.valor; });
  const caracteristicas = itemData.caracteristicas.map((c) => c.texto);
  const images = itemData.images?.map((img) => ({
    url: img.url,
    alt: img.alt ?? undefined,
    position: img.position,
    isPrimary: img.isPrimary,
    mediaType: (img as any).mediaType ?? 'image',
  }));
  return MarketItem.create({
    id: itemData.id,
    titulo: itemData.titulo,
    descripcion: itemData.descripcion,
    precio: itemData.precio,
    tipoPago: itemData.tipoPago ?? undefined,
    rubro: itemData.rubro as 'servicios' | 'productos' | 'alimentos' | 'experiencias',
    vendedorId: itemData.vendedorId,
    descripcionCompleta: itemData.descripcionCompleta ?? undefined,
    ubicacion: itemData.ubicacion,
    lat: itemData.lat ?? undefined,
    lng: itemData.lng ?? undefined,
    distancia: itemData.distancia ?? undefined,
    imagen: itemData.imagen,
    rating: itemData.rating,
    detalles,
    caracteristicas,
    createdAt: itemData.createdAt,
    updatedAt: itemData.updatedAt,
    slug: itemData.slug ?? undefined,
    status: itemData.status ?? undefined,
    condition: itemData.condition ?? undefined,
    availability: itemData.availability ?? undefined,
    brand: itemData.brand ?? undefined,
    metaTitle: itemData.metaTitle ?? undefined,
    metaDescription: itemData.metaDescription ?? undefined,
    ogImage: itemData.ogImage ?? undefined,
    categoryId: itemData.categoryId ?? undefined,
    images,
  });
}

export class MarketItemRepository implements IMarketItemRepository {
  async findById(id: number): Promise<MarketItem | null> {
    const itemData = await prisma.marketItem.findUnique({
      where: { id },
      include: {
        detalles: true,
        caracteristicas: true,
        images: { orderBy: { position: 'asc' } },
      },
    });

    if (!itemData) return null;
    return mapToEntity(itemData as PrismaItem);
  }

  async findAll(filters?: MarketItemFilters): Promise<MarketItem[]> {
    const where: any = {};

    if (filters?.rubro && filters.rubro !== 'todos') {
      where.rubro = filters.rubro;
    }

    if (filters?.tipo) {
      const esProducto = filters.tipo === 'productos';
      where.rubro = esProducto 
        ? { in: ['productos', 'alimentos'] }
        : { in: ['servicios', 'experiencias'] };
    }

    if (filters?.precioMin !== undefined) {
      where.precio = { ...where.precio, gte: filters.precioMin };
    }

    if (filters?.precioMax !== undefined) {
      where.precio = { ...where.precio, lte: filters.precioMax };
    }

    if (filters?.vendedorId) {
      where.vendedorId = filters.vendedorId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    const itemsData = await prisma.marketItem.findMany({
      where,
      include: {
        detalles: true,
        caracteristicas: true,
        images: { orderBy: { position: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    let items = itemsData.map((itemData) => mapToEntity(itemData as PrismaItem));

    // Filtrar por distancia si se proporciona ubicación del usuario
    const userLat = filters?.userLat;
    const userLng = filters?.userLng;
    const maxKm = filters?.distanciaMax;
    const canFilterByDistance = typeof userLat === 'number' && !isNaN(userLat) &&
      typeof userLng === 'number' && !isNaN(userLng) &&
      typeof maxKm === 'number' && !isNaN(maxKm) && maxKm > 0;

    if (canFilterByDistance) {
      items = items.filter((item) => {
        if (item.lat == null || item.lng == null) return false;
        const dist = haversineDistanceKm(userLat!, userLng!, item.lat, item.lng);
        return dist <= maxKm!;
      });
      // Agregar distancia calculada a cada item para mostrar en el frontend
      items = items.map((item) => {
        if (item.lat != null && item.lng != null) {
          const dist = haversineDistanceKm(userLat!, userLng!, item.lat!, item.lng!);
          return { ...item, distancia: Math.round(dist * 10) / 10 };
        }
        return item;
      });
    }

    return items;
  }

  async findByPrecioAproximado(precioReferencia: number, margenPorcentaje: number): Promise<MarketItem[]> {
    const margen = precioReferencia * margenPorcentaje;
    const precioMin = precioReferencia - margen;
    const precioMax = precioReferencia + margen;

    const itemsData = await prisma.marketItem.findMany({
      where: {
        precio: { gte: precioMin, lte: precioMax },
      },
      include: {
        detalles: true,
        caracteristicas: true,
        images: { orderBy: { position: 'asc' } },
      },
    });

    return itemsData.map((itemData) => mapToEntity(itemData as PrismaItem));
  }

  async save(item: MarketItem): Promise<MarketItem> {
    const data: Record<string, unknown> = {
      titulo: item.titulo,
      descripcion: item.descripcion,
      descripcionCompleta: item.descripcionCompleta,
      precio: item.precio,
      tipoPago: item.tipoPago ?? 'ix',
      rubro: item.rubro,
      ubicacion: item.ubicacion || 'CABA',
      lat: item.lat,
      lng: item.lng,
      distancia: item.distancia,
      imagen: item.imagen || '',
      vendedorId: item.vendedorId,
      rating: item.rating || 0,
      detalles: {
        create: Object.entries(item.detalles || {}).map(([clave, valor]) => ({ clave, valor })),
      },
      caracteristicas: {
        create: (item.caracteristicas || []).map((texto) => ({ texto })),
      },
    };
    if (item.slug != null) data.slug = item.slug;
    if (item.status != null) data.status = item.status;
    if (item.condition != null) data.condition = item.condition;
    if (item.availability != null) data.availability = item.availability;
    if (item.brand != null) data.brand = item.brand;
    if (item.metaTitle != null) data.metaTitle = item.metaTitle;
    if (item.metaDescription != null) data.metaDescription = item.metaDescription;
    if (item.ogImage != null) data.ogImage = item.ogImage;
    if (item.categoryId != null) data.categoryId = item.categoryId;
    if ((item.images?.length ?? 0) > 0) {
      (data as any).images = {
        create: item.images!.map((img, i) => ({
          url: img.url,
          alt: img.alt,
          position: img.position ?? i,
          isPrimary: img.isPrimary ?? false,
          mediaType: (img as any).mediaType ?? 'image',
        })),
      };
    }

    const itemData = await prisma.marketItem.create({
      data: data as any,
      include: {
        detalles: true,
        caracteristicas: true,
        images: { orderBy: { position: 'asc' } },
      },
    });

    return mapToEntity(itemData as PrismaItem);
  }

  async update(item: MarketItem): Promise<MarketItem> {
    await prisma.marketItemDetalle.deleteMany({ where: { marketItemId: item.id } });
    await prisma.marketItemCaracteristica.deleteMany({ where: { marketItemId: item.id } });
    await prisma.productImage.deleteMany({ where: { marketItemId: item.id } }).catch(() => {});

    const data: Record<string, unknown> = {
      titulo: item.titulo,
      descripcion: item.descripcion,
      descripcionCompleta: item.descripcionCompleta,
      precio: item.precio,
      tipoPago: item.tipoPago ?? 'ix',
      rubro: item.rubro,
      ubicacion: item.ubicacion ?? 'CABA',
      lat: item.lat,
      lng: item.lng,
      distancia: item.distancia,
      imagen: item.imagen ?? '',
      rating: item.rating ?? 0,
      detalles: {
        create: Object.entries(item.detalles || {}).map(([clave, valor]) => ({ clave, valor })),
      },
      caracteristicas: {
        create: (item.caracteristicas || []).map((texto) => ({ texto })),
      },
    };
    if (item.slug != null) data.slug = item.slug;
    if (item.status != null) data.status = item.status;
    if (item.condition != null) data.condition = item.condition;
    if (item.availability != null) data.availability = item.availability;
    if (item.brand != null) data.brand = item.brand;
    if (item.metaTitle != null) data.metaTitle = item.metaTitle;
    if (item.metaDescription != null) data.metaDescription = item.metaDescription;
    if (item.ogImage != null) data.ogImage = item.ogImage;
    if (item.categoryId != null) data.categoryId = item.categoryId;
    if ((item.images?.length ?? 0) > 0) {
      (data as any).images = {
        create: item.images!.map((img, i) => ({
          url: img.url,
          alt: img.alt,
          position: img.position ?? i,
          isPrimary: img.isPrimary ?? false,
          mediaType: (img as any).mediaType ?? 'image',
        })),
      };
    }

    const itemData = await prisma.marketItem.update({
      where: { id: item.id },
      data: data as any,
      include: {
        detalles: true,
        caracteristicas: true,
        images: { orderBy: { position: 'asc' } },
      },
    });

    return mapToEntity(itemData as PrismaItem);
  }

  async delete(id: number): Promise<void> {
    await prisma.marketItem.delete({
      where: { id },
    });
  }

  async findByVendedorId(vendedorId: number): Promise<MarketItem[]> {
    const itemsData = await prisma.marketItem.findMany({
      where: { vendedorId },
      include: {
        detalles: true,
        caracteristicas: true,
        images: { orderBy: { position: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return itemsData.map((itemData) => mapToEntity(itemData as PrismaItem));
  }
}
