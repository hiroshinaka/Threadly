const MongoStore = require('connect-mongo');

require('dotenv').config();

const mongoStore = MongoStore.create({
    mongoUrl: `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_HOST}/`,
    crypto: {
        secret: process.env.MONGODB_SESSION_SECRET
    }
})

module.exports = mongoStore;