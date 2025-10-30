// backend/server.js
const express = require('express');
const session = require('express-session');
const cors = require('cors');
require('dotenv').config();

const mongoStore = require('./database/connections/mongoStoreConnection');

const PORT = process.env.PORT || 5000;
const app = express();

// CORS setup
const allowlist = [
  process.env.FRONTEND_ORIGIN,  
  'https://threadly-phi.vercel.app',     
  'http://127.0.0.1:5000',
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // allow same-origin/SSR/no Origin and allowlisted origins
    if (!origin || allowlist.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked for origin ${origin}`));
  },
  credentials: true
}));

app.use(express.json());

// ---- Sessions (cross-site cookie for Vercel -> Render)
// For local development we must not set `secure: true` because that prevents
// the cookie from being set over plain HTTP. Use production-safe settings
// when NODE_ENV=production.
app.set('trust proxy', 1);
const isProd = process.env.NODE_ENV === 'production';
const sessionOptions = {
  secret: process.env.NODE_SESSION_SECRET || 'defaultsecret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd, // only send cookie over HTTPS in production
    maxAge: 24 * 60 * 60 * 1000,
  }
};
if (mongoStore) sessionOptions.store = mongoStore;
app.use(session(sessionOptions));

// ---- API routes ONLY (no static React here)
app.get('/api/health', (_req, res) => res.json({ ok: true }));

const apiRouter = require('./routes/api'); // make sure /api/auth/login lives here
app.use('/api', apiRouter);

// 404 JSON (no index.html fallbacks)
app.use((req, res) => {
  res.status(404).json({ ok: false, message: 'Not found', path: req.originalUrl });
});


// Global error handler → always JSON
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ ok: false, message: err?.message || 'Server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
