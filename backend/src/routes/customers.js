import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { autenticarToken } from "../middlewares/auth.js";
import { uploadAvatar } from "../middlewares/upload.js";

const router = Router();

// BUSCAR O CREAR CLIENTE PÚBLICO (PARA CHECKOUT DE INVITADAS)
router.post("/publico/identificar", async (req, res) => {
  try {
    const { name, phone } = req.body;
    const cleanPhone = phone.replace(/\D/g, "");

    if (!cleanPhone || cleanPhone.length !== 10) {
      return res
        .status(400)
        .json({ error: "Teléfono de 10 dígitos requerido" });
    }

    // Buscar si ya existe la clienta
    let cliente = await prisma.customer.findFirst({
      where: { phone: cleanPhone },
    });

    // Si no existe, crear el registro de cliente
    if (!cliente) {
      cliente = await prisma.customer.create({
        data: {
          name: name || "Clienta Invitada",
          phone: cleanPhone,
        },
      });
    }

    res.json(cliente);
  } catch (error) {
    console.error("Error al identificar cliente:", error);
    res
      .status(500)
      .json({ error: "Error interno al procesar datos del cliente" });
  }
});

// VERIFICAR CLIENTE POR TELÉFONO (PÚBLICO PARA CHECKOUT)
router.get("/verificar", async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) {
      return res.status(400).json({ error: "El teléfono es requerido." });
    }

    const cleanPhone = phone.replace(/\D/g, "");
    const cliente = await prisma.customer.findFirst({
      where: { phone: cleanPhone },
    });

    res.json({ cliente: cliente || null });
  } catch (error) {
    console.error("Error verificando cliente:", error);
    res.status(500).json({ error: "Error al verificar cliente." });
  }
});

// LISTAR TODAS LAS CLIENTAS CON HISTORIAL (ADMIN)
router.get("/", autenticarToken, async (req, res) => {
  try {
    const clientes = await prisma.customer.findMany({
      include: {
        appointments: {
          include: {
            service: true,
          },
          orderBy: {
            startTime: "desc",
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    res.json(clientes);
  } catch (error) {
    console.error("Error al obtener directorio de clientes:", error);
    res
      .status(500)
      .json({ error: "Error al consultar el directorio de clientes." });
  }
});

// OBTENER CLIENTA ESPECÍFICA POR ID
router.get("/:id", async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        appointments: {
          include: {
            service: true,
          },
          orderBy: {
            startTime: "desc",
          },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ error: "Clienta no encontrada." });
    }

    res.json(customer);
  } catch (error) {
    console.error("Error al obtener cliente:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

// ACTUALIZAR ESTADO FRECUENTE / NOTAS MÉDICAS / PERFIL (ADMIN / CLIENTA)
router.patch("/:id/perfil", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, medicalNotes, isFrequent, avatarUrl } = req.body;

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: {
        name,
        medicalNotes,
        isFrequent: isFrequent !== undefined ? isFrequent : undefined,
        imageUrl: avatarUrl,
      },
    });

    res.json(updatedCustomer);
  } catch (error) {
    console.error("Error al actualizar perfil de cliente:", error);
    res
      .status(500)
      .json({ error: "Error al actualizar información del cliente." });
  }
});

// RUTA PARA SUBIR ARCHIVO FÍSICO DE FOTO DE PERFIL
router.post("/:id/avatar", uploadAvatar.single("photo"), async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: "No se subió ningún archivo." });
    }

    // Ruta relativa dinámica accesible vía express.static('/uploads')
    const relativeUrl = `/uploads/avatars/${req.file.filename}`;

    let clienteActualizado;

    try {
      clienteActualizado = await prisma.customer.update({
        where: { id },
        data: { imageUrl: relativeUrl },
      });
    } catch (e) {
      const cliente = await prisma.customer.findFirst({ where: { id } });

      if (!cliente) {
        return res.status(404).json({ error: "Clienta no encontrada." });
      }

      clienteActualizado = await prisma.customer.update({
        where: { id: cliente.id },
        data: { imageUrl: relativeUrl },
      });
    }

    res.json({
      mensaje: "Foto de perfil actualizada con éxito",
      avatarUrl: clienteActualizado.imageUrl,
      imageUrl: clienteActualizado.imageUrl,
      customer: clienteActualizado,
    });
  } catch (error) {
    console.error("Error al subir foto de avatar:", error);
    res
      .status(500)
      .json({ error: "Error al guardar la imagen en el servidor." });
  }
});

export default router;
