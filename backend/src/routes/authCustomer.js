import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "secreto_super_seguro_salon_masai";

// REGISTRO O CONFIGURACIÓN DE PIN PARA CLIENTA
router.post("/register", async (req, res) => {
  try {
    const { name, phone, pin } = req.body;

    if (!name || !phone || !pin) {
      return res
        .status(400)
        .json({ error: "Nombre, teléfono y PIN son requeridos." });
    }

    if (pin.length < 4 || pin.length > 6) {
      return res
        .status(400)
        .json({ error: "El PIN debe tener entre 4 y 6 dígitos." });
    }

    // Limpiar teléfono de espacios y guiones
    const cleanPhone = phone.replace(/\D/g, "");

    const existingCustomer = await prisma.customer.findUnique({
      where: { phone: cleanPhone },
    });

    const pinHash = await bcrypt.hash(pin, 10);

    let customer;
    if (existingCustomer) {
      // Si ya existía como invitada, le asignamos el PIN
      customer = await prisma.customer.update({
        where: { id: existingCustomer.id },
        data: { name, pinHash },
      });
    } else {
      // Si es completamente nueva
      customer = await prisma.customer.create({
        data: {
          name,
          phone: cleanPhone,
          pinHash,
        },
      });
    }

    const token = jwt.sign(
      { id: customer.id, role: "CUSTOMER", phone: customer.phone },
      JWT_SECRET,
      { expiresIn: "30d" },
    );

    res.status(201).json({
      token,
      usuario: {
        id: customer.id,
        nombre: customer.name,
        telefono: customer.phone,
        loyaltyPoints: customer.loyaltyPoints,
        rol: "CUSTOMER",
      },
    });
  } catch (error) {
    console.error("Error en registro de clienta:", error);
    res.status(500).json({ error: "Error interno al registrar cuenta." });
  }
});

// INICIO DE SESIÓN CON PIN
router.post("/login", async (req, res) => {
  try {
    const { phone, pin } = req.body;

    if (!phone || !pin) {
      return res.status(400).json({ error: "Teléfono y PIN son requeridos." });
    }

    const cleanPhone = phone.replace(/\D/g, "");

    const customer = await prisma.customer.findUnique({
      where: { phone: cleanPhone },
    });

    if (!customer || !customer.pinHash) {
      return res
        .status(401)
        .json({ error: "Número no registrado o sin PIN asignado." });
    }

    const isMatch = await bcrypt.compare(pin, customer.pinHash);
    if (!isMatch) {
      return res
        .status(401)
        .json({ error: "PIN incorrecto. Revisa e intenta de nuevo." });
    }

    const token = jwt.sign(
      { id: customer.id, role: "CUSTOMER", phone: customer.phone },
      JWT_SECRET,
      { expiresIn: "30d" },
    );

    res.json({
      token,
      usuario: {
        id: customer.id,
        nombre: customer.name,
        telefono: customer.phone,
        isFrequent: customer.isFrequent,
        points: customer.loyaltyPoints,
        imageUrl: customer.imageUrl,
        rol: "CUSTOMER",
      },
    });
  } catch (error) {
    console.error("Error en login de clienta:", error);
    res.status(500).json({ error: "Error interno al iniciar sesión." });
  }
});

export default router;
