import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

const router = Router();

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email y contraseña son requeridos" });
    }

    const usuario = await prisma.user.findUnique({ where: { email } });
    if (!usuario) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const passwordValido = await bcrypt.compare(password, usuario.passwordHash);
    if (!passwordValido) {
      return res.status(401).json({ error: "Credenciales inválides" });
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, role: usuario.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    );

    res.json({
      mensaje: "Autenticación exitosa",
      token,
      usuario: {
        id: cliente.id,
        nombre: cliente.name,
        telefono: cliente.phone,
        isFrequent: cliente.isFrequent,
        points: cliente.loyalityPoints,
        imageUrl: cliente.imageUrl,
      },
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
