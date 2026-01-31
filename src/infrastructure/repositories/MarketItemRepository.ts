import { MarketItem } from '../../domain/entities/MarketItem.js';
import { IMarketItemRepository, MarketItemFilters } from '../../domain/repositories/IMarketItemRepository.js';
import prisma from '../database/prisma.js';

export class MarketItemRepository implements IMarketItemRepository {
  async findById(id: number): Promise<MarketItem | null> {
    const itemData = await prisma.marketItem.findUnique({
      where: { id },
      include: {
        detalles: true,
        caracteristicas: true,
      },
    });

    if (!itemData) return null;

    const detalles: Record<string, string> = {};
    itemData.detalles.forEach((d: { clave: string; valor: string }) => {
      detalles[d.clave] = d.valor;
    });

    const caracteristicas = itemData.caracteristicas.map((c: { texto: string }) => c.texto);

    return MarketItem.create({
      id: itemData.id,
      titulo: itemData.titulo,
      descripcion: itemData.descripcion,
      precio: itemData.precio,
      rubro: itemData.rubro as 'servicios' | 'productos' | 'alimentos' | 'experiencias',
      vendedorId: itemData.vendedorId,
      descripcionCompleta: itemData.descripcionCompleta || undefined,
      ubicacion: itemData.ubicacion,
      distancia: itemData.distancia || undefined,
      imagen: itemData.imagen,
      rating: itemData.rating,
      detalles,
      caracteristicas,
      createdAt: itemData.createdAt,
      updatedAt: itemData.updatedAt,
    });
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

    const itemsData = await prisma.marketItem.findMany({
      where,
      include: {
        detalles: true,
        caracteristicas: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return itemsData.map((itemData: any) => {
      const detalles: Record<string, string> = {};
      itemData.detalles.forEach((d: { clave: string; valor: string }) => {
        detalles[d.clave] = d.valor;
      });

      const caracteristicas = itemData.caracteristicas.map((c: { texto: string }) => c.texto);

      return MarketItem.create({
        id: itemData.id,
        titulo: itemData.titulo,
        descripcion: itemData.descripcion,
        precio: itemData.precio,
        rubro: itemData.rubro as 'servicios' | 'productos' | 'alimentos' | 'experiencias',
        vendedorId: itemData.vendedorId,
        descripcionCompleta: itemData.descripcionCompleta || undefined,
        ubicacion: itemData.ubicacion,
        distancia: itemData.distancia || undefined,
        imagen: itemData.imagen,
        rating: itemData.rating,
        detalles,
        caracteristicas,
        createdAt: itemData.createdAt,
        updatedAt: itemData.updatedAt,
      });
    });
  }

  async findByPrecioAproximado(precioReferencia: number, margenPorcentaje: number): Promise<MarketItem[]> {
    const margen = precioReferencia * margenPorcentaje;
    const precioMin = precioReferencia - margen;
    const precioMax = precioReferencia + margen;

    const itemsData = await prisma.marketItem.findMany({
      where: {
        precio: {
          gte: precioMin,
          lte: precioMax,
        },
      },
      include: {
        detalles: true,
        caracteristicas: true,
      },
    });

    return itemsData.map((itemData: any) => {
      const detalles: Record<string, string> = {};
      itemData.detalles.forEach((d: { clave: string; valor: string }) => {
        detalles[d.clave] = d.valor;
      });

      const caracteristicas = itemData.caracteristicas.map((c: { texto: string }) => c.texto);

      return MarketItem.create({
        id: itemData.id,
        titulo: itemData.titulo,
        descripcion: itemData.descripcion,
        precio: itemData.precio,
        rubro: itemData.rubro as 'servicios' | 'productos' | 'alimentos' | 'experiencias',
        vendedorId: itemData.vendedorId,
        descripcionCompleta: itemData.descripcionCompleta || undefined,
        ubicacion: itemData.ubicacion,
        distancia: itemData.distancia || undefined,
        imagen: itemData.imagen,
        rating: itemData.rating,
        detalles,
        caracteristicas,
        createdAt: itemData.createdAt,
        updatedAt: itemData.updatedAt,
      });
    });
  }

  async save(item: MarketItem): Promise<MarketItem> {
    const itemData = await prisma.marketItem.create({
      data: {
        titulo: item.titulo,
        descripcion: item.descripcion,
        descripcionCompleta: item.descripcionCompleta,
        precio: item.precio,
        rubro: item.rubro,
        ubicacion: item.ubicacion || 'CABA',
        distancia: item.distancia,
        imagen: item.imagen || '',
        vendedorId: item.vendedorId,
        rating: item.rating || 0,
        detalles: {
          create: Object.entries(item.detalles || {}).map(([clave, valor]) => ({
            clave,
            valor,
          })),
        },
        caracteristicas: {
          create: (item.caracteristicas || []).map(texto => ({ texto })),
        },
      },
      include: {
        detalles: true,
        caracteristicas: true,
      },
    });

    const detalles: Record<string, string> = {};
    itemData.detalles.forEach((d: { clave: string; valor: string }) => {
      detalles[d.clave] = d.valor;
    });

    const caracteristicas = itemData.caracteristicas.map((c: { texto: string }) => c.texto);

    return MarketItem.create({
      id: itemData.id,
      titulo: itemData.titulo,
      descripcion: itemData.descripcion,
      precio: itemData.precio,
      rubro: itemData.rubro as 'servicios' | 'productos' | 'alimentos' | 'experiencias',
      vendedorId: itemData.vendedorId,
      descripcionCompleta: itemData.descripcionCompleta || undefined,
      ubicacion: itemData.ubicacion,
      distancia: itemData.distancia || undefined,
      imagen: itemData.imagen,
      rating: itemData.rating,
      detalles,
      caracteristicas,
      createdAt: itemData.createdAt,
      updatedAt: itemData.updatedAt,
    });
  }

  async update(item: MarketItem): Promise<MarketItem> {
    // Eliminar detalles y características existentes
    await prisma.marketItemDetalle.deleteMany({
      where: { marketItemId: item.id },
    });
    await prisma.marketItemCaracteristica.deleteMany({
      where: { marketItemId: item.id },
    });

    const itemData = await prisma.marketItem.update({
      where: { id: item.id },
      data: {
        titulo: item.titulo,
        descripcion: item.descripcion,
        descripcionCompleta: item.descripcionCompleta,
        precio: item.precio,
        rubro: item.rubro,
        ubicacion: item.ubicacion,
        distancia: item.distancia,
        imagen: item.imagen,
        rating: item.rating,
        detalles: {
          create: Object.entries(item.detalles || {}).map(([clave, valor]) => ({
            clave,
            valor,
          })),
        },
        caracteristicas: {
          create: (item.caracteristicas || []).map(texto => ({ texto })),
        },
      },
      include: {
        detalles: true,
        caracteristicas: true,
      },
    });

    const detalles: Record<string, string> = {};
    itemData.detalles.forEach((d: { clave: string; valor: string }) => {
      detalles[d.clave] = d.valor;
    });

    const caracteristicas = itemData.caracteristicas.map((c: { texto: string }) => c.texto);

    return MarketItem.create({
      id: itemData.id,
      titulo: itemData.titulo,
      descripcion: itemData.descripcion,
      precio: itemData.precio,
      rubro: itemData.rubro as 'servicios' | 'productos' | 'alimentos' | 'experiencias',
      vendedorId: itemData.vendedorId,
      descripcionCompleta: itemData.descripcionCompleta || undefined,
      ubicacion: itemData.ubicacion,
      distancia: itemData.distancia || undefined,
      imagen: itemData.imagen,
      rating: itemData.rating,
      detalles,
      caracteristicas,
      createdAt: itemData.createdAt,
      updatedAt: itemData.updatedAt,
    });
  }

  async delete(id: number): Promise<void> {
    await prisma.marketItem.delete({
      where: { id },
    });
  }
}
