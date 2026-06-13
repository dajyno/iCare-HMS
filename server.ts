import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import * as authService from "./src/services/authService";
import * as patientService from "./src/services/patientService";
import * as appointmentService from "./src/services/appointmentService";
import { prisma } from "./src/lib/prisma";

dotenv.config();

// Middleware to protect routes
const authenticate = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];
  const payload = await authService.verifyToken(token);

  if (!payload) {
    return res.status(401).json({ error: "Invalid token" });
  }

  req.user = payload;
  next();
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing Supabase admin credentials (VITE_SUPABASE_URL / SUPABASE_SERVICE_KEY)");
  }
  const supabaseAdmin = createClient(supabaseUrl!, serviceRoleKey!);

  // ── Supabase Admin Proxy (authenticated, no role gating) ──

  app.post("/api/supabase-proxy", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
      if (authError || !user) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      const { type } = req.body;

      if (type === "table") {
        const { table, action, columns, payload, upsertOptions, filters, orders, limit, single, returning, selectOptions } = req.body;

        let query: any;

        switch (action) {
          case "select":
            query = supabaseAdmin.from(table).select(columns || "*", selectOptions);
            break;
          case "insert":
            query = supabaseAdmin.from(table).insert(payload, upsertOptions);
            if (returning) query = query.select(columns || "*");
            break;
          case "update":
            query = supabaseAdmin.from(table).update(payload);
            break;
          case "delete":
            query = supabaseAdmin.from(table).delete();
            break;
          case "upsert":
            query = supabaseAdmin.from(table).upsert(payload, upsertOptions);
            if (returning) query = query.select(columns || "*");
            break;
          default:
            return res.status(400).json({ error: `Unknown action: ${action}` });
        }

        if (filters && Array.isArray(filters)) {
          for (const f of filters) {
            const [op, col, val, ...rest] = f;
            switch (op) {
              case "eq": query = query.eq(col, val); break;
              case "neq": query = query.neq(col, val); break;
              case "gt": query = query.gt(col, val); break;
              case "gte": query = query.gte(col, val); break;
              case "lt": query = query.lt(col, val); break;
              case "lte": query = query.lte(col, val); break;
              case "is": query = query.is(col, val); break;
              case "in": query = query.in(col, val); break;
              case "like": query = query.like(col, val); break;
              case "ilike": query = query.ilike(col, val); break;
              case "contains": query = query.contains(col, val); break;
              case "containedBy": query = query.containedBy(col, val); break;
              case "overlaps": query = query.overlaps(col, val); break;
              case "textSearch": query = query.textSearch(col, val, rest[0]); break;
              case "not": query = query.not(col, val, rest[0]); break;
              case "or": query = query.or(val); break;
              case "filter": query = query.filter(col, val, rest[0]); break;
            }
          }
        }

        if (orders && Array.isArray(orders)) {
          for (const o of orders) {
            query = query.order(o.column, { ascending: o.ascending, nullsFirst: o.nullsFirst, foreignTable: o.foreignTable });
          }
        }

        if (limit !== undefined && limit !== null) {
          query = query.limit(limit);
        }

        let result;
        if (single === "single") {
          result = await query.single();
        } else if (single === "maybeSingle") {
          result = await query.maybeSingle();
        } else {
          result = await query;
        }

        return res.json({ data: result.data, error: result.error, count: result.count });
      }

      if (type === "auth") {
        const { action: authAction, args } = req.body;
        let result;

        switch (authAction) {
          case "listUsers":
            result = await supabaseAdmin.auth.admin.listUsers();
            break;
          case "createUser":
            result = await supabaseAdmin.auth.admin.createUser(args);
            break;
          case "updateUserById":
            result = await supabaseAdmin.auth.admin.updateUserById(args.id, args.updates);
            break;
          default:
            return res.status(400).json({ error: `Unknown auth action: ${authAction}` });
        }

        return res.json(result);
      }

      if (type === "rpc") {
        const { name, args } = req.body;
        const result = await supabaseAdmin.rpc(name, args);
        return res.json({ data: result.data, error: result.error });
      }

      return res.status(400).json({ error: `Unknown request type: ${type}` });
    } catch (err: any) {
      console.error("Supabase proxy error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // API Routes
  app.get("/api/health", async (req, res) => {
    try {
      const counts = {
        users: await prisma.user.count(),
        patients: await prisma.patient.count(),
        appointments: await prisma.appointment.count(),
        departments: await prisma.department.count(),
      };
      res.json({ status: "ok", timestamp: new Date().toISOString(), counts });
    } catch (error: any) {
      res.status(500).json({ status: "error", error: error.message });
    }
  });

  // Auth Routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/auth/me", authenticate, async (req: any, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { department: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  // Patient Routes
  app.get("/api/patients", authenticate, async (req, res) => {
    try {
      const patients = await patientService.getAllPatients();
      res.json(patients);
    } catch (error: any) {
      console.error("GET /api/patients error:", error);
      res.status(500).json({ error: "Failed to fetch patients" });
    }
  });

  app.post("/api/patients", authenticate, async (req, res) => {
    try {
      const patient = await patientService.createPatient(req.body);
      res.json(patient);
    } catch (error: any) {
      console.error("POST /api/patients error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/patients/:id", authenticate, async (req, res) => {
    try {
      const patient = await patientService.getPatientById(req.params.id);
      if (!patient) return res.status(404).json({ error: "Patient not found" });
      res.json(patient);
    } catch (error: any) {
      console.error("GET /api/patients/:id error:", error);
      res.status(500).json({ error: "Failed to fetch patient" });
    }
  });

  // Appointment Routes
  app.get("/api/appointments", authenticate, async (req, res) => {
    try {
      const filters: any = {};
      if (req.query.doctorId) filters.doctorId = req.query.doctorId as string;
      if (req.query.patientId) filters.patientId = req.query.patientId as string;
      if (req.query.status) filters.status = req.query.status as string;

      const appointments = await appointmentService.getAppointments(filters);
      res.json(appointments);
    } catch (error: any) {
      console.error("GET /api/appointments error:", error);
      res.status(500).json({ error: "Failed to fetch appointments" });
    }
  });

  app.post("/api/appointments", authenticate, async (req, res) => {
    try {
      const appointment = await appointmentService.createAppointment(req.body);
      res.json(appointment);
    } catch (error: any) {
      console.error("POST /api/appointments error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/reports/dashboard", authenticate, async (req, res) => {
    try {
      console.log("Fetching dashboard stats...");
      const [patientCount, appointmentCount, pendingLabs, revenueToday] = await Promise.all([
        prisma.patient.count().catch(err => { console.error("Patient count error:", err); throw err; }),
        prisma.appointment.count({
          where: {
            date: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lt: new Date(new Date().setHours(23, 59, 59, 999)),
            },
          },
        }).catch(err => { console.error("Appointment count error:", err); throw err; }),
        prisma.labRequest.count({
          where: { status: { not: "Completed" } },
        }).catch(err => { console.error("Lab count error:", err); throw err; }),
        prisma.payment.aggregate({
          where: {
            date: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lt: new Date(new Date().setHours(23, 59, 59, 999)),
            },
          },
          _sum: { amount: true },
        }).catch(err => { console.error("Revenue aggregate error:", err); throw err; }),
      ]);

      res.json({
        totalPatients: patientCount,
        appointmentsToday: appointmentCount,
        pendingLabs: pendingLabs,
        revenueToday: revenueToday._sum.amount || 0,
      });
    } catch (error: any) {
      console.error("GET /api/reports/dashboard CRITICAL ERROR:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Consultation Routes
  app.post("/api/consultations", authenticate, async (req: any, res) => {
    try {
      const { patientId, chiefComplaint, symptoms, diagnosis, clinicalNotes, treatmentPlan, vitalSigns, prescriptions, labRequests, appointmentId } = req.body;
      
      const result = await prisma.$transaction(async (tx) => {
        const consultation = await tx.consultation.create({
          data: {
            patientId,
            doctorId: req.user.userId,
            appointmentId,
            chiefComplaint,
            symptoms,
            diagnosis,
            clinicalNotes,
            treatmentPlan,
            vitalSigns: vitalSigns ? { create: vitalSigns } : undefined,
          }
        });

        if (prescriptions && prescriptions.length > 0) {
          await tx.prescription.create({
            data: {
              patientId,
              doctorId: req.user.userId,
              consultationId: consultation.id,
              items: {
                create: prescriptions.map((p: any) => ({
                  medicationId: p.medicationId,
                  dosage: p.dosage,
                  frequency: p.frequency,
                  duration: p.duration,
                  instructions: p.instructions,
                }))
              }
            }
          });
        }

        if (labRequests && labRequests.length > 0) {
          for (const lr of labRequests) {
            await tx.labRequest.create({
              data: {
                patientId,
                testId: lr.testId,
                consultationId: consultation.id,
                status: "Requested",
              }
            });
          }
        }

        if (appointmentId) {
          await tx.appointment.update({
            where: { id: appointmentId },
            data: { status: "Completed" }
          });
        }

        return consultation;
      });

      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/lab/tests", authenticate, async (req, res) => {
    const tests = await prisma.labTest.findMany({ where: { status: "active" } });
    res.json(tests);
  });

  // Lab Routes
  app.get("/api/lab/requests", authenticate, async (req, res) => {
    const requests = await prisma.labRequest.findMany({
      include: { patient: true, test: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(requests);
  });

  app.post("/api/lab/results", authenticate, async (req: any, res) => {
    try {
      const { requestId, patientId, resultValue, unit, referenceRange, interpretation } = req.body;
      const result = await prisma.$transaction(async (tx) => {
        const labResult = await tx.labResult.create({
          data: {
            requestId,
            patientId,
            resultValue,
            unit,
            referenceRange,
            interpretation,
            technicianId: req.user.userId,
          }
        });
        await tx.labRequest.update({
          where: { id: requestId },
          data: { status: "Completed" }
        });
        return labResult;
      });
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Pharmacy Routes
  app.get("/api/pharmacy/prescriptions", authenticate, async (req, res) => {
    const prescriptions = await prisma.prescription.findMany({
      include: { patient: true, doctor: true, items: { include: { medication: true } } },
      orderBy: { date: "desc" },
    });
    res.json(prescriptions);
  });

  app.post("/api/pharmacy/prescriptions", authenticate, async (req, res) => {
    try {
      const { patientId, doctorId, items } = req.body;
      if (!patientId) return res.status(400).json({ error: "patientId is required" });
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "At least one medication item is required" });
      }
      const prescription = await prisma.prescription.create({
        data: {
          patientId,
          doctorId: doctorId || req.user?.id,
          status: "Pending",
          items: {
            create: items.map((item: any) => ({
              medicationId: item.medicationId,
              dosage: item.dosage,
              frequency: item.frequency,
              duration: item.duration,
              instructions: item.route,
            })),
          },
        },
        include: { patient: true, doctor: true, items: { include: { medication: true } } },
      });
      res.json(prescription);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/pharmacy/dispense", authenticate, async (req, res) => {
    try {
      const { prescriptionId, items } = req.body; // items = [{ medicationId, quantity }]
      await prisma.$transaction(async (tx) => {
        for (const item of items) {
          await tx.medication.update({
            where: { id: item.medicationId },
            data: { quantityInStock: { decrement: item.quantity } }
          });
        }
        await tx.prescription.update({
          where: { id: prescriptionId },
          data: { status: "Dispensed" }
        });
      });
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Inpatient Routes
  app.get("/api/inpatient/beds", authenticate, async (req, res) => {
    try {
      const beds = await prisma.bed.findMany({
        include: { 
          ward: true,
          admissions: {
            where: { status: "Admitted" },
            include: { patient: true }
          }
        },
        orderBy: { bedNumber: "asc" },
      });
      res.json(beds);
    } catch (error: any) {
      console.error("GET /api/inpatient/beds error:", error);
      res.status(500).json({ error: "Failed to fetch beds" });
    }
  });

  // Inventory Routes
  app.get("/api/inventory/items", authenticate, async (req, res) => {
    try {
      const items = await prisma.inventoryItem.findMany({
        include: { supplier: true },
        orderBy: { name: "asc" },
      });
      res.json(items);
    } catch (error: any) {
      console.error("GET /api/inventory/items error:", error);
      res.status(500).json({ error: "Failed to fetch inventory items" });
    }
  });

  // Invoices
  app.get("/api/invoices", authenticate, async (req, res) => {
    try {
      const invoices = await prisma.invoice.findMany({
        include: { patient: true },
        orderBy: { createdAt: "desc" },
      });
      res.json(invoices);
    } catch (error: any) {
      console.error("GET /api/invoices error:", error);
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
