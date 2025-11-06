import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET to .env');
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Missing svix headers', {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error: Verification failed', {
      status: 400,
    });
  }

  const eventType = evt.type;

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;

    // Create user in database
    const user = await db.user.create({
      data: {
        id,
        email: email_addresses[0].email_address,
        name: `${first_name || ''} ${last_name || ''}`.trim() || null,
        avatarUrl: image_url || null,
      },
    });

    // Assign default STUDENT role
    const studentRole = await db.role.findUnique({
      where: { name: 'STUDENT' },
    });

    if (studentRole) {
      await db.userRole.create({
        data: {
          userId: user.id,
          roleId: studentRole.id,
        },
      });
    }

    console.log('User created:', user.id);
  }

  if (eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;

    await db.user.update({
      where: { id },
      data: {
        email: email_addresses[0].email_address,
        name: `${first_name || ''} ${last_name || ''}`.trim() || null,
        avatarUrl: image_url || null,
      },
    });

    console.log('User updated:', id);
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data;

    if (id) {
      await db.user.update({
        where: { id },
        data: { isActive: false },
      });

      console.log('User soft deleted:', id);
    }
  }

  // Handle organization membership events
  if (eventType === 'organizationMembership.created' || eventType === 'organizationMembership.updated') {
    const { organization, public_user_data, role } = evt.data;
    const userId = public_user_data.user_id;

    console.log(`Organization membership ${eventType}:`, { userId, role });

    // Sync organization role to database
    await syncOrganizationRole(userId, role);
  }

  if (eventType === 'organizationMembership.deleted') {
    const { public_user_data } = evt.data;
    const userId = public_user_data.user_id;

    console.log('Organization membership deleted:', userId);

    // Remove all roles except STUDENT
    await resetToStudentRole(userId);
  }

  return new Response('Webhook processed', { status: 200 });
}

/**
 * Sync organization role from Clerk to database
 */
async function syncOrganizationRole(userId: string, clerkRole: string) {
  // Map Clerk org roles to database roles
  const roleMapping: Record<string, string> = {
    'org:admin': 'ADMIN',
    'org:instructor': 'INSTRUCTOR',
    'org:student': 'STUDENT',
    // Also support without org: prefix
    'admin': 'ADMIN',
    'instructor': 'INSTRUCTOR',
    'student': 'STUDENT',
  };

  const dbRoleName = roleMapping[clerkRole.toLowerCase()];

  if (!dbRoleName) {
    console.warn(`Unknown Clerk role: ${clerkRole}`);
    return;
  }

  // Ensure user exists
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    console.warn(`User not found: ${userId}`);
    return;
  }

  // Get the role from database
  const role = await db.role.findUnique({
    where: { name: dbRoleName },
  });

  if (!role) {
    console.warn(`Role not found in database: ${dbRoleName}`);
    return;
  }

  // Remove existing roles
  await db.userRole.deleteMany({
    where: { userId },
  });

  // Assign new role
  await db.userRole.create({
    data: {
      userId,
      roleId: role.id,
    },
  });

  console.log(`Synced role for user ${userId}: ${dbRoleName}`);
}

/**
 * Reset user to student role (when removed from organization)
 */
async function resetToStudentRole(userId: string) {
  const studentRole = await db.role.findUnique({
    where: { name: 'STUDENT' },
  });

  if (!studentRole) {
    return;
  }

  // Remove all roles
  await db.userRole.deleteMany({
    where: { userId },
  });

  // Assign student role
  await db.userRole.create({
    data: {
      userId,
      roleId: studentRole.id,
    },
  });

  console.log(`Reset user ${userId} to STUDENT role`);
}
