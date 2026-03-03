import { createHmac, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { connectDb } from "../db.js";

const router = Router();

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const usersQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const adminEmail = process.env.ADMIN_EMAIL || "admin@beatslot.com";
const adminPassword = process.env.ADMIN_PASSWORD || "change-me";
const tokenSecret = process.env.ADMIN_TOKEN_SECRET || "change-this-admin-secret";
const tokenTtlMs = 1000 * 60 * 60 * 8;

function base64UrlEncode(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf-8");
}

function signToken(payload: { email: string; exp: number }): string {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = createHmac("sha256", tokenSecret)
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

function verifyToken(token: string): { email: string; exp: number } | null {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = createHmac("sha256", tokenSecret)
    .update(encodedPayload)
    .digest("base64url");

  const sigBuffer = Buffer.from(signature);
  const expectedSigBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expectedSigBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(sigBuffer, expectedSigBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as {
      email: string;
      exp: number;
    };

    if (!payload?.email || !payload?.exp || payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function formatPercentDelta(current: number, previous: number): string {
  if (previous === 0) {
    if (current === 0) return "0.0%";
    return "+100.0%";
  }

  const change = ((current - previous) / previous) * 100;
  return `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
}

router.post("/admin/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid login payload" });
  }

  const { email, password } = parsed.data;

  if (email !== adminEmail || password !== adminPassword) {
    return res.status(401).json({ message: "Invalid admin credentials" });
  }

  const expiresAt = Date.now() + tokenTtlMs;
  const token = signToken({ email, exp: expiresAt });

  return res.status(200).json({
    token,
    expiresAt,
    admin: {
      email,
    },
  });
});

router.use("/admin", (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.slice("Bearer ".length).trim();
  const payload = verifyToken(token);

  if (!payload || payload.email !== adminEmail) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  return next();
});

router.get("/admin/overview", async (_req, res) => {
  const { waitlistCollection } = await connectDb();

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    totalUsers,
    thisMonthUsers,
    previousMonthUsers,
    lastSevenDaysUsers,
    recentUsers,
  ] = await Promise.all([
    waitlistCollection.countDocuments(),
    waitlistCollection.countDocuments({
      created_at: { $gte: currentMonthStart },
    }),
    waitlistCollection.countDocuments({
      created_at: { $gte: previousMonthStart, $lt: currentMonthStart },
    }),
    waitlistCollection.countDocuments({
      created_at: {
        $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      },
    }),
    waitlistCollection
      .find({}, { projection: { artist_name: 1, email: 1, created_at: 1 } })
      .sort({ created_at: -1 })
      .limit(8)
      .toArray(),
  ]);

  return res.status(200).json({
    metrics: [
      {
        label: "Total Users",
        value: totalUsers.toLocaleString(),
        delta: formatPercentDelta(thisMonthUsers, previousMonthUsers),
      },
      {
        label: "This Month",
        value: thisMonthUsers.toLocaleString(),
        delta: formatPercentDelta(thisMonthUsers, previousMonthUsers),
      },
      {
        label: "Last 7 Days",
        value: lastSevenDaysUsers.toLocaleString(),
        delta: "+0.0%",
      },
      {
        label: "Previous Month",
        value: previousMonthUsers.toLocaleString(),
        delta: formatPercentDelta(previousMonthUsers, thisMonthUsers),
      },
    ],
    recentUsers: recentUsers.map((user) => ({
      id: user._id.toString(),
      name: user.artist_name,
      email: user.email,
      plan: "Waitlist",
      status: "Active",
      createdAt: user.created_at,
    })),
    serviceHealth: {
      apiUptime: 99,
      queueThroughput: 82,
      paymentProcessor: 96,
    },
  });
});

router.get("/admin/users", async (req, res) => {
  const parsed = usersQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid query parameters" });
  }

  const search = parsed.data.search || "";
  const page = parsed.data.page || 1;
  const limit = parsed.data.limit || 20;
  const skip = (page - 1) * limit;

  const query = search
    ? {
        $or: [
          { artist_name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { location: { $regex: search, $options: "i" } },
        ],
      }
    : {};

  const { waitlistCollection } = await connectDb();
  const [total, users] = await Promise.all([
    waitlistCollection.countDocuments(query),
    waitlistCollection
      .find(query, { projection: { artist_name: 1, email: 1, location: 1, created_at: 1 } })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
  ]);

  return res.status(200).json({
    page,
    limit,
    total,
    users: users.map((user) => ({
      id: user._id.toString(),
      name: user.artist_name,
      email: user.email,
      location: user.location,
      joinedAt: user.created_at,
      plan: "Waitlist",
      status: "Active",
    })),
  });
});

export default router;
