import { Collection, Db, MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME;

if (!uri) {
	throw new Error("MONGODB_URI is required");
}

if (!dbName) {
	throw new Error("MONGODB_DB_NAME is required");
}

export interface WaitlistDocument {
	artist_name: string;
	email: string;
	location: string;
	created_at: Date;
}

const client = new MongoClient(uri);

let db: Db | undefined;
let waitlistCollection: Collection<WaitlistDocument> | undefined;

export async function connectDb(): Promise<{
	db: Db;
	waitlistCollection: Collection<WaitlistDocument>;
}> {
	if (db && waitlistCollection) {
		return { db, waitlistCollection };
	}

	await client.connect();
	db = client.db(dbName);
	waitlistCollection = db.collection<WaitlistDocument>("waitlist");

	const indexes = await waitlistCollection.indexes();
	const hasLegacyEmailNormalizedIndex = indexes.some(
		(index) => index.name === "emailNormalized_1"
	);

	if (hasLegacyEmailNormalizedIndex) {
		await waitlistCollection.dropIndex("emailNormalized_1");
	}

	await waitlistCollection.createIndex(
		{ email: 1 },
		{ unique: true },
	);

	return { db, waitlistCollection };
}

export async function closeDb(): Promise<void> {
	await client.close();
}
