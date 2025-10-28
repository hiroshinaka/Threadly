const express = require('express');
const path = require('path');
const session = require('express-session');
const mongoStore = require('./database/connections/mongoStoreConnection');
const cors = require('cors');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

const app = express();

app.use(cors({
  origin: '*',
  credentials: true
}));


app.set('trust proxy', 1); // needed on Render for secure cookies
const sessionOptions = {
  secret: process.env.NODE_SESSION_SECRET || 'defaultsecret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    sameSite: 'none',
    secure: true,                
    maxAge: 24 * 60 * 60 * 1000
  }
};
app.use(express.json());

if (mongoStore) {
    sessionOptions.store = mongoStore;
} else {
    console.warn('Mongo session store not available — using default MemoryStore. Sessions will not be persisted across restarts.');
}

app.use(session(sessionOptions));

const publicPath = path.join(__dirname, '../frontend/build');

app.use(express.static(publicPath));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
const apiRouter = require('./routes/api');
app.use('/api', apiRouter);

app.use((_req, res) => res.status(404).json({ ok: false, message: 'Not found' }));


app.use((req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

app.use((_req, res) => res.status(404).json({ ok: false, message: 'Not found' }));

// --- Global error handler so client always gets JSON
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ ok: false, message: err?.message || 'Server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});