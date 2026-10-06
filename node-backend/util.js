const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

function slugify(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function nowIso() {
  return new Date().toISOString();
}
function hashPassword(pw) {
  return bcrypt.hashSync(pw, 10);
}
function verifyPassword(pw, hash) {
  try { return bcrypt.compareSync(pw, hash); } catch { return false; }
}
function signToken(userId, email, role) {
  return jwt.sign({ sub: String(userId), email, role, type: "access" }, JWT_SECRET, { expiresIn: "7d" });
}
function clean(doc) {
  if (!doc) return doc;
  const d = { ...doc };
  if (d._id !== undefined) { d.id = String(d._id); delete d._id; }
  delete d.password_hash;
  return d;
}

module.exports = { slugify, nowIso, hashPassword, verifyPassword, signToken, clean, JWT_SECRET };
