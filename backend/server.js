const express = require('express');
const path = require('path');
const session = require('express-session');
const mongoStore = require('./database/connections/mongoStoreConnection');

require('dotenv').config();

const PORT = process.env.PORT || 3000;

const app = express();

app.use(express.json());

app.use(session({
    secret: process.env.NODE_SESSION_SECRET || 'defaultsecret',
    store: mongoStore,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // TODO: True if using HTTPS
}));

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