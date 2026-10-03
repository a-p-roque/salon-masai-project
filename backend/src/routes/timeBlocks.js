import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { autenticarToken } from "../middlewares/auth.js";

const router = Router();

// LISTAR BLOQUEOS (ADMIN Y CHECKOUT)
router.get("/", async (req, res) => {
  try {
    const { inicio, fin } = req.query;

    const bloqueos = await prisma.timeBlock.findMany({
      where:
        inicio && fin
          ? {
              OR: [
                {
                  startTime: {
                    gte: new Date(inicio),
                    lte: new Date(fin),
                  },
                },
                { isRecurring: true }, // Incluir bloqueos recurrentes
              ],
            }
          : undefined,
      orderBy: { startTime: "asc" },
    });

    res.json(bloqueos);
  } catch (error) {
    console.error("Error al obtener bloqueos:", error);
    res.status(500).json({ error: "Error al consultar bloqueos." });
  }
});

// CREAR BLOQUEO / DÍA COMPLETO / RECURRENTE (ADMIN)
router.post("/", autenticarToken, async (req, res) => {
  try {
    const { startTime, endTime, reason, isRecurring, recurrence, isFullDay } = req.body;

    if (!startTime || !endTime) {
      return res.status(400).json({ error: "startTime y endTime son requeridos." });
    }

    const nuevoBloqueo = await prisma.timeBlock.create({
      data: {
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        reason: reason || "Bloqueo de agenda",
        isRecurring: Boolean(isRecurring),
        recurrence: recurrence || null,
        isFullDay: Boolean(isFullDay),
      },
    });

    res.status(201).json(nuevoBloqueo);
  } catch (error) {
    console.error("Error al crear bloqueo:", error);
    res.status(500).json({ error: "Error al crear bloqueo de horario." });
  }
});

// ELIMINAR / DESBLOQUEAR (ADMIN)
router.delete("/:id", autenticarToken, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.timeBlock.delete({ where: { id } });
    res.json({ mensaje: "Bloqueo eliminado con éxito." });
  } catch (error) {
    console.error("Error al eliminar bloqueo:", error);
    res.status(500).json({ error: "Error al eliminar el bloqueo." });
  }
});

export default router;