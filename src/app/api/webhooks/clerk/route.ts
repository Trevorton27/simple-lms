// src/app/api/webhooks/clerk/route.ts
import { headers } from "next/headers";
import { Webhook } from "svix";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    throw new Error("Please add CLERK_WEBHOOK_SECRET to .env");
  }

  // 1) Required Svix headers
  const hs = await headers();
  const svixId = hs.get("svix-id");
  const svixTimestamp = hs.get("svix-timestamp");
  const svixSignature = hs.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Error: Missing svix headers", { status: 400 });
  }

  // 2) RAW body for signature verification — do NOT use req.json() here
  const raw = await req.text();

  // 3) Verify signature against RAW body
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;
  try {
    evt = wh.verify(raw, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("[clerk-webhook] Invalid signature", err);
    return new Response("Error: Verification failed", { status: 400 });
  }

  // 4) Now it's safe to parse JSON (helps for robust field access)
  let json: any;
  try {
    json = JSON.parse(raw);
  } catch {
    json = evt; // fallback; Clerk events are already typed
  }

  const eventType = evt.type;
  console.log("[clerk-webhook] event:", eventType);

  // Helper: extract a safe email
  function getPrimaryEmail(data: any): string | null {
    const list = Array.isArray(data?.email_addresses) ? data.email_addresses : [];
    const primaryId = data?.primary_email_address_id;
    if (primaryId) {
      const match = list.find((e: any) => e.id === primaryId);
      if (match?.email_address) return match.email_address;
    }
    // fallback to first if present
    return list[0]?.email_address ?? null;
  }

  try {
    if (eventType === "user.created") {
      const { id, first_name, last_name, image_url } = evt.data as any;
      const email = getPrimaryEmail(evt.data);

      // Use upsert for idempotency (Clerk may retry)
      await db.user.upsert({
        where: { id },
        update: {
          email,
          name: `${first_name || ""} ${last_name || ""}`.trim() || null,
          avatarUrl: image_url || null,
          isActive: true,
        },
        create: {
          id,
          email,
          name: `${first_name || ""} ${last_name || ""}`.trim() || null,
          avatarUrl: image_url || null,
          isActive: true,
        },
      });

      // Ensure default STUDENT role if none exists
      const studentRole = await db.role.findUnique({ where: { name: "STUDENT" } });
      if (studentRole) {
        const existing = await db.userRole.findFirst({ where: { userId: id } });
        if (!existing) {
          await db.userRole.create({ data: { userId: id, roleId: studentRole.id } });
        }
      }
      console.log("User upserted:", id);
    }

    if (eventType === "user.updated") {
      const { id, first_name, last_name, image_url } = evt.data as any;
      const email = getPrimaryEmail(evt.data);

      await db.user.update({
        where: { id },
        data: {
          email,
          name: `${first_name || ""} ${last_name || ""}`.trim() || null,
          avatarUrl: image_url || null,
        },
      });

      console.log("User updated:", id);
    }

    if (eventType === "user.deleted") {
      const { id } = evt.data as any;
      if (id) {
        await db.user.update({
          where: { id },
          data: { isActive: false },
        });
        console.log("User soft deleted:", id);
      }
    }

    // Organization membership events — be defensive about shapes
    if (
      eventType === "organizationMembership.created" ||
      eventType === "organizationMembership.updated"
    ) {
      const data: any = evt.data;
      const roleRaw: string | undefined = data?.role;
      const userId: string | undefined =
        data?.public_user_data?.user_id ?? data?.publicUserData?.userId ?? data?.user_id;

      if (userId && roleRaw) {
        await syncOrganizationRole(userId, roleRaw);
        console.log(`Organization membership ${eventType}:`, { userId, role: roleRaw });
      } else {
        console.warn("Org membership payload missing userId/role");
      }
    }

    if (eventType === "organizationMembership.deleted") {
      const data: any = evt.data;
      const userId: string | undefined =
        data?.public_user_data?.user_id ?? data?.publicUserData?.userId ?? data?.user_id;

      if (userId) {
        await resetToStudentRole(userId);
        console.log("Organization membership deleted:", userId);
      }
    }
  } catch (err) {
    // Any DB error bubbles here -> return 500 so Clerk can retry
    console.error("[clerk-webhook] Handler error:", err);
    return new Response("Webhook handler error", { status: 500 });
  }

  return new Response("Webhook processed", { status: 200 });
}

// === helpers ===
async function syncOrganizationRole(userId: string, clerkRole: string) {
  const roleMapping: Record<string, string> = {
    "org:admin": "ADMIN",
    "org:instructor": "INSTRUCTOR",
    "org:student": "STUDENT",
    admin: "ADMIN",
    instructor: "INSTRUCTOR",
    student: "STUDENT",
  };

  const dbRoleName = roleMapping[clerkRole.toLowerCase()];
  if (!dbRoleName) {
    console.warn(`Unknown Clerk role: ${clerkRole}`);
    return;
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    console.warn(`User not found for role sync: ${userId}`);
    return;
  }

  const role = await db.role.findUnique({ where: { name: dbRoleName } });
  if (!role) {
    console.warn(`Role not found in DB: ${dbRoleName}`);
    return;
  }

  await db.userRole.deleteMany({ where: { userId } });
  await db.userRole.create({ data: { userId, roleId: role.id } });
  console.log(`Synced role for user ${userId}: ${dbRoleName}`);
}

async function resetToStudentRole(userId: string) {
  const studentRole = await db.role.findUnique({ where: { name: "STUDENT" } });
  if (!studentRole) return;

  await db.userRole.deleteMany({ where: { userId } });
  await db.userRole.create({ data: { userId, roleId: studentRole.id } });
  console.log(`Reset user ${userId} to STUDENT role`);
}

// Optional CORS preflight (not required for Clerk -> server)
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, svix-id, svix-timestamp, svix-signature",
    },
  });
}
