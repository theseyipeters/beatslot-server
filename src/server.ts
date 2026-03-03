import app from "./app.js";
import { closeDb, connectDb } from "./db.js";

const port = Number(process.env.PORT || 5001);

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
