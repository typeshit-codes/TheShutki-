const path = require("path");
// hPanel writes panel variables into the repo-root .env. Local secrets live in backend/.env.
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
require("dotenv").config({ path: path.join(__dirname, ".env") });
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const QRCode = require("qrcode");
const jwt = require("jsonwebtoken");
const { MongoClient, ObjectId } = require("mongodb");
const { slugify, nowIso, hashPassword, verifyPassword, signToken, clean, JWT_SECRET } = require("./util");
const { seed } = require("./seed");

function envValue(name) {
  const value = (process.env[name] || "").trim().replace(/^["']|["']$/g, "");
  return value;
}
const MONGO_URL = envValue("MONGO_URL") || envValue("MONGODB_URI") || "mongodb://localhost:27017";
const DB_NAME = envValue("DB_NAME") || "theshutki";
const MONGO_CONFIGURED = Boolean(envValue("MONGO_URL") || envValue("MONGODB_URI"));

let db;
let dbError = MONGO_CONFIGURED ? "connecting" : "MONGO_URL is not set";

const app = express();
// hPanel terminates TLS in front of Node.
app.set("trust proxy", 1);
const corsOrigins = (process.env.CORS_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: corsOrigins.length ? corsOrigins : true, credentials: true }));
app.use(express.json({ limit: "15mb" }));
app.use(cookieParser());

// ---------- uploads (local disk on your own server, served from /api/files) ----------
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, "uploads");
function ensureUploadDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
try { ensureUploadDir(); } catch (err) {
  console.error(`Upload directory is not writable (${UPLOAD_DIR}): ${err.message}`);
}
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

