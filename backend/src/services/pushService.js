import webpush from "web-push";
import { prisma } from "../lib/prisma.js";

// Configurar credenciales VAPID
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:contacto@salonmasai.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
);

export const sendPushToCustomer = async (customerId, payload) => {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { customerId },
    });

    if (subscriptions.length === 0) {
      console.log(
        `ℹ️ No hay dispositivos registrados para la clienta: ${customerId}`,
      );
      return;
    }

    const pushPayload = JSON.stringify({
      title: payload.title || "Salón Masai ✨",
      body: payload.body || "Tienes una nueva actualización en tu cita.",
      url: payload.url || "/perfil",
    });

    const sendPromises = subscriptions.map(async (sub) => {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushConfig, pushPayload);
      } catch (error) {
        // Si el token expiró o la usuaria bloqueó los permisos, eliminar la suscripción caducada
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`⚠️ Eliminando suscripción push caducada: ${sub.id}`);
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        } else {
          console.error(`Error enviando push a suscripción ${sub.id}:`, error);
        }
      }
    });

    await Promise.all(sendPromises);
  } catch (error) {
    console.error("Error general en sendPushToCustomer:", error);
  }
};

export const sendPushToAdmins = async (payload) => {
  try {
    // Buscar todas las suscripciones asociadas a usuarios con rol ADMIN o DEV
    const adminSubscriptions = await prisma.pushSubscription.findMany({
      where: {
        user: {
          role: { in: ["ADMIN", "DEV"] },
        },
      },
    });

    if (adminSubscriptions.length === 0) {
      console.log("ℹ️ No hay dispositivos de administradoras registrados.");
      return;
    }

    const pushPayload = JSON.stringify({
      title: payload.title || "Panel Admin Masai 👑",
      body: payload.body || "Nueva actualización en la agenda.",
      url: payload.url || "/admin",
    });

    const sendPromises = adminSubscriptions.map(async (sub) => {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };

      try {
        await webpush.sendNotification(pushConfig, pushPayload);
      } catch (error) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        }
      }
    });

    await Promise.all(sendPromises);
  } catch (error) {
    console.error("Error enviando push a administradoras:", error);
  }
};

export const getVapidPublicKey = () => process.env.VAPID_PUBLIC_KEY;
