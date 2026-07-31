import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Role } from "@/lib/generated/prisma/client";
import { NextRequest, NextResponse } from "next/server";

// Who a bag can be handed to. Any signed-in user needs this to populate the
// runner/cashier picker at handover, so it is not admin-gated — but it returns
// only the fields needed to identify a station, never credentials.
const STAFF_SELECT = {
    id: true,
    display_name: true,
    station_number: true,
} as const;

export async function GET(req: NextRequest) {
    const user = await getSessionUser();
    if (!user) {
        return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const roleRaw = req.nextUrl.searchParams.get("role");
    if (!roleRaw || !(roleRaw in Role)) {
        return NextResponse.json(
            { error: `role must be one of: ${Object.keys(Role).join(", ")}` },
            { status: 400 },
        );
    }

    // `?next=1` returns the station number a new account of this role would get,
    // so the create form can show it before the account exists.
    if (req.nextUrl.searchParams.get("next") === "1") {
        if (roleRaw !== Role.RUNNER && roleRaw !== Role.CASHIER) {
            return NextResponse.json({ next: null });
        }
        const taken = await prisma.user.findMany({
            where: { role: roleRaw as Role, archived: false, station_number: { not: null } },
            select: { station_number: true },
        });
        const used = new Set(taken.map((u) => u.station_number));
        let n = 1;
        while (used.has(n)) n += 1;
        return NextResponse.json({ next: n });
    }

    const staff = await prisma.user.findMany({
        where: { role: roleRaw as Role, active: true, archived: false },
        select: STAFF_SELECT,
        // Numbered stations first and in order, unnumbered accounts after.
        orderBy: [{ station_number: { sort: "asc", nulls: "last" } }, { display_name: "asc" }],
    });

    return NextResponse.json(staff);
}