function persistUpload(file) {
  ensureUploadDir();
  const ext = (file.originalname.split(".").pop() || "bin").toLowerCase();
  const filename = `${crypto.randomUUID()}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), file.buffer);
  return filename;
}

const api = express.Router();
function databaseDetail() {
  if (!MONGO_CONFIGURED) {
    return "MONGO_URL is not set. In hPanel → Environment variables, add MONGO_URL with the Atlas connection string, then restart.";
  }
  return `Database is not connected (${dbError}). In Atlas → Network Access, allow 0.0.0.0/0.`;
}
api.use((req, res, next) => {
  if (!db) return res.status(503).json({ detail: databaseDetail() });
  next();
});

// ---------- auth helpers ----------
async function getTokenUser(req) {
  let token = req.cookies?.access_token;
  if (!token) {
    const h = req.headers.authorization || "";
    if (h.startsWith("Bearer ")) token = h.slice(7);
  }
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await db.collection("users").findOne({ _id: new ObjectId(payload.sub) });
    if (!user) return null;
    return clean(user);
  } catch {
    return null;
  }
}
function requireUser(handler) {
  return async (req, res) => {
    const user = await getTokenUser(req);
    if (!user) return res.status(401).json({ detail: "Not authenticated" });
    req.user = user;
    return handler(req, res);
  };
}
function requireAdmin(handler) {
  return async (req, res) => {
    const user = await getTokenUser(req);
    if (!user) return res.status(401).json({ detail: "Not authenticated" });
    if (user.role !== "admin") return res.status(403).json({ detail: "Admin access required" });
    req.user = user;
    return handler(req, res);
  };
}
function setAuthCookie(res, token) {
  const prod = process.env.NODE_ENV === "production";
  res.cookie("access_token", token, {
    httpOnly: true,
    secure: prod,
    sameSite: prod ? "none" : "lax",
    maxAge: 604800000,
    path: "/",
  });
}

// ---------- JWT (Google/Firebase) verification via Google certs ----------
async function verifyWithCerts(token, certsUrl, { audience, issuers }) {
  const [headerB64] = token.split(".");
  const header = JSON.parse(Buffer.from(headerB64, "base64").toString());
  const resp = await fetch(certsUrl);
  const certs = await resp.json();
  const pem = certs[header.kid];
  if (!pem) throw new Error("No matching cert");
  return jwt.verify(token, pem, { algorithms: ["RS256"], audience, issuer: issuers });
}

async function resolveAuthCfg() {
  const s = (await db.collection("settings").findOne({ key: "main" })) || {};
  return {
    google_client_id: (s.google_client_id || process.env.GOOGLE_CLIENT_ID || "").trim(),
    firebase_api_key: (s.firebase_api_key || process.env.FIREBASE_API_KEY || "").trim(),
    firebase_auth_domain: (s.firebase_auth_domain || process.env.FIREBASE_AUTH_DOMAIN || "").trim(),
    firebase_project_id: (s.firebase_project_id || process.env.FIREBASE_PROJECT_ID || "").trim(),
  };
}

async function issueForUser(res, { email, name, phone = "", provider = "" }) {
  email = (email || "").toLowerCase();
  let user = email ? await db.collection("users").findOne({ email }) : null;
  if (!user && phone) user = await db.collection("users").findOne({ phone });
  let uid, role, uname;
  if (!user) {
    const doc = { name: name || (email ? email.split("@")[0] : "Customer"), email: email || `${phone}@phone.theshutki`, phone, password_hash: hashPassword(crypto.randomUUID()), role: "customer", provider, created_at: nowIso() };
    const r = await db.collection("users").insertOne(doc);
    uid = String(r.insertedId); role = "customer"; uname = doc.name;
  } else {
    uid = String(user._id); role = user.role || "customer"; uname = user.name || name;
  }
  const token = signToken(uid, email, role);
  setAuthCookie(res, token);
  return { id: uid, name: uname, email, role, token };
}

// ================= AUTH =================
api.post("/auth/register", async (req, res) => {
  const { name, email, password, phone } = req.body;
  const em = (email || "").toLowerCase();
  if (await db.collection("users").findOne({ email: em })) return res.status(400).json({ detail: "Email already registered" });
  const doc = { name, email: em, phone: phone || "", password_hash: hashPassword(password), role: "customer", created_at: nowIso() };
  const r = await db.collection("users").insertOne(doc);
  const uid = String(r.insertedId);
  const token = signToken(uid, em, "customer");
  setAuthCookie(res, token);
  res.json({ id: uid, name, email: em, role: "customer", token });
});

api.post("/auth/login", async (req, res) => {
  const em = (req.body.email || "").toLowerCase();
  const user = await db.collection("users").findOne({ email: em });
  if (!user || !verifyPassword(req.body.password, user.password_hash)) return res.status(401).json({ detail: "Invalid email or password" });
  const uid = String(user._id);
  const token = signToken(uid, em, user.role || "customer");
  setAuthCookie(res, token);
  res.json({ id: uid, name: user.name, email: em, role: user.role || "customer", token });
});

api.post("/auth/logout", (req, res) => { res.clearCookie("access_token", { path: "/" }); res.json({ ok: true }); });

api.get("/auth/config", async (req, res) => {
  const c = await resolveAuthCfg();
  res.json({
    google_enabled: !!c.google_client_id, google_client_id: c.google_client_id,
    firebase_enabled: !!(c.firebase_project_id && c.firebase_api_key),
    firebase: { apiKey: c.firebase_api_key, authDomain: c.firebase_auth_domain, projectId: c.firebase_project_id },
  });
});

api.post("/auth/google", async (req, res) => {
  const cfg = await resolveAuthCfg();
  if (!cfg.google_client_id) return res.status(400).json({ detail: "Google sign-in is not configured" });
  try {
    const info = await verifyWithCerts(req.body.credential, "https://www.googleapis.com/oauth2/v1/certs", { audience: cfg.google_client_id, issuers: ["accounts.google.com", "https://accounts.google.com"] });
    res.json(await issueForUser(res, { email: info.email, name: info.name, provider: "google" }));
  } catch { res.status(401).json({ detail: "Invalid Google credential" }); }
});

api.post("/auth/firebase", async (req, res) => {
  const cfg = await resolveAuthCfg();
  if (!cfg.firebase_project_id) return res.status(400).json({ detail: "Phone OTP login is not configured" });
  try {
    const info = await verifyWithCerts(req.body.id_token, "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com", { audience: cfg.firebase_project_id, issuers: `https://securetoken.google.com/${cfg.firebase_project_id}` });
    res.json(await issueForUser(res, { email: info.email || "", name: info.name || "", phone: info.phone_number || "", provider: "phone" }));
  } catch { res.status(401).json({ detail: "Invalid OTP token" }); }
});

api.get("/auth/me", requireUser(async (req, res) => {
  const u = req.user;
  res.json({ id: u.id, name: u.name, email: u.email, role: u.role || "customer", phone: u.phone || "" });
}));

