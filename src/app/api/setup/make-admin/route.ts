import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// ONE-TIME setup route — promote a user to admin by email
// Call: POST /api/setup/make-admin  { "email": "you@example.com", "secret": "setup2025" }
// DELETE THIS FILE after use.

const SETUP_SECRET = process.env.SETUP_SECRET ?? "setup2025";

export async function POST(req: NextRequest) {
  const { email, secret } = await req.json().catch(() => ({}));

  if (secret !== SETUP_SECRET) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!email) {
    return Response.json({ error: "email required" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { email: String(email).toLowerCase() },
    data: { role: "admin" },
    select: { id: true, email: true, role: true },
  });

  return Response.json({ ok: true, user });
}
