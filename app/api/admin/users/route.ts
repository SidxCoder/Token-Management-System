import { getSessionUser, invalidateAllSessions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Role } from "@/lib/generated/prisma/client";
import { can } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";

// never send the password column to the client
const USER_SELECT = { id: true, username: true, display_name: true, role: true, active: true, station_number: true } as const;

// Station numbers identify a specific runner/cashier at handover. Only those two
// roles have one; the DB enforces uniqueness per role.
function parseStation(raw: unknown, role: Role | undefined) {
    if (raw === undefined) return undefined;
    if (raw === null || raw === "") return null;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1) {
        throw new Error("station number must be a positive whole number");
    }
    if (role && role !== Role.RUNNER && role !== Role.CASHIER) {
        throw new Error("only runners and cashiers can have a station number");
    }
    return n;
}

// Roles that occupy a numbered station.
const NUMBERED = [Role.RUNNER, Role.CASHIER] as const;
type NumberedRole = (typeof NUMBERED)[number];

function isNumbered(role: Role): role is NumberedRole {
    return (NUMBERED as readonly Role[]).includes(role);
}

// Next free station number for a role. Archived accounts release their number,
// so deleting Runner 2 lets the next runner reuse it and the numbering stays
// contiguous instead of drifting upward forever.
async function nextStationNumber(role: NumberedRole) {
    const taken = await prisma.user.findMany({
        where: { role, archived: false, station_number: { not: null } },
        select: { station_number: true },
    });
    const used = new Set(taken.map((u) => u.station_number));
    let n = 1;
    while (used.has(n)) n += 1;
    return n;
}

function stationLabel(role: NumberedRole, n: number) {
    return `${role === Role.RUNNER ? "Runner" : "Cashier"} ${n}`;
}

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

    const users = await prisma.user.findMany({
        where: { archived: false },
        select: USER_SELECT,
        orderBy: { username: "asc" },
    });
    return NextResponse.json(users);
}

export async function DELETE(req: NextRequest) {
    const { user, error } = await requireAdmin();
    if (!user) return error;

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    if (id === user.id) {
        return NextResponse.json({ error: "you cannot delete your own account" }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target || target.archived) {
        return NextResponse.json({ error: "user not found" }, { status: 404 });
    }

    // Audit_Log.user_id and Tokens.issued_by are ON DELETE RESTRICT, so a user
    // who has ever acted cannot be removed without destroying history. Delete
    // only untouched accounts; archive the rest.
    const [audits, tokens] = await Promise.all([
        prisma.audit_Log.count({ where: { user_id: id } }),
        prisma.tokens.count({ where: { issued_by: id } }),
    ]);
    const hasHistory = audits > 0 || tokens > 0;

    await prisma.$transaction(async (tx) => {
        if (hasHistory) {
            await tx.user.update({
                where: { id },
                data: { archived: true, active: false, station_number: null },
            });
        } else {
            // Sessions cascade; nothing else references an account with no history.
            await tx.user.delete({ where: { id } });
        }
        await tx.audit_Log.create({
            data: {
                user_id: user.id, username: user.username, role: user.role,
                action: hasHistory ? "archive_user" : "delete_user",
                details: { target: target.username, audits, tokens },
            },
        });
    });

    invalidateAllSessions();

    return NextResponse.json({
        ok: true,
        archived: hasHistory,
        message: hasHistory
            ? `${target.display_name} had ${audits} audit entries and ${tokens} issued tokens, so the account was archived instead of deleted. History is preserved.`
            : `${target.display_name} was deleted.`,
    });
}

export async function POST(req: NextRequest) {
    const { user, error } = await requireAdmin();
    if (!user) return error;

    const body = await req.json().catch(() => null);
    const { username, password, display_name, role, station_number } = body ?? {};

    if (!role || !(role in Role)) {
        return NextResponse.json({ error: `role must be one of: ${Object.keys(Role).join(", ")}` }, { status: 400 });
    }
    if (!password) {
        return NextResponse.json({ error: "password is required" }, { status: 400 });
    }

    let station: number | null | undefined;
    try {
        station = parseStation(station_number, role as Role);
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }

    // Runners and cashiers are identified by their station, so the number, the
    // display name and the username are all derived from the role instead of
    // being typed in. An explicit value still wins if one is supplied.
    let name = display_name?.trim() ?? "";
    let login = username?.trim() ?? "";

    if (isNumbered(role as Role)) {
        if (station === undefined || station === null) {
            station = await nextStationNumber(role as NumberedRole);
        }
        if (!name) name = stationLabel(role as NumberedRole, station);
        if (!login) login = name.toLowerCase().replace(/\s+/g, "");
    }

    if (!login || !name) {
        return NextResponse.json({ error: "username and display_name are required for this role" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { username: login } });
    if (existing) return NextResponse.json({ error: `username "${login}" already exists` }, { status: 409 });

    const created = await prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
            data: {
                username: login,
                password_hash: password,   // plaintext by project decision (plan.md §11)
                display_name: name,
                role: role as Role,
                ...(station !== undefined ? { station_number: station } : {}),
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
    const { id, active, password, display_name, role, station_number } = body ?? {};

    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    if (id === user.id && active === false) {
        return NextResponse.json({ error: "you cannot deactivate your own account" }, { status: 400 });
    }
    if (role !== undefined && !(role in Role)) {
        return NextResponse.json({ error: `role must be one of: ${Object.keys(Role).join(", ")}` }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return NextResponse.json({ error: "user not found" }, { status: 404 });

    let station: number | null | undefined;
    try {
        station = parseStation(station_number, (role as Role) ?? target.role);
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }

    const data = {
        ...(active !== undefined ? { active: Boolean(active) } : {}),
        ...(password ? { password_hash: password } : {}),
        ...(display_name?.trim() ? { display_name: display_name.trim() } : {}),
        ...(role !== undefined ? { role: role as Role } : {}),
        ...(station !== undefined ? { station_number: station } : {}),
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

    // Deactivating or changing a role must take effect immediately, not after
    // the session cache TTL.
    invalidateAllSessions();

    return NextResponse.json(updated);
}