// ================= PRODUCTS =================
api.get("/products", async (req, res) => {
  const q = req.query;
  const query = {};
  if (q.category && q.category !== "all") query.category = q.category;
  if (q.fish_type && q.fish_type !== "All") query.fish_type = q.fish_type;
  if (q.salt_level && q.salt_level !== "All") query.salt_level = q.salt_level;
  if (q.featured !== undefined) query.is_featured = q.featured === "true";
  if (q.bestseller !== undefined) query.is_bestseller = q.bestseller === "true";
  if (q.is_combo !== undefined) query.is_combo = q.is_combo === "true";
  if (q.tag) query.tags = q.tag;
  if (q.q) {
    const rx = { $regex: q.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    query.$or = [{ name: rx }, { bengali_name: rx }, { fish_type: rx }, { category: rx }, { tags: rx }, { description: rx }];
  }
  let docs = (await db.collection("products").find(query).toArray()).map(clean);
  const minprice = (p) => Math.min(...((p.variants || []).map((v) => v.price).concat([Infinity])));
  if (q.min_price) docs = docs.filter((d) => minprice(d) >= Number(q.min_price));
  if (q.max_price) docs = docs.filter((d) => minprice(d) <= Number(q.max_price));
  if (q.availability === "in_stock") docs = docs.filter((d) => (d.variants || []).some((v) => (v.stock || 0) > 0));
  const sort = q.sort || "featured";
  if (sort === "price_asc") docs.sort((a, b) => minprice(a) - minprice(b));
  else if (sort === "price_desc") docs.sort((a, b) => minprice(b) - minprice(a));
  else if (sort === "bestselling") docs.sort((a, b) => (b.reviews_count || 0) - (a.reviews_count || 0));
  else if (sort === "new") docs.sort((a, b) => (b.is_new ? 1 : 0) - (a.is_new ? 1 : 0));
  else docs.sort((a, b) => (a.is_featured === b.is_featured ? (b.rating || 0) - (a.rating || 0) : a.is_featured ? -1 : 1));
  const skip = Number(q.skip || 0), limit = Number(q.limit || 100);
  res.json(docs.slice(skip, skip + limit));
});

api.get("/products/suggestions", async (req, res) => {
  const rx = { $regex: (req.query.q || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  const docs = await db.collection("products").find({ $or: [{ name: rx }, { bengali_name: rx }, { fish_type: rx }, { tags: rx }] }).limit(6).toArray();
  res.json(docs.map((d) => ({ id: String(d._id), name: d.name, slug: d.slug, image: (d.images || [])[0] })));
});

api.get("/products/:slug", async (req, res) => {
  let doc = await db.collection("products").findOne({ slug: req.params.slug });
  if (!doc) { try { doc = await db.collection("products").findOne({ _id: new ObjectId(req.params.slug) }); } catch {} }
  if (!doc) return res.status(404).json({ detail: "Product not found" });
  res.json(clean(doc));
});

api.post("/products", requireAdmin(async (req, res) => {
  const doc = { ...req.body };
  doc.slug = doc.slug || slugify(doc.name);
  if (await db.collection("products").findOne({ slug: doc.slug })) doc.slug = `${doc.slug}-${crypto.randomBytes(3).toString("hex")}`;
  doc.created_at = nowIso();
  const r = await db.collection("products").insertOne(doc);
  res.json(clean(await db.collection("products").findOne({ _id: r.insertedId })));
}));

api.put("/products/:id", requireAdmin(async (req, res) => {
  const doc = { ...req.body }; delete doc.id; delete doc._id;
  doc.slug = doc.slug || slugify(doc.name);
  await db.collection("products").updateOne({ _id: new ObjectId(req.params.id) }, { $set: doc });
  res.json(clean(await db.collection("products").findOne({ _id: new ObjectId(req.params.id) })));
}));

api.delete("/products/:id", requireAdmin(async (req, res) => {
  await db.collection("products").deleteOne({ _id: new ObjectId(req.params.id) });
  res.json({ ok: true });
}));

// ================= CATEGORIES =================
api.get("/categories", async (req, res) => {
  const docs = await db.collection("categories").find().sort({ order: 1 }).toArray();
  res.json(docs.map(clean));
});
api.post("/categories", requireAdmin(async (req, res) => {
  const doc = { ...req.body }; doc.slug = doc.slug || slugify(doc.name);
  const r = await db.collection("categories").insertOne(doc);
  res.json(clean(await db.collection("categories").findOne({ _id: r.insertedId })));
}));
api.put("/categories/:id", requireAdmin(async (req, res) => {
  const doc = { ...req.body }; delete doc.id; delete doc._id; doc.slug = doc.slug || slugify(doc.name);
  await db.collection("categories").updateOne({ _id: new ObjectId(req.params.id) }, { $set: doc });
  res.json(clean(await db.collection("categories").findOne({ _id: new ObjectId(req.params.id) })));
}));
api.delete("/categories/:id", requireAdmin(async (req, res) => { await db.collection("categories").deleteOne({ _id: new ObjectId(req.params.id) }); res.json({ ok: true }); }));

// ================= COUPONS =================
async function validateCouponLogic(code, subtotal) {
  const c = await db.collection("coupons").findOne({ code: (code || "").toUpperCase(), active: true });
  if (!c) return { error: [404, "Invalid coupon code"] };
  if (c.expiry) { const ex = new Date(c.expiry); if (!isNaN(ex) && ex < new Date()) return { error: [400, "Coupon expired"] }; }
  if (c.usage_limit && (c.used || 0) >= c.usage_limit) return { error: [400, "Coupon usage limit reached"] };
  if (subtotal < (c.min_order || 0)) return { error: [400, `Minimum order ₹${Math.round(c.min_order)} required`] };
  let discount = c.type === "percent" ? (subtotal * c.value) / 100 : c.value;
  if (c.type === "percent" && c.max_discount) discount = Math.min(discount, c.max_discount);
  discount = Math.round(Math.min(discount, subtotal) * 100) / 100;
  return { data: { code: c.code, discount, type: c.type, value: c.value } };
}
api.post("/coupons/validate", async (req, res) => {
  const r = await validateCouponLogic(req.body.code, req.body.subtotal);
  if (r.error) return res.status(r.error[0]).json({ detail: r.error[1] });
  res.json(r.data);
});
api.get("/coupons", requireAdmin(async (req, res) => res.json((await db.collection("coupons").find().toArray()).map(clean))));
api.post("/coupons", requireAdmin(async (req, res) => {
  const doc = { ...req.body }; doc.code = (doc.code || "").toUpperCase();
  if (await db.collection("coupons").findOne({ code: doc.code })) return res.status(400).json({ detail: "Coupon code exists" });
  if (doc.used === undefined) doc.used = 0;
  const r = await db.collection("coupons").insertOne(doc);
  res.json(clean(await db.collection("coupons").findOne({ _id: r.insertedId })));
}));
api.put("/coupons/:id", requireAdmin(async (req, res) => {
  const doc = { ...req.body }; delete doc.id; delete doc._id; doc.code = (doc.code || "").toUpperCase();
  await db.collection("coupons").updateOne({ _id: new ObjectId(req.params.id) }, { $set: doc });
  res.json(clean(await db.collection("coupons").findOne({ _id: new ObjectId(req.params.id) })));
}));
api.delete("/coupons/:id", requireAdmin(async (req, res) => { await db.collection("coupons").deleteOne({ _id: new ObjectId(req.params.id) }); res.json({ ok: true }); }));

// ================= ORDERS =================
function genOrderId() {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return "TS" + ymd + crypto.randomBytes(3).toString("hex").slice(0, 5).toUpperCase();
}
api.post("/orders", async (req, res) => {
  const b = req.body;
  const settings = (await db.collection("settings").findOne({ key: "main" })) || {};
  const items = b.items || [];
  for (const it of items) {
    try {
      const prod = await db.collection("products").findOne({ _id: new ObjectId(it.product_id) });
      if (prod) { const m = (prod.variants || []).find((v) => v.weight === it.weight); if (m) it.price = Number(m.price); }
    } catch {}
  }
  const subtotal = Math.round(items.reduce((s, i) => s + i.price * i.quantity, 0) * 100) / 100;
  if (subtotal <= 0) return res.status(400).json({ detail: "Cart is empty" });

  let discount = 0;
  if (b.coupon_code) {
    const cr = await validateCouponLogic(b.coupon_code, subtotal);
    if (cr.data) { discount = cr.data.discount; await db.collection("coupons").updateOne({ code: b.coupon_code.toUpperCase() }, { $inc: { used: 1 } }); }
  }
  const freeAbove = settings.free_shipping_above ?? 499;
  const shipCharge = settings.shipping_charge ?? 49;
  const shipping = subtotal - discount >= freeAbove ? 0 : (b.payment_method === "cod" ? shipCharge : 0);
  const total = Math.round((subtotal - discount + shipping) * 100) / 100;

  const user = await getTokenUser(req);
  const oid = genOrderId();
  const doc = {
    order_id: oid, user_id: user ? user.id : null, items,
    customer: { full_name: b.full_name, phone: b.phone, email: b.email },
    shipping_address: { address: b.address, city: b.city, state: b.state, pincode: b.pincode },
    subtotal, discount, shipping, total, coupon_code: b.coupon_code || null,
    payment_method: b.payment_method || "cod", payment_status: "pending", status: "pending", notes: b.notes || "", created_at: nowIso(),
  };
  await db.collection("orders").insertOne(doc);
  for (const it of items) { try { await db.collection("products").updateOne({ _id: new ObjectId(it.product_id), "variants.weight": it.weight }, { $inc: { "variants.$.stock": -it.quantity } }); } catch {} }

  const result = { order_id: oid, total, subtotal, discount, shipping, payment_method: doc.payment_method };
  if (doc.payment_method === "upi") {
    const upiId = settings.upi_id || "theshutki@upi";
    const upiName = settings.upi_name || "TheShutki";
    const link = `upi://pay?pa=${upiId}&pn=${upiName}&am=${total}&cu=INR&tn=${oid}`;
    result.upi_link = link;
    result.qr = await QRCode.toDataURL(link);
  }
  res.json(result);
});
api.get("/orders/me", requireUser(async (req, res) => {
  const docs = await db.collection("orders").find({ user_id: req.user.id }).sort({ created_at: -1 }).toArray();
  res.json(docs.map(clean));
}));
api.get("/orders/:order_id", async (req, res) => {
  const doc = await db.collection("orders").findOne({ order_id: req.params.order_id });
  if (!doc) return res.status(404).json({ detail: "Order not found" });
  res.json(clean(doc));
});
api.get("/admin/orders", requireAdmin(async (req, res) => {
  const query = req.query.status ? { status: req.query.status } : {};
  const docs = await db.collection("orders").find(query).sort({ created_at: -1 }).toArray();
  res.json(docs.map(clean));
}));
api.patch("/admin/orders/:order_id/status", requireAdmin(async (req, res) => {
  const update = { status: req.body.status };
  if (req.body.status === "delivered") update.payment_status = "paid";
  await db.collection("orders").updateOne({ order_id: req.params.order_id }, { $set: update });
  res.json(clean(await db.collection("orders").findOne({ order_id: req.params.order_id })));
}));
api.patch("/admin/orders/:order_id/payment", requireAdmin(async (req, res) => {
  await db.collection("orders").updateOne({ order_id: req.params.order_id }, { $set: { payment_status: req.body.status } });
  res.json(clean(await db.collection("orders").findOne({ order_id: req.params.order_id })));
}));

// ================= REVIEWS =================
api.get("/reviews", async (req, res) => {
  const query = req.query.all === "true" ? {} : { active: true };
  if (req.query.product_id) query.product_id = req.query.product_id;
  const docs = await db.collection("reviews").find(query).sort({ created_at: -1 }).toArray();
  res.json(docs.map(clean));
});
api.post("/reviews", requireAdmin(async (req, res) => {
  const doc = { ...req.body, created_at: nowIso() };
  const r = await db.collection("reviews").insertOne(doc);
  res.json(clean(await db.collection("reviews").findOne({ _id: r.insertedId })));
}));
api.put("/reviews/:id", requireAdmin(async (req, res) => {
  const doc = { ...req.body }; delete doc.id; delete doc._id;
  await db.collection("reviews").updateOne({ _id: new ObjectId(req.params.id) }, { $set: doc });
  res.json(clean(await db.collection("reviews").findOne({ _id: new ObjectId(req.params.id) })));
}));
api.delete("/reviews/:id", requireAdmin(async (req, res) => { await db.collection("reviews").deleteOne({ _id: new ObjectId(req.params.id) }); res.json({ ok: true }); }));

// ================= RECIPES =================
api.get("/recipes", async (req, res) => {
  const query = req.query.featured === "true" ? { featured: true } : {};
  const docs = await db.collection("recipes").find(query).sort({ order: 1 }).toArray();
  res.json(docs.map(clean));
});
api.get("/recipes/:slug", async (req, res) => {
  const doc = await db.collection("recipes").findOne({ slug: req.params.slug });
  if (!doc) return res.status(404).json({ detail: "Recipe not found" });
  res.json(clean(doc));
});
api.post("/recipes", requireAdmin(async (req, res) => {
  const doc = { ...req.body }; doc.slug = doc.slug || slugify(doc.title);
  if (await db.collection("recipes").findOne({ slug: doc.slug })) doc.slug = `${doc.slug}-${crypto.randomBytes(3).toString("hex")}`;
  doc.created_at = nowIso();
  const r = await db.collection("recipes").insertOne(doc);
  res.json(clean(await db.collection("recipes").findOne({ _id: r.insertedId })));
}));
api.put("/recipes/:id", requireAdmin(async (req, res) => {
  const doc = { ...req.body }; delete doc.id; delete doc._id; doc.slug = doc.slug || slugify(doc.title);
  await db.collection("recipes").updateOne({ _id: new ObjectId(req.params.id) }, { $set: doc });
  res.json(clean(await db.collection("recipes").findOne({ _id: new ObjectId(req.params.id) })));
}));
api.delete("/recipes/:id", requireAdmin(async (req, res) => { await db.collection("recipes").deleteOne({ _id: new ObjectId(req.params.id) }); res.json({ ok: true }); }));

// ================= SETTINGS =================
api.get("/settings", async (req, res) => {
  const s = await db.collection("settings").findOne({ key: "main" });
  if (!s) return res.json({});
  const out = clean(s);
  out.shiprocket_configured = !!(out.shiprocket_api_password || process.env.SHIPROCKET_API_PASSWORD);
  delete out.shiprocket_api_password;
  res.json(out);
});
api.put("/settings", requireAdmin(async (req, res) => {
  const update = {}; for (const [k, v] of Object.entries(req.body)) if (v !== null && v !== undefined) update[k] = v;
  delete update.id; delete update._id;
  await db.collection("settings").updateOne({ key: "main" }, { $set: update }, { upsert: true });
  const s = await db.collection("settings").findOne({ key: "main" });
  const out = clean(s);
  out.shiprocket_configured = !!(out.shiprocket_api_password || process.env.SHIPROCKET_API_PASSWORD);
  delete out.shiprocket_api_password;
  res.json(out);
}));

// ================= ADMIN: customers / analytics / inventory =================
api.get("/admin/customers", requireAdmin(async (req, res) => {
  const users = await db.collection("users").find({ role: "customer" }).sort({ created_at: -1 }).toArray();
  const out = [];
  for (const u of users) {
    const orders = await db.collection("orders").find({ user_id: String(u._id) }).toArray();
    out.push({ id: String(u._id), name: u.name, email: u.email, phone: u.phone || "", created_at: u.created_at, orders_count: orders.length, total_spent: Math.round(orders.reduce((s, o) => s + (o.total || 0), 0) * 100) / 100 });
  }
  res.json(out);
}));
api.get("/admin/analytics", requireAdmin(async (req, res) => {
  const orders = await db.collection("orders").find().toArray();
  const paid = orders.filter((o) => o.payment_status === "paid" || o.status === "delivered");
  const revenue = Math.round(orders.reduce((s, o) => s + (o.total || 0), 0) * 100) / 100;
  const totalOrders = orders.length;
  const aov = totalOrders ? Math.round((revenue / totalOrders) * 100) / 100 : 0;
  const pending = orders.filter((o) => o.status === "pending").length;
  const customers = await db.collection("users").countDocuments({ role: "customer" });
  const counts = {};
  for (const o of orders) for (const it of o.items || []) counts[it.name] = (counts[it.name] || 0) + it.quantity;
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, qty]) => ({ name, qty }));
  const series = {};
  for (const o of orders) { const d = (o.created_at || "").slice(0, 10); series[d] = (series[d] || 0) + (o.total || 0); }
  const salesSeries = Object.entries(series).sort().map(([date, total]) => ({ date, total: Math.round(total * 100) / 100 })).slice(-7);
  res.json({ revenue, total_orders: totalOrders, aov, pending_orders: pending, customers, paid_orders: paid.length, bestsellers: best, sales_series: salesSeries });
}));
api.get("/admin/inventory", requireAdmin(async (req, res) => {
  const docs = await db.collection("products").find().toArray();
  const out = docs.map((d) => {
    const stock = (d.variants || []).reduce((s, v) => s + (v.stock || 0), 0);
    return { id: String(d._id), name: d.name, stock, image: (d.images || [])[0], status: stock === 0 ? "out" : stock < 20 ? "low" : "ok" };
  });
  out.sort((a, b) => a.stock - b.stock);
  res.json(out);
}));

