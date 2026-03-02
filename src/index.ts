import "dotenv/config";
import cors from "cors";
import express, { ErrorRequestHandler } from "express";
import { connectDb, closeDb } from "./db.js";
import waitlistRouter from "./routes/waitlist.js";

const app = express();
const port = Number(process.env.PORT || 5001);

const allowedOrigins = (process.env.FRONTEND_ORIGIN || "")
	.split(",")
	.map((origin) => origin.trim())
	.filter(Boolean);

app.use(
	cors({
		origin(origin, callback) {
			if (
				!origin ||
				allowedOrigins.length === 0 ||
				allowedOrigins.includes(origin)
			) {
				return callback(null, true);
			}
			return callback(new Error("Origin not allowed by CORS"));
		},
	}),
);
app.use(express.json());

app.get("/health", (_req, res) => {
	res.status(200).json({ status: "ok" });
});

app.use("/api", waitlistRouter);

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
	console.error(err);
	res.status(500).json({ message: "Internal server error" });
};
app.use(errorHandler);

async function start(): Promise<void> {
	try {
		await connectDb();
		app.listen(port, () => {
			console.log(`Beatslot server listening on port ${port}`);
		});
	} catch (error) {
		console.error("Server startup failed:", error);
		process.exit(1);
	}
}

process.on("SIGINT", async () => {
	await closeDb();
	process.exit(0);
});

process.on("SIGTERM", async () => {
	await closeDb();
	process.exit(0);
});

void start();
