import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { autenticarToken } from "../middlewares/auth.js";
import rateLimit from "express-rate-limit";
import { procesarReglasAutomatedCitas } from "../services/appointmentAutomation.js";
import {
  sendPushToCustomer,
  sendPushToAdmins,
} from "../services/pushService.js";

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

    // 🔔 1. Notificación a la clienta
    if (finalCustomerId) {
      sendPushToCustomer(finalCustomerId, {
        title: "¡Reserva Registrada! 🌸",
        body: `Tu cita para "${servicio.title}" quedó agendada. Por favor envía tu anticipo para confirmarla.`,
        url: "/perfil",
      });
    }

    // 🔔 2. Notificación a las Administradas
    sendPushToAdmins({
      title: "¡Nueva Cita Registrada! 👑",
      body: `${nuevaCita.customer?.name || customerName} agendó "${servicio.title}" para el ${fechaInicioCita.toLocaleDateString("es-ES", { day: "numeric", month: "short" })}.`,
      url: "/admin",
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

    const dateStr = fecha.split("T")[0];
    const [year, month, day] = dateStr.split("-").map(Number);
    const targetDate = new Date(year, month - 1, day, 0, 0, 0, 0);
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
    const cita = await prisma.appointment.findUnique({
      where: { id },
      include: { customer: true, service: true },
    });

    if (!cita) return res.status(404).json({ error: "Cita no encontrada." });

    if (!cita.advancePaid) {
      return res.status(400).json({
        error: "Se requiere la validación del anticipo para confirmar tu cita.",
      });
    }

    const citaActualizada = await prisma.appointment.update({
      where: { id },
      data: { status: "CONFIRMED" },
      include: { customer: true, service: true },
    });

    // 🔔 Notificar a la Administración que la clienta confirmó asistencia
    sendPushToAdmins({
      title: "¡Asistencia Confirmada! ✨",
      body: `La clienta ${citaActualizada.customer?.name || "registrada"} confirmó su asistencia para "${citaActualizada.service?.title || "servicio"}".`,
      url: "/admin",
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
      include: { service: true, customer: true },
    });

    if (!cita) {
      return res.status(404).json({ error: "Cita no encontrada." });
    }

    if (cita.hasRescheduled) {
      return res.status(400).json({
        error: "Esta cita ya utilizó su único cambio de fecha permitido.",
      });
    }

    // Validar regla de cliente frecuente o anticipo validado
    const esClienteFrecuente = Boolean(cita.customer?.isFrequent);
    const estaValidado =
      Boolean(cita.advancePaid) || cita.status === "CONFIRMED";

    if (!esClienteFrecuente && !estaValidado) {
      return res.status(400).json({
        error:
          "Para reagendar requieres tener el anticipo validado o ser clienta VIP frecuente.",
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
      },
      include: {
        service: true,
        customer: true,
      },
    });

    // 🔔 1. Notificar a la clienta
    if (citaActualizada.customerId) {
      sendPushToCustomer(citaActualizada.customerId, {
        title: "¡Cita Reagendada! 🗓️",
        body: `Tu cita para "${citaActualizada.service?.title || "tu ritual"}" fue movida con éxito.`,
        url: "/perfil",
      });
    }

    // 🔔 2. Notificar a las administradoras
    sendPushToAdmins({
      title: "Cita Reagendada 🗓️",
      body: `${citaActualizada.customer?.name || "Una clienta"} reagendó su cita de "${citaActualizada.service?.title}" para el ${inicio.toLocaleDateString("es-ES", { day: "numeric", month: "short" })}.`,
      url: "/admin",
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

    // 🔔 Notificar a la clienta cuando se valida su anticipo
    if (citaActualizada.customerId && isPaid) {
      sendPushToCustomer(citaActualizada.customerId, {
        title: "¡Anticipo Confirmado! ✨",
        body: `Tu lugar para "${citaActualizada.service?.title || "tu ritual"}" ya está garantizado. ¡Nos vemos pronto!`,
        url: "/perfil",
      });
    }

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

// 9. CANCELAR CITA POR CLIENTA
router.patch("/:id/cancelar", autenticarToken, async (req, res) => {
  try {
    const { id } = req.params;

    const cita = await prisma.appointment.findUnique({
      where: { id },
      include: { customer: true, service: true },
    });

    if (!cita) {
      return res.status(404).json({ error: "Cita no encontrada." });
    }

    const citaCancelada = await prisma.appointment.update({
      where: { id },
      data: { status: "CANCELED" },
    });

    // 🔔 Notificar a la administración
    sendPushToAdmins({
      title: "⚠️ Cita Cancelada",
      body: `${cita.customer?.name || "Una clienta"} canceló su cita para "${cita.service?.title || "el servicio"}".`,
      url: "/admin",
    });

    res.json({ mensaje: "Cita cancelada con éxito.", cita: citaCancelada });
  } catch (error) {
    console.error("Error al cancelar cita:", error);
    res.status(500).json({ error: "Error interno al cancelar la cita." });
  }
});

export default router;
