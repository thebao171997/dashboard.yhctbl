import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import path from "path";
import { createClient } from "@libsql/client";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-for-dev";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

// Create LibSQL client
const dbUrl = process.env.TURSO_DATABASE_URL || "file:local.db";
const db = createClient({
  url: dbUrl,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Initialize Database Schema
async function initDb() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type INTEGER NOT NULL, -- 1: Outpatient, 2: Inpatient, 3: Technical Services
      planned_beds INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS department_metrics (
      dept_id INTEGER,
      metric_key TEXT,
      PRIMARY KEY (dept_id, metric_key),
      FOREIGN KEY (dept_id) REFERENCES departments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS department_personnel (
      dept_id INTEGER,
      personnel_key TEXT,
      quantity INTEGER,
      PRIMARY KEY (dept_id, personnel_key),
      FOREIGN KEY (dept_id) REFERENCES departments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dept_id INTEGER NOT NULL,
      period_type TEXT NOT NULL, -- 'week', 'month', 'quarter'
      period_value TEXT NOT NULL, -- e.g., '2023-W01', '2023-01', '2023-Q1'
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dept_id) REFERENCES departments(id) ON DELETE CASCADE,
      UNIQUE(dept_id, period_type, period_value)
    );

    CREATE TABLE IF NOT EXISTS record_data (
      record_id INTEGER NOT NULL,
      metric_key TEXT NOT NULL,
      value REAL NOT NULL,
      PRIMARY KEY (record_id, metric_key),
      FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS hospital_targets (
      year INTEGER NOT NULL,
      metric_key TEXT NOT NULL,
      target_value REAL NOT NULL,
      PRIMARY KEY (year, metric_key)
    );
  `);
}

// Authentication Middleware
const requireAuth = (req: any, res: any, next: any) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

// --- API ROUTES --- //

// Auth
app.post("/api/auth/login", (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "1d" });
    res.cookie("token", token, { httpOnly: true, secure: true, sameSite: "none" });
    res.json({ success: true });
  } else {
    res.status(401).json({ error: "Invalid password" });
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("token", { httpOnly: true, secure: true, sameSite: "none" });
  res.json({ success: true });
});

app.get("/api/auth/me", (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.json({ user: null });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ user: decoded });
  } catch (err) {
    res.json({ user: null });
  }
});

// Departments
app.get("/api/departments", async (req, res) => {
  try {
    const result = await db.execute("SELECT * FROM departments ORDER BY name ASC");
    const depts = result.rows.map(row => ({
      id: row.id as number,
      name: row.name as string,
      type: row.type as number,
      planned_beds: row.planned_beds as number,
      metrics: [] as string[],
      personnel: {} as Record<string, number>
    }));
    for (let dept of depts) {
      const metricsRes = await db.execute({
        sql: "SELECT metric_key FROM department_metrics WHERE dept_id = ?",
        args: [dept.id]
      });
      dept.metrics = metricsRes.rows.map(r => r.metric_key as string);

      const personnelRes = await db.execute({
        sql: "SELECT personnel_key, quantity FROM department_personnel WHERE dept_id = ?",
        args: [dept.id]
      });
      for (const row of personnelRes.rows) {
        dept.personnel[row.personnel_key as string] = row.quantity as number;
      }
    }
    res.json(depts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/departments", requireAuth, async (req, res) => {
  const { name, type, plannedBeds, metrics, personnel } = req.body;
  try {
    const insertRes = await db.execute({
      sql: "INSERT INTO departments (name, type, planned_beds) VALUES (?, ?, ?) RETURNING id",
      args: [name, type, plannedBeds || 0]
    });
    const newId = insertRes.rows[0].id as number;
    
    if (metrics && metrics.length > 0) {
      for (const metric of metrics) {
        await db.execute({
          sql: "INSERT INTO department_metrics (dept_id, metric_key) VALUES (?, ?)",
          args: [newId, metric]
        });
      }
    }

    if (personnel && Object.keys(personnel).length > 0) {
      for (const [key, qty] of Object.entries(personnel)) {
        if (typeof qty === 'number') {
          await db.execute({
            sql: "INSERT INTO department_personnel (dept_id, personnel_key, quantity) VALUES (?, ?, ?)",
            args: [newId, key, qty]
          });
        }
      }
    }

    res.json({ id: newId, success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.put("/api/departments/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { name, type, plannedBeds, metrics, personnel } = req.body;
  try {
    await db.execute({
      sql: "UPDATE departments SET name = ?, type = ?, planned_beds = ? WHERE id = ?",
      args: [name, type, plannedBeds || 0, id]
    });
    
    await db.execute({
      sql: "DELETE FROM department_metrics WHERE dept_id = ?",
      args: [id]
    });
    
    if (metrics && metrics.length > 0) {
      for (const metric of metrics) {
        await db.execute({
          sql: "INSERT INTO department_metrics (dept_id, metric_key) VALUES (?, ?)",
          args: [id, metric]
        });
      }
    }

    await db.execute({
      sql: "DELETE FROM department_personnel WHERE dept_id = ?",
      args: [id]
    });

    if (personnel && Object.keys(personnel).length > 0) {
      for (const [key, qty] of Object.entries(personnel)) {
        if (typeof qty === 'number') {
          await db.execute({
            sql: "INSERT INTO department_personnel (dept_id, personnel_key, quantity) VALUES (?, ?, ?)",
            args: [id, key, qty]
          });
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.delete("/api/departments/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute({
      sql: "DELETE FROM departments WHERE id = ?",
      args: [id]
    });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// Records & Data
app.get("/api/records", async (req, res) => {
  const { deptId, year } = req.query;
  try {
    let sql = "SELECT id, dept_id, period_type, period_value, start_date, end_date FROM records WHERE dept_id = ?";
    let args: any[] = [Number(deptId)];
    
    if (year) {
      sql += " AND strftime('%Y', start_date) = ?";
      args.push(String(year));
    }
    
    sql += " ORDER BY start_date DESC";

    const result = await db.execute({
      sql,
      args
    });
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/records/check", async (req, res) => {
  const { deptId, periodType, periodValue } = req.query;
  try {
    const result = await db.execute({
      sql: "SELECT id FROM records WHERE dept_id = ? AND period_type = ? AND period_value = ?",
      args: [Number(deptId), periodType as string, periodValue as string]
    });
    if (result.rows.length > 0) {
      const recordId = result.rows[0].id;
      const dataRes = await db.execute({
        sql: "SELECT metric_key, value FROM record_data WHERE record_id = ?",
        args: [recordId]
      });
      const data: Record<string, number> = {};
      for (const row of dataRes.rows) {
        data[row.metric_key as string] = row.value as number;
      }
      res.json({ exists: true, recordId, data });
    } else {
      res.json({ exists: false });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/records", requireAuth, async (req, res) => {
  const { deptId, periodType, periodValue, startDate, endDate, data, overwriteRecordId, replaceOverlaps } = req.body;
  try {
    let recordId = overwriteRecordId;
    
    if (!recordId && !replaceOverlaps) {
       // Check for overlaps first
       const overlapResult = await db.execute({
         sql: "SELECT id, start_date, end_date FROM records WHERE dept_id = ? AND start_date <= ? AND end_date >= ? AND id != ?",
         args: [deptId, endDate, startDate, recordId || -1]
       });
       if (overlapResult.rows.length > 0) {
          const overlaps = overlapResult.rows.map(r => ({ start: r.start_date, end: r.end_date }));
          return res.status(409).json({ error: "OVERLAP_EXISTS", overlaps }); // Conflict
       }
    }
    
    if (replaceOverlaps) {
       // Delete any overlapping records
       const overlapResult = await db.execute({
         sql: "SELECT id FROM records WHERE dept_id = ? AND start_date <= ? AND end_date >= ?",
         args: [deptId, endDate, startDate]
       });
       for (const row of overlapResult.rows) {
          await db.execute({ sql: "DELETE FROM record_data WHERE record_id = ?", args: [row.id] });
          await db.execute({ sql: "DELETE FROM records WHERE id = ?", args: [row.id] });
       }
    }
    
    if (recordId && !replaceOverlaps) {
      // Overwrite: Delete existing data for this record
      await db.execute({
        sql: "DELETE FROM record_data WHERE record_id = ?",
        args: [recordId]
      });
      // Update record dates just in case
      await db.execute({
        sql: "UPDATE records SET start_date = ?, end_date = ? WHERE id = ?",
        args: [startDate, endDate, recordId]
      });
    } else {
      // Create new record
      const insertRes = await db.execute({
        sql: "INSERT INTO records (dept_id, period_type, period_value, start_date, end_date) VALUES (?, ?, ?, ?, ?) RETURNING id",
        args: [deptId, periodType, periodValue, startDate, endDate]
      });
      recordId = insertRes.rows[0].id;
    }

    // Insert new data
    for (const [key, value] of Object.entries(data)) {
      await db.execute({
        sql: "INSERT INTO record_data (record_id, metric_key, value) VALUES (?, ?, ?)",
        args: [recordId, key, Number(value)]
      });
    }

    res.json({ success: true, recordId });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/records/:id", requireAuth, async (req, res) => {
  const recordId = req.params.id;
  try {
    await db.execute({ sql: "DELETE FROM record_data WHERE record_id = ?", args: [recordId] });
    await db.execute({ sql: "DELETE FROM records WHERE id = ?", args: [recordId] });
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Dashboard Data
app.get("/api/dashboard", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let recordsQuery = `
      SELECT 
        r.id, r.dept_id, r.start_date, r.end_date, d.name as dept_name, d.type as dept_type, d.planned_beds,
        rd.metric_key, rd.value
      FROM records r
      JOIN departments d ON r.dept_id = d.id
      JOIN record_data rd ON r.id = rd.record_id
    `;
    let periodDays = 1;
    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      periodDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1);
    } else {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1);
      periodDays = Math.max(1, Math.round((now.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1);
    }

    const params: string[] = [];
    if (startDate && endDate) {
      recordsQuery += ` WHERE r.start_date >= ? AND r.end_date <= ?`;
      params.push(startDate as string, endDate as string);
    } else {
      const currentYear = new Date().getFullYear().toString();
      recordsQuery += ` WHERE strftime('%Y', r.start_date) = ?`;
      params.push(currentYear);
    }

    // Get all records data joined with department info
    const recordsRes = await db.execute({ sql: recordsQuery, args: params });
    
    // Group data by dept_id then sum metrics (since default is accumulated to current date)
    const deptTotals: Record<number, any> = {};

    // Fetch all departments to ensure they exist even if they have no records
    const allDeptsRes = await db.execute("SELECT id, name, type, planned_beds FROM departments");
    for (const row of allDeptsRes.rows) {
      const dId = row.id as number;
      deptTotals[dId] = {
        id: dId,
        name: row.name,
        type: row.type,
        planned_beds: row.planned_beds,
        metrics: {},
        personnel: {},
        days: 0
      };
    }

    for (const row of recordsRes.rows) {
      const dId = row.dept_id as number;
      if (deptTotals[dId]) {
        const key = row.metric_key as string;
        const val = row.value as number;
        deptTotals[dId].metrics[key] = (deptTotals[dId].metrics[key] || 0) + val;
      }
    }
    
    // Fetch personnel data and attach to departments
    const personnelRes = await db.execute("SELECT dept_id, personnel_key, quantity FROM department_personnel");
    for (const row of personnelRes.rows) {
      const dId = row.dept_id as number;
      if (deptTotals[dId]) {
        deptTotals[dId].personnel[row.personnel_key as string] = row.quantity as number;
      }
    }
    
    // Set fixed period days for all departments
    for (const dId in deptTotals) {
      deptTotals[dId].days = periodDays;
    }

    const data = Object.values(deptTotals).map(d => {
       // calculate computed metrics
       const m = d.metrics;
       let cssdgb = 0;
       let ndttb = 0;
       if (d.type === 2) { // Inpatient
         if (d.planned_beds > 0 && d.days > 0 && m.ngay_dieu_tri_noi_tru) {
           cssdgb = (m.ngay_dieu_tri_noi_tru * 100) / (d.planned_beds * d.days);
         }
         if (m.benh_nhan_noi_tru > 0 && m.ngay_dieu_tri_noi_tru) {
           ndttb = m.ngay_dieu_tri_noi_tru / m.benh_nhan_noi_tru;
         }
         m.cssdgb = cssdgb;
         m.ndttb = ndttb;
       }
       return d;
    });

    const targetsRes = await db.execute("SELECT year, metric_key, target_value FROM hospital_targets");
    const targets = targetsRes.rows.map(row => ({
      year: row.year as number,
      metric_key: row.metric_key as string,
      target_value: row.target_value as number
    }));

    res.json({ data, targets });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/targets", async (req, res) => {
  try {
    const { year } = req.query;
    let query = "SELECT year, metric_key, target_value FROM hospital_targets";
    let args: any[] = [];
    if (year) {
      query += " WHERE year = ?";
      args.push(Number(year));
    }
    const result = await db.execute({ sql: query, args });
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/targets", requireAuth, async (req, res) => {
  try {
    const { year, targets } = req.body;
    if (!year || !targets) return res.status(400).json({ error: "Missing year or targets" });
    
    const yearNum = Number(year);
    
    await db.execute({
      sql: "DELETE FROM hospital_targets WHERE year = ?",
      args: [yearNum]
    });
    
    for (const [key, val] of Object.entries(targets)) {
      if (val !== undefined && val !== null && val !== '') {
        await db.execute({
          sql: "INSERT INTO hospital_targets (year, metric_key, target_value) VALUES (?, ?, ?)",
          args: [yearNum, key, Number(val)]
        });
      }
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// --- Server Setup --- //
async function startServer() {
  await initDb();
  
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    // Express 5.x uses * instead of *all or whatever, but actually Express 5.x standardizes wildcards. Let's use * 
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
