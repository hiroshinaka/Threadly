const express = require('express');
const path = require('path');
const session = require('express-session');
const mongoStore = require('./database/connections/mongoStoreConnection');

require('dotenv').config();

const PORT = process.env.PORT || 5000;

const app = express();

app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(express.json());

app.set('trust proxy', 1); // needed on Render for secure cookies
const sessionOptions = {
  secret: process.env.NODE_SESSION_SECRET || 'defaultsecret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    // cross-site cookie so the frontend can send it
    sameSite: 'none',
    secure: true,                 // required for SameSite=None
    maxAge: 24 * 60 * 60 * 1000
  }
};

if (mongoStore) {
    sessionOptions.store = mongoStore;
} else {
    console.warn('Mongo session store not available — using default MemoryStore. Sessions will not be persisted across restarts.');
}

app.use(session(sessionOptions));

const publicPath = path.join(__dirname, '../frontend/build');

app.use(express.static(publicPath));

const apiRouter = require('./routes/api');
app.use('/api', apiRouter);

app.use((req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});