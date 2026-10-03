import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { autenticarToken } from "../middlewares/auth.js";
import rateLimit from "express-rate-limit";
import { procesarReglasAutomatedCitas } from "../services/appointmentAutomation.js";

const router = Router();

const agendarLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    error: "Has realizado demasiadas solicitudes. Por favor intenta más tarde.",
  },
});

// 1. CREAR CITA (PÚBLICO UNIFICADO)
router.post("/", agendarLimiter, async (req, res) => {
  try {
    const {
      customerId,
      customerName,
      customerPhone,
      serviceId,
      startTime,
      notes,
    } = req.body;

    if (!serviceId || !startTime) {
      return res
        .status(400)
        .json({ error: "serviceId y startTime son requeridos." });
    }

    let finalCustomerId = customerId;

    if (!finalCustomerId) {
      if (!customerPhone || !customerName) {
        return res
          .status(400)
          .json({ error: "Nombre y teléfono son requeridos para agendar." });
      }

      const cleanPhone = customerPhone.replace(/\D/g, "");
      if (cleanPhone.length !== 10) {
        return res
          .status(400)
          .json({ error: "El teléfono debe contener 10 dígitos válidos." });
      }

      let cliente = await prisma.customer.findFirst({
        where: { phone: cleanPhone },
      });

      if (!cliente) {
        cliente = await prisma.customer.create({
          data: {
            name: customerName.trim(),
            phone: cleanPhone,
          },
        });
      }

      finalCustomerId = cliente.id;
    }

    // Regla de margen mínimo de 1 hora
    const fechaInicioCita = new Date(startTime);
    const ahora = new Date();
    const minutosDiferencia =
      (fechaInicioCita.getTime() - ahora.getTime()) / (1000 * 60);

    if (minutosDiferencia < 60) {
      return res.status(400).json({
        error:
          "Para agendar con menos de 1 hora de anticipación, por favor contáctanos directamente por WhatsApp.",
      });
    }

    const servicio = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!servicio || !servicio.isActive) {
      return res.status(404).json({ error: "El servicio no está disponible." });
    }

    const fechaFin = new Date(
      fechaInicioCita.getTime() + servicio.durationMin * 60000,
    );

    // Validar traslapes
    const citaTraslapada = await prisma.appointment.findFirst({
      where: {
        status: { not: "CANCELED" },
        AND: [
          { startTime: { lt: fechaFin } },
          { endTime: { gt: fechaInicioCita } },
        ],
      },
    });

    if (citaTraslapada) {
      return res
        .status(409)
        .json({ error: "El horario seleccionado ya fue ocupado." });
    }

    const bloqueoTraslapado = await prisma.timeBlock.findFirst({
      where: {
        AND: [
          { startTime: { lt: fechaFin } },
          { endTime: { gt: fechaInicioCita } },
        ],
      },
    });

    if (bloqueoTraslapado) {
      return res.status(409).json({
        error: "El horario seleccionado se encuentra bloqueado.",
      });
    }

    const anticipoMonto =
      Number(servicio.price) * (servicio.advancePaymentPercent ?? 0.2);
    const randomDigits = Math.floor(1000 + Math.random() * 9000);

    const nuevaCita = await prisma.appointment.create({
      data: {
        folio: `MS-${randomDigits}`,
        customerId: finalCustomerId,
        serviceId,
        startTime: fechaInicioCita,
        endTime: fechaFin,
        notes,
        status: "PENDING",
        advancePaymentAmount: anticipoMonto,
      },
      include: {
        customer: true,
        service: true,
      },
    });

    res.status(201).json(nuevaCita);
  } catch (error) {
    console.error("Error al procesar cita:", error);
    res.status(500).json({ error: "Error interno al procesar la reserva." });
  }
});

// 2. CONSULTAR AGENDA (ADMIN)
router.get("/", autenticarToken, async (req, res) => {
  try {
    await procesarReglasAutomatedCitas();

    const { inicio, fin } = req.query;

    const citas = await prisma.appointment.findMany({
      where:
        inicio && fin
          ? {
              startTime: {
                gte: new Date(inicio),
                lte: new Date(fin),
              },
            }
          : undefined,
      include: {
        customer: true,
        service: true,
      },
      orderBy: { startTime: "asc" },
    });

    res.json(citas);
  } catch (error) {
    console.error("Error al obtener citas:", error);
    res.status(500).json({ error: "Error al consultar la agenda" });
  }
});

// 3. DISPONIBILIDAD DE SLOTS (Filtra pasados y margen de +1 hora)
router.get("/disponibilidad", async (req, res) => {
  try {
    const { fecha, duracionTotalMin } = req.query;

    if (!fecha) {
      return res.status(400).json({ error: "La fecha es requerida." });
    }

    // 1. Extraer la fecha limpia YYYY-MM-DD para evitar descalibres por zona horaria UTC
    const dateStr = fecha.split("T")[0];
    const [year, month, day] = dateStr.split("-").map(Number);

    // Crear la fecha a las 00:00:00 en HORA LOCAL del servidor
    const targetDate = new Date(year, month - 1, day, 0, 0, 0, 0);

    // Obtener día de la semana (0 = Domingo, 1 = Lunes, ..., 6 = Sábado)
    const dayOfWeek = targetDate.getDay();

    const businessHour = await prisma.businessHour.findUnique({
      where: { dayOfWeek },
    });

    if (businessHour && !businessHour.isOpen) {
      return res.json({
        slots: [],
        isOpen: false,
        mensaje: "El salón se encuentra cerrado este día.",
      });
    }

    const openTimeStr = businessHour?.openTime || "10:00";
    const closeTimeStr = businessHour?.closeTime || "19:00";

    const [openH, openM] = openTimeStr.split(":").map(Number);
    const [closeH, closeM] = closeTimeStr.split(":").map(Number);

    const dayStart = new Date(targetDate);
    dayStart.setHours(openH, openM, 0, 0);

    const dayEnd = new Date(targetDate);
    dayEnd.setHours(closeH, closeM, 0, 0);

    const inicioDia = new Date(targetDate);
    inicioDia.setHours(0, 0, 0, 0);
    const finDia = new Date(targetDate);
    finDia.setHours(23, 59, 59, 999);

    const citasExistentes = await prisma.appointment.findMany({
      where: {
        status: { not: "CANCELED" },
        startTime: { gte: inicioDia, lte: finDia },
      },
    });

    const bloqueos = await prisma.timeBlock.findMany({
      where: {
        OR: [
          { startTime: { gte: inicioDia, lte: finDia } },
          { isRecurring: true },
          { isFullDay: true },
        ],
      },
    });

    const tieneDiaCompletoBloqueado = bloqueos.some((b) => {
      if (b.isFullDay) {
        const blockDate = new Date(b.startTime).toISOString().split("T")[0];
        return blockDate === dateStr;
      }
      return false;
    });

    if (tieneDiaCompletoBloqueado) {
      return res.json({
        slots: [],
        isOpen: false,
        mensaje: "Fecha bloqueada por la administración.",
      });
    }

    const duration = Number(duracionTotalMin) || 60;
    const slots = [];
    const stepMin = 30;
    let current = new Date(dayStart);
    const ahora = new Date();

    while (current.getTime() + duration * 60000 <= dayEnd.getTime()) {
      const slotStart = new Date(current);
      const slotEnd = new Date(current.getTime() + duration * 60000);

      // Ocultar slots que falten menos de 60 minutos o ya transcurrieron
      const minutosFaltantes =
        (slotStart.getTime() - ahora.getTime()) / (1000 * 60);

      if (minutosFaltantes >= 60) {
        const colisionCita = citasExistentes.some((c) => {
          const cStart = new Date(c.startTime).getTime();
          const cEnd = new Date(c.endTime).getTime();
          return slotStart.getTime() < cEnd && slotEnd.getTime() > cStart;
        });

        const colisionBloqueo = bloqueos.some((b) => {
          if (b.isFullDay) return true;
          const bStart = new Date(b.startTime);
          const bEnd = new Date(b.endTime);

          if (b.isRecurring) {
            const recStart = new Date(slotStart);
            recStart.setHours(bStart.getHours(), bStart.getMinutes(), 0, 0);

            const recEnd = new Date(slotStart);
            recEnd.setHours(bEnd.getHours(), bEnd.getMinutes(), 0, 0);

            return (
              slotStart.getTime() < recEnd.getTime() &&
              slotEnd.getTime() > recStart.getTime()
            );
          }

          return (
            slotStart.getTime() < bEnd.getTime() &&
            slotEnd.getTime() > bStart.getTime()
          );
        });

        if (!colisionCita && !colisionBloqueo) {
          slots.push(
            slotStart.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          );
        }
      }

      current = new Date(current.getTime() + stepMin * 60000);
    }

    res.json({ slots, isOpen: true });
  } catch (error) {
    console.error("Error al calcular disponibilidad:", error);
    res
      .status(500)
      .json({ error: "Error interno al calcular disponibilidad." });
  }
});

