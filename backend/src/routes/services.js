import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { autenticarToken } from "../middlewares/auth.js";

const router = Router();

// 1. LISTAR SERVICIOS (Público)
router.get("/", async (req, res) => {
  try {
    const { includeInactive } = req.query;
    const where = includeInactive === "true" ? {} : { isActive: true };

    const servicios = await prisma.service.findMany({
      where,
      orderBy: { title: "asc" },
    });

    res.json(servicios);
  } catch (error) {
    console.error("Error al obtener servicios:", error);
    res.status(500).json({ error: "Error interno al consultar servicios." });
  }
});

// 2. OBTENER CATÁLOGO PERSONALIZADO
router.get("/personalizado", async (req, res) => {
  try {
    const { customerId } = req.query;

    const servicios = await prisma.service.findMany({
      where: { isActive: true },
      orderBy: [
        { isPromotion: "desc" },
        { highlightPriority: "desc" },
        { title: "asc" },
      ],
    });

    if (!customerId) {
      return res.json(servicios);
    }

    const frecuencias = await prisma.serviceFrecuencies.findMany({
      where: { customerId },
    });

    const mapaFrecuencia = new Map(
      frecuencias.map((f) => [f.serviceId, f.count]),
    );

    const serviciosPersonalizados = servicios
      .map((s) => ({
        ...s,
        userFrequency: mapaFrecuencia.get(s.id) || 0,
      }))
      .sort((a, b) => (b.userFrequency || 0) - (a.userFrequency || 0));

    res.json(serviciosPersonalizados);
  } catch (error) {
    console.error("Error al obtener servicios personalizados:", error);
    res.status(500).json({ error: "Error al personalizar catálogo." });
  }
});

// 3. CREAR NUEVO SERVICIO (ADMIN)
router.post("/", autenticarToken, async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      durationMin,
      category,
      imageUrl,
      advancePaymentPercent,
    } = req.body;

    if (!title || !price || !durationMin || !category) {
      return res.status(400).json({
        error: "Título, precio, duración y categoría son requeridos.",
      });
    }

    const nuevoServicio = await prisma.service.create({
      data: {
        title,
        description,
        price: Number(price),
        durationMin: Number(durationMin),
        category,
        imageUrl: imageUrl || null,
        advancePaymentPercent: advancePaymentPercent
          ? Number(advancePaymentPercent)
          : 0.2,
        isActive: true,
      },
    });

    res.status(201).json(nuevoServicio);
  } catch (error) {
    console.error("Error al crear servicio:", error);
    res.status(500).json({ error: "Error interno al crear el servicio." });
  }
});

// 4. ACTUALIZAR SERVICIO (ADMIN)
router.put("/:id", autenticarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      price,
      durationMin,
      category,
      imageUrl,
      advancePaymentPercent,
      isActive,
    } = req.body;

    const servicioActualizado = await prisma.service.update({
      where: { id },
      data: {
        title,
        description,
        price: price ? Number(price) : undefined,
        durationMin: durationMin ? Number(durationMin) : undefined,
        category,
        imageUrl,
        advancePaymentPercent:
          advancePaymentPercent !== undefined
            ? Number(advancePaymentPercent)
            : undefined,
        isActive,
      },
    });

    res.json(servicioActualizado);
  } catch (error) {
    console.error("Error al actualizar servicio:", error);
    res.status(500).json({ error: "Error al actualizar el servicio." });
  }
});

// 5. ALTERNAR ESTADO ACTIVO/INACTIVO (ADMIN)
router.patch("/:id/toggle-status", autenticarToken, async (req, res) => {
  try {
    const { id } = req.params;

    const servicio = await prisma.service.findUnique({ where: { id } });
    if (!servicio)
      return res.status(404).json({ error: "Servicio no encontrado." });

    const servicioActualizado = await prisma.service.update({
      where: { id },
      data: { isActive: !servicio.isActive },
    });

    res.json(servicioActualizado);
  } catch (error) {
    console.error("Error al cambiar estado:", error);
    res
      .status(500)
      .json({ error: "Error al cambiar disponibilidad del servicio." });
  }
});

// 6. ALTERNAR MARCA DE PROMOCIÓN (ADMIN - EXCLUSIVO: Solo 1 servicio a la vez)
router.patch("/:id/toggle-promotion", autenticarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const servicio = await prisma.service.findUnique({ where: { id } });
    if (!servicio)
      return res.status(404).json({ error: "Servicio no encontrado." });

    const nuevoEstadoPromo = !servicio.isPromotion;

    // Si vamos a activar la promoción en este servicio, quitamos la promo de todos los demás
    if (nuevoEstadoPromo) {
      await prisma.service.updateMany({
        where: { isPromotion: true },
        data: { isPromotion: false },
      });
    }

    const actualizado = await prisma.service.update({
      where: { id },
      data: { isPromotion: nuevoEstadoPromo },
    });

    res.json(actualizado);
  } catch (error) {
    console.error("Error al actualizar promoción:", error);
    res.status(500).json({ error: "Error al actualizar estado de promoción." });
  }
});

// 7. ACTUALIZAR PRIORIDAD DE DESTACADO (ADMIN)
router.patch("/:id/highlight-priority", autenticarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { priority } = req.body;

    const actualizado = await prisma.service.update({
      where: { id },
      data: { highlightPriority: Number(priority) || 0 },
    });

    res.json(actualizado);
  } catch (error) {
    console.error("Error al actualizar prioridad:", error);
    res.status(500).json({ error: "Error al cambiar la prioridad." });
  }
});

export default router;
