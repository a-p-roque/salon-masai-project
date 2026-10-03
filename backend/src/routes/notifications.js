import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { getVapidPublicKey } from "../services/pushService.js";

const router = Router();

// 1. Obtener la clave pública VAPID para que el cliente (React/Vite) se suscriba
router.get("/vapid-key", (req, res) => {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return res
      .status(500)
      .json({ error: "VAPID_PUBLIC_KEY no configurada en el servidor." });
  }
  res.json({ publicKey });
});

// 2. Registrar o actualizar la suscripción Push del navegador/dispositivo
router.post("/subscribe", async (req, res) => {
  try {
    const { subscription, customerId, userId } = req.body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: "Suscripción push no válida." });
    }

    const { endpoint, keys } = subscription;

    const pushSub = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        customerId: customerId || null,
        userId: userId || null,
      },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        customerId: customerId || null,
        userId: userId || null,
      },
    });

    res
      .status(201)
      .json({ mensaje: "Suscripción registrada correctamente", pushSub });
  } catch (error) {
    console.error("Error al guardar suscripción push:", error);
    res
      .status(500)
      .json({ error: "Error interno al registrar la suscripción." });
  }
});

export default router;