// 4. ACTUALIZAR ESTADO DE CITA (ADMIN)
router.patch("/:id/estado", autenticarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const cita = await prisma.appointment.findUnique({ where: { id } });
    if (!cita) return res.status(404).json({ error: "Cita no encontrada." });

    const citaActualizada = await prisma.appointment.update({
      where: { id },
      data: { status },
      include: { customer: true, service: true },
    });

    res.json({
      mensaje: `Cita actualizada a ${status}`,
      cita: citaActualizada,
    });
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar estado de la cita." });
  }
});

// 5. OBTENER MIS CITAS (CLIENTA LOGUEADA)
router.get("/mis-citas", autenticarToken, async (req, res) => {
  try {
    await procesarReglasAutomatedCitas();

    const targetCustomerId =
      req.usuario?.id || req.usuario?.idCliente || req.user?.id;

    if (!targetCustomerId) {
      return res
        .status(401)
        .json({ error: "Usuario no autenticado correctamente." });
    }

    const citas = await prisma.appointment.findMany({
      where: { customerId: targetCustomerId },
      include: { service: true, customer: true },
      orderBy: { startTime: "asc" },
    });

    res.json(citas);
  } catch (error) {
    console.error("Error al obtener mis citas:", error);
    res.status(500).json({ error: "Error al consultar citas del cliente." });
  }
});

// 6. CONFIRMAR ASISTENCIA POR CLIENTA
router.patch("/:id/confirmar-clienta", autenticarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const cita = await prisma.appointment.findUnique({ where: { id } });

    if (!cita) return res.status(404).json({ error: "Cita no encontrada." });

    if (!cita.advancePaid) {
      return res.status(400).json({
        error: "Se requiere la validación del anticipo para confirmar tu cita.",
      });
    }

    const citaActualizada = await prisma.appointment.update({
      where: { id },
      data: { status: "CONFIRMED" },
    });

    res.json({
      mensaje: "Asistencia confirmada con éxito",
      cita: citaActualizada,
    });
  } catch (error) {
    res.status(500).json({ error: "Error al confirmar asistencia." });
  }
});

// 7. REAGENDAR CITA (CLIENTA AUTENTICADA / ADMIN)
router.patch("/:id/reagendar", autenticarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { newStartTime } = req.body;

    if (!newStartTime) {
      return res
        .status(400)
        .json({ error: "La nueva fecha y hora son requeridas." });
    }

    const cita = await prisma.appointment.findUnique({
      where: { id },
      include: { service: true },
    });

    if (!cita) {
      return res.status(404).json({ error: "Cita no encontrada." });
    }

    if (cita.hasRescheduled) {
      return res.status(400).json({
        error: "Esta cita ya utilizó su único cambio de fecha permitido.",
      });
    }

    const inicio = new Date(newStartTime);
    const fin = new Date(
      inicio.getTime() + (cita.service?.durationMin || 60) * 60000,
    );

    const citaActualizada = await prisma.appointment.update({
      where: { id },
      data: {
        startTime: inicio,
        endTime: fin,
        hasRescheduled: true,
        advancePaid: true,
      },
      include: {
        service: true,
        customer: true,
      },
    });

    res.json({ mensaje: "Cita reagendada con éxito.", cita: citaActualizada });
  } catch (error) {
    console.error("Error al reagendar cita:", error);
    res.status(500).json({ error: "Error interno al reagendar la cita." });
  }
});

// 8. VALIDAR / MARCAR ANTICIPO RECIBIDO (ADMIN)
router.patch("/:id/anticipo", autenticarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { advancePaid } = req.body;

    const cita = await prisma.appointment.findUnique({ where: { id } });
    if (!cita) {
      return res.status(404).json({ error: "Cita no encontrada." });
    }

    const isPaid = Boolean(advancePaid);

    const citaActualizada = await prisma.appointment.update({
      where: { id },
      data: {
        advancePaid: isPaid,
        status: isPaid ? "CONFIRMED" : "PENDING",
      },
      include: {
        customer: true,
        service: true,
      },
    });

    res.json({
      mensaje: isPaid
        ? "Anticipo validado y cita confirmada con éxito."
        : "Estatus de anticipo actualizado.",
      cita: citaActualizada,
    });
  } catch (error) {
    console.error("Error actualizando anticipo:", error);
    res.status(500).json({ error: "Error interno al actualizar el anticipo." });
  }
});

export default router;
