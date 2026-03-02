import { MongoClient } from "mongodb";
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME;
if (!uri) {
    throw new Error("MONGODB_URI is required");
}
if (!dbName) {
    throw new Error("MONGODB_DB_NAME is required");
}
const client = new MongoClient(uri);
let db;
let waitlistCollection;
export async function connectDb() {
    if (db && waitlistCollection) {
        return { db, waitlistCollection };
    }
    await client.connect();
    db = client.db(dbName);
    waitlistCollection = db.collection("waitlist");
    const indexes = await waitlistCollection.indexes();
    const hasLegacyEmailNormalizedIndex = indexes.some((index) => index.name === "emailNormalized_1");
    if (hasLegacyEmailNormalizedIndex) {
        await waitlistCollection.dropIndex("emailNormalized_1");
    }
    await waitlistCollection.createIndex({ email: 1 }, { unique: true });
    return { db, waitlistCollection };
}
export async function closeDb() {
    await client.close();
}
