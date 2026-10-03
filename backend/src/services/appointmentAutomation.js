import { prisma } from "../lib/prisma.js";

export async function procesarReglasAutomatedCitas() {
  const ahora = new Date();

  try {
    // Buscar citas activas (PENDING o CONFIRMED)
    const citasActivas = await prisma.appointment.findMany({
      where: {
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      include: {
        customer: true,
        service: true,
      },
    });

    for (const cita of citasActivas) {
      const fechaInicio = new Date(cita.startTime);
      const fechaFin = new Date(cita.endTime || cita.startTime);
      const fechaCreacion = new Date(cita.createdAt);

      // Horas faltantes para la cita
      const horasFaltantes =
        (fechaInicio.getTime() - ahora.getTime()) / (1000 * 60 * 60);

      // Minutos transcurridos desde que se agendó la cita
      const minutosTranscurridosDesdeCreacion =
        (ahora.getTime() - fechaCreacion.getTime()) / (1000 * 60);

      const tieneAnticipo = Boolean(cita.advancePaid);

      // 1. CIERRE AUTOMÁTICO A "COMPLETED"
      if (cita.status === "CONFIRMED" && ahora >= fechaFin) {
        await prisma.appointment.update({
          where: { id: cita.id },
          data: { status: "COMPLETED" },
        });

        if (cita.customerId && cita.serviceId) {
          await prisma.serviceFrecuencies.upsert({
            where: {
              customerId_serviceId: {
                customerId: cita.customerId,
                serviceId: cita.serviceId,
              },
            },
            update: { count: { increment: 1 } },
            create: {
              customerId: cita.customerId,
              serviceId: cita.serviceId,
              count: 1,
            },
          });

          // Puntos Masai (1 punto por cada $20 MXN)
          const puntosSumar = Math.floor(Number(cita.service.price) / 20);
          if (puntosSumar > 0) {
            await prisma.customer.update({
              where: { id: cita.customerId },
              data: { points: { increment: puntosSumar } },
            });
          }
        }
        continue;
      }

      // 2. CANCELACIÓN POR FALTA DE ANTICIPO (REGLA UNIFICADA)
      if (cita.status === "PENDING" && !tieneAnticipo) {
        // CASO A: Cita agendada con tiempo suficiente (> 3h antes), pero ya faltan menos de 3h para la cita
        const esCitaConMargenAmplio =
          (fechaInicio.getTime() - fechaCreacion.getTime()) /
            (1000 * 60 * 60) >=
          3;

        if (esCitaConMargenAmplio && horasFaltantes < 3) {
          await prisma.appointment.update({
            where: { id: cita.id },
            data: { status: "CANCELED", advanceRetained: false },
          });
        }
        // CASO B: Cita exprés (< 3h antes), pasaron más de 30 minutos sin validar anticipo
        else if (
          !esCitaConMargenAmplio &&
          minutosTranscurridosDesdeCreacion > 30
        ) {
          await prisma.appointment.update({
            where: { id: cita.id },
            data: { status: "CANCELED", advanceRetained: false },
          });
        }
      }
    }
  } catch (error) {
    console.error("Error al ejecutar automatización de citas:", error);
  }
}
