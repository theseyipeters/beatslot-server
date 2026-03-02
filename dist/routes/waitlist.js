import { Router } from "express";
import { MongoServerError } from "mongodb";
import { z } from "zod";
import { connectDb } from "../db.js";
const router = Router();
const joinWaitlistSchema = z.object({
    artist_name: z.string().trim().min(1).max(120),
    email: z.string().trim().email(),
    location: z.string().trim().min(1).max(120)
});
router.post("/join-waitlist", async (req, res) => {
    const parsed = joinWaitlistSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            message: "Invalid request body",
            errors: parsed.error.issues.map((issue) => ({
                path: issue.path.join("."),
                message: issue.message
            }))
        });
    }
    const { artist_name, email, location } = parsed.data;
    try {
        const { waitlistCollection } = await connectDb();
        const result = await waitlistCollection.insertOne({
            artist_name,
            email,
            location,
            created_at: new Date()
        });
        return res.status(201).json({
            message: "Successfully joined waitlist",
            id: result.insertedId.toString()
        });
    }
    catch (error) {
        if (error instanceof MongoServerError && error.code === 11000) {
            return res.status(409).json({
                message: "This email is already on the waitlist"
            });
        }
        console.error("Failed to add waitlist record:", error);
        return res.status(500).json({ message: "Failed to join waitlist" });
    }
});
export default router;
