import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { autenticarToken } from "../middlewares/auth.js";

const router = Router();

// CONSULTAR HORARIOS GENERALES (PÚBLICO Y ADMIN)
router.get("/", async (req, res) => {
  try {
    const horarios = await prisma.businessHour.findMany({
      orderBy: { dayOfWeek: "asc" },
    });
    res.json(horarios);
  } catch (error) {
    console.error("Error al consultar horarios:", error);
    res
      .status(500)
      .json({ error: "Error interno al obtener horarios del negocio." });
  }
});

// ACTUALIZAR O GUARDAR HORARIO DE UN DÍA ESPECÍFICO (ADMIN)
router.put("/:dayOfWeek", autenticarToken, async (req, res) => {
  try {
    const dayOfWeek = Number(req.params.dayOfWeek);
    const { isOpen, openTime, closeTime, breakStart, breakEnd } = req.body;

    const horarioActualizado = await prisma.businessHour.upsert({
      where: { dayOfWeek },
      update: {
        isOpen,
        openTime,
        closeTime,
        breakStart: breakStart || null,
        breakEnd: breakEnd || null,
      },
      create: {
        dayOfWeek,
        isOpen: isOpen ?? true,
        openTime: openTime || "10:00",
        closeTime: closeTime || "19:00",
        breakStart: breakStart || null,
        breakEnd: breakEnd || null,
      },
    });

    res.json(horarioActualizado);
  } catch (error) {
    console.error("Error al actualizar horario:", error);
    res
      .status(500)
      .json({ error: "Error al actualizar configuración de horario." });
  }
});

export default router;