// ================= UPLOAD / FILES =================
api.post("/upload", requireAdmin(async (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err || !req.file) return res.status(400).json({ detail: "Upload failed" });
    const filename = persistUpload(req.file);
    res.json({ url: `/api/files/${filename}`, path: filename });
  });
}));
api.use("/files", express.static(UPLOAD_DIR));

// ================= SHIPROCKET =================
const SHIPROCKET_BASE = process.env.SHIPROCKET_BASE_URL || "https://apiv2.shiprocket.in/v1/external";
let srTokenCache = { val: null, exp: 0 };
async function srConfig() {
  const s = (await db.collection("settings").findOne({ key: "main" })) || {};
  const email = (s.shiprocket_api_email || process.env.SHIPROCKET_API_EMAIL || "").trim();
  const pw = (s.shiprocket_api_password || process.env.SHIPROCKET_API_PASSWORD || "").trim();
  return { enabled: !!s.shiprocket_enabled && !!(email && pw), email, password: pw,
    pickup_location: s.shiprocket_pickup_location || process.env.SHIPROCKET_PICKUP_LOCATION || "Primary",
    pickup_postcode: s.shiprocket_pickup_postcode || process.env.SHIPROCKET_PICKUP_POSTCODE || "" };
}
async function srToken(cfg) {
  if (srTokenCache.val && srTokenCache.exp > Date.now() + 300000) return srTokenCache.val;
  const r = await fetch(`${SHIPROCKET_BASE}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: cfg.email, password: cfg.password }) });
  if (!r.ok) throw new Error("auth failed");
  const d = await r.json();
  srTokenCache = { val: d.token, exp: Date.now() + 9 * 864e5 };
  return d.token;
}
async function srRequest(method, path, cfg, { params, body } = {}) {
  let url = `${SHIPROCKET_BASE}${path}`;
  if (params) url += "?" + new URLSearchParams(params).toString();
  const doCall = async () => fetch(url, { method, headers: { Authorization: `Bearer ${await srToken(cfg)}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  let r = await doCall();
  if (r.status === 401) { srTokenCache.val = null; r = await doCall(); }
  if (!r.ok) throw Object.assign(new Error("shiprocket"), { status: 502, text: (await r.text()).slice(0, 300) });
  return r.json();
}
api.get("/shipping/serviceability", async (req, res) => {
  const cfg = await srConfig();
  if (!cfg.enabled) return res.json({ enabled: false });
  if (!cfg.pickup_postcode) return res.json({ enabled: true, couriers: [], message: "Set a pickup pincode in admin settings." });
  try {
    const data = await srRequest("GET", "/courier/serviceability/", cfg, { params: { pickup_postcode: cfg.pickup_postcode, delivery_postcode: req.query.delivery_postcode, weight: req.query.weight || 0.5, cod: req.query.cod || 0 } });
    const couriers = (data.data?.available_courier_companies || []).slice(0, 5).map((c) => ({ name: c.courier_name, rate: c.rate, days: c.estimated_delivery_days, etd: c.etd }));
    res.json({ enabled: true, serviceable: couriers.length > 0, couriers });
  } catch (e) { res.status(e.status || 502).json({ detail: e.text || "Shiprocket error" }); }
});
api.post("/admin/orders/:order_id/ship", requireAdmin(async (req, res) => {
  const cfg = await srConfig();
  if (!cfg.enabled) return res.status(503).json({ detail: "Shiprocket is not configured. Add credentials in Admin → Settings." });
  const o = await db.collection("orders").findOne({ order_id: req.params.order_id });
  if (!o) return res.status(404).json({ detail: "Order not found" });
  if (o.shipping?.shipment_id) return res.json(o.shipping);
  const addr = o.shipping_address || {}, cust = o.customer || {};
  const weight = Math.max(0.3, Math.round((o.items || []).reduce((s, it) => s + (it.quantity || 1), 0) * 0.3 * 100) / 100);
  const orderBody = {
    order_id: req.params.order_id, order_date: (o.created_at || nowIso()).slice(0, 16).replace("T", " "),
    pickup_location: cfg.pickup_location, billing_customer_name: cust.full_name || "", billing_last_name: "",
    billing_address: addr.address || "", billing_city: addr.city || "", billing_pincode: addr.pincode || "",
    billing_state: addr.state || "", billing_country: "India", billing_email: cust.email || "na@theshutki.com",
    billing_phone: cust.phone || "", shipping_is_billing: true,
    order_items: (o.items || []).map((it) => ({ name: it.name, sku: `${it.weight}-${it.name}`.slice(0, 40), units: it.quantity, selling_price: it.price })),
    payment_method: o.payment_method === "cod" ? "COD" : "Prepaid", sub_total: o.subtotal || 0, length: 20, breadth: 15, height: 10, weight,
  };
  try {
    const created = await srRequest("POST", "/orders/create/adhoc", cfg, { body: orderBody });
    const sid = created.shipment_id;
    const shipping = { provider: "shiprocket", shiprocket_order_id: created.order_id, shipment_id: sid, status: created.status, awb: null, label_url: null, courier_name: null };
    try { const awb = await srRequest("POST", "/courier/assign/awb", cfg, { body: { shipment_id: sid, ...(req.body.courier_id ? { courier_id: req.body.courier_id } : {}) } }); const ad = awb.response?.data || {}; shipping.awb = ad.awb_code; shipping.courier_name = ad.courier_name; } catch {}
    try { const label = await srRequest("POST", "/courier/generate/label", cfg, { body: { shipment_id: [sid] } }); shipping.label_url = label.label_url; } catch {}
    await db.collection("orders").updateOne({ order_id: req.params.order_id }, { $set: { shipping, status: "shipped" } });
    res.json(shipping);
  } catch (e) { res.status(e.status || 502).json({ detail: e.text || "Shiprocket error" }); }
}));
api.get("/admin/orders/:order_id/tracking", requireAdmin(async (req, res) => {
  const cfg = await srConfig();
  const o = await db.collection("orders").findOne({ order_id: req.params.order_id });
  const awb = o?.shipping?.awb;
  if (!cfg.enabled || !awb) return res.status(404).json({ detail: "No shipment/AWB for this order" });
  try { res.json(await srRequest("GET", `/courier/track/awb/${awb}`, cfg)); } catch (e) { res.status(e.status || 502).json({ detail: e.text || "Shiprocket error" }); }
}));

// ================= SITEMAP =================
api.get("/sitemap.xml", async (req, res) => {
  const base = process.env.SITE_URL || "https://theshutki.com";
  const products = await db.collection("products").find({}, { projection: { slug: 1 } }).toArray();
  const urls = [`${base}/`, `${base}/shop`, `${base}/about`, `${base}/contact`, `${base}/recipes`].concat(products.map((p) => `${base}/products/${p.slug}`));
  const body = urls.map((u) => `<url><loc>${u}</loc></url>`).join("");
  res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`);
});

api.get("/", (req, res) => res.json({ message: "TheShutki API running", db: true }));

app.use("/api", api);

app.get("/health", (req, res) => {
  res.json({ ok: !!db, service: "theshutki-api", db: !!db, mongoConfigured: MONGO_CONFIGURED, error: db ? undefined : dbError });
});

// Same Hostinger app serves the shop. /api stays the API.
const FRONTEND_BUILD = path.join(__dirname, "..", "frontend", "build");
const FRONTEND_INDEX = path.join(FRONTEND_BUILD, "index.html");
if (fs.existsSync(FRONTEND_INDEX)) {
  app.use(express.static(FRONTEND_BUILD));
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (req.path.startsWith("/api") || req.path === "/health") return next();
    res.sendFile(FRONTEND_INDEX);
  });
} else {
  app.get("/", (req, res) => res.json({ ok: true, service: "theshutki-api", db: !!db, frontend: false }));
}

function listen() {
  // Older hPanel Node apps are started by Passenger and ignore a hardcoded port.
  if (typeof PhusionPassenger !== "undefined") {
    PhusionPassenger.configure({ autoInstall: false });
    app.listen("passenger");
    console.log("TheShutki backend (Node) listening via Passenger");
    return;
  }
  // Current hPanel Node.js Web Apps inject PORT. Do not bind 0.0.0.0 or a fixed port.
  const port = process.env.PORT || 8001;
  app.listen(port, () => console.log(`TheShutki backend (Node) running on :${port}`));
}

async function connectMongo() {
  let attempt = 0;
  for (;;) {
    attempt += 1;
    const client = new MongoClient(MONGO_URL, { serverSelectionTimeoutMS: 8000 });
    try {
      await client.connect();
      const database = client.db(DB_NAME);
      await seed(database);
      db = database;
      dbError = "";
      console.log(`MongoDB connected (${DB_NAME})`);
      return;
    } catch (err) {
      dbError = String(err.message || "connect failed").replace(/mongodb(\+srv)?:\/\/\S+/gi, "mongodb://***");
      try { await client.close(); } catch {}
      const wait = Math.min(30000, 2000 * attempt);
      console.error(`MongoDB connect failed (attempt ${attempt}): ${err.message}`);
      if (attempt === 1) {
        console.error("hPanel: set MONGO_URL to MongoDB Atlas. In Atlas → Network Access, allow 0.0.0.0/0. Do not set PORT.");
      }
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
}

listen();
connectMongo();
