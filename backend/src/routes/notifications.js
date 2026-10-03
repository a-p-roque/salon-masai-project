import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { getVapidPublicKey } from "../services/pushService.js";
import { autenticarToken } from "../middlewares/auth.js";

const router = Router();

router.get("/vapid-key", (req, res) => {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return res.status(500).json({ error: "VAPID_PUBLIC_KEY no configurada." });
  }
  res.json({ publicKey });
});

router.post("/subscribe", autenticarToken, async (req, res) => {
  try {
    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: "Suscripción push no válida." });
    }

    const { endpoint, keys } = subscription;
    const usuarioId = req.usuario?.id || req.user?.id;
    const rolUsuario = req.usuario?.role || req.user?.role;

    // Determinar si es Admin (User) o Clienta (Customer)
    const isतुAdmin = rolUsuario === 'ADMIN' || rolUsuario === 'DEV';
    
    let customerId = null;
    let userId = null;

    if (isतुAdmin) {
      userId = usuarioId;
    } else {
      customerId = usuarioId;
    }

    const pushSub = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        customerId: customerId,
        userId: userId,
      },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        customerId: customerId,
        userId: userId,
      },
    });

    res.status(201).json({ mensaje: "Suscripción registrada correctamente", pushSub });
  } catch (error) {
    console.error("Error al guardar suscripción push:", error);
    res.status(500).json({ error: "Error interno al registrar la suscripción." });
  }
});

export default router;