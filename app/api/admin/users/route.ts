import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Role } from "@/lib/generated/prisma/client";
import { can } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";

// never send the password column to the client
const USER_SELECT = { id: true, username: true, display_name: true, role: true, active: true } as const;

async function requireAdmin() {
    const user = await getSessionUser();
    if (!user) return { error: NextResponse.json({ error: "unauthenticated" }, { status: 401 }) };
    if (!can(user.role, "manage_users")) {
        return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
    }
    return { user };
}

export async function GET() {
    const { user, error } = await requireAdmin();
    if (!user) return error;

    const users = await prisma.user.findMany({ select: USER_SELECT, orderBy: { username: "asc" } });
    return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
    const { user, error } = await requireAdmin();
    if (!user) return error;

    const body = await req.json().catch(() => null);
    const { username, password, display_name, role } = body ?? {};

    if (!username?.trim() || !password || !display_name?.trim()) {
        return NextResponse.json({ error: "username, password and display_name are required" }, { status: 400 });
    }
    if (!role || !(role in Role)) {
        return NextResponse.json({ error: `role must be one of: ${Object.keys(Role).join(", ")}` }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { username: username.trim() } });
    if (existing) return NextResponse.json({ error: `username "${username.trim()}" already exists` }, { status: 409 });

    const created = await prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
            data: {
                username: username.trim(),
                password_hash: password,   // plaintext by project decision (plan.md §11)
                display_name: display_name.trim(),
                role: role as Role,
            },
            select: USER_SELECT,
        });
        await tx.audit_Log.create({
            data: {
                user_id: user.id, username: user.username, role: user.role,
                action: "create_user",
                details: { created: u.username, role: u.role },
            },
        });
        return u;
    });

    return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req: NextRequest) {
    const { user, error } = await requireAdmin();
    if (!user) return error;

    const body = await req.json().catch(() => null);
    const { id, active, password, display_name, role } = body ?? {};

    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    if (id === user.id && active === false) {
        return NextResponse.json({ error: "you cannot deactivate your own account" }, { status: 400 });
    }
    if (role !== undefined && !(role in Role)) {
        return NextResponse.json({ error: `role must be one of: ${Object.keys(Role).join(", ")}` }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return NextResponse.json({ error: "user not found" }, { status: 404 });

    const data = {
        ...(active !== undefined ? { active: Boolean(active) } : {}),
        ...(password ? { password_hash: password } : {}),
        ...(display_name?.trim() ? { display_name: display_name.trim() } : {}),
        ...(role !== undefined ? { role: role as Role } : {}),
    };
    if (Object.keys(data).length === 0) {
        return NextResponse.json({ error: "nothing to update" }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
        const u = await tx.user.update({ where: { id }, data, select: USER_SELECT });
        await tx.audit_Log.create({
            data: {
                user_id: user.id, username: user.username, role: user.role,
                action: "update_user",
                // list which fields changed, never their values (passwords!)
                details: { target: u.username, fields: Object.keys(data) },
            },
        });
        return u;
    });

    return NextResponse.json(updated);
}
