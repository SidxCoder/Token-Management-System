import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";


export async function POST() {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;

    if(token){
        await prisma.sessions.deleteMany({where: {token}})
    }

    cookieStore.delete("session");
    return NextResponse.json({
        ok: true
    })
}