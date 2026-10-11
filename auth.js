/**
 * auth.js — JWT auth middleware.
 * Token via Authorization: Bearer <token>. Attaches req.user = {id, email, name, is_admin}.
 */
const jwt = require('jsonwebtoken');
const db = require('./db');

const SECRET = process.env.JWT_SECRET || 'skywings-dev-secret-change-me';

function sign(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, is_admin: !!user.is_admin },
    SECRET,
    { expiresIn: '7d' }
  );
}

async function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return res.status(401).json({ error: 'Missing token' });
  try {
    const payload = jwt.verify(m[1], SECRET);
    const user = await db.get(
      'SELECT id, email, name, phone, is_admin, created_at FROM users WHERE id = $1',
      [payload.id]
    );
    if (!user) return res.status(401).json({ error: 'Unknown user' });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
}

module.exports = { sign, requireAuth, requireAdmin, SECRET };
