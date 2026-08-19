import mongoose from "mongoose";

const globalForMongoose = globalThis;

if (!globalForMongoose.__mongooseCache) {
    globalForMongoose.__mongooseCache = { conn: null, promise: null };
}

const cache = globalForMongoose.__mongooseCache;

export async function connectMongo() {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
        throw new Error("Please define the MONGODB_URI environment variable in .env.local");
    }

    if (cache.conn) {
        return cache.conn;
    }

    if (!cache.promise) {
        cache.promise = mongoose.connect(mongoUri, {
            maxPoolSize: 10,
            minPoolSize: 0,
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000,
        });
    }

    cache.conn = await cache.promise;
    return cache.conn;
}
