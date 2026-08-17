import { requireAdmin } from "@/lib/auth/session";

export async function GET() {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  return Response.json({ admin });
}
