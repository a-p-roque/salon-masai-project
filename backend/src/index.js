import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import cron from "node-cron";
import { procesarReglasAutomatedCitas } from "./services/appointmentAutomation.js";
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from "./routes/auth.js";
import authCustomerRoutes from "./routes/authCustomer.js";
import serviceRoutes from "./routes/services.js";
import customerRoutes from "./routes/customers.js";
import appointmentRoutes from "./routes/appointments.js";
import timeBlocksRoutes from "./routes/timeBlocks.js";
import businessHoursRoutes from "./routes/businessHours.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

cron.schedule("*/15 * * * *", async () => {
  console.log("⏰ [CRON] Ejecutando automatización barredora de citas...");
  await procesarReglasAutomatedCitas();
});

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/auth/clienta", authCustomerRoutes);
app.use("/api/servicios", serviceRoutes);
app.use("/api/clientes", customerRoutes);
app.use("/api/citas", appointmentRoutes);
app.use("/api/bloqueos", timeBlocksRoutes);
app.use("/api/horarios-negocio", businessHoursRoutes);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get("/api/health", (req, res) => {
  res.send("API activa y funcionando");
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
