import { getSessionUser } from "@/lib/auth";
import { NextResponse } from "next/server";


export async function GET() {
    const user = await getSessionUser();

    if(!user) {
        return NextResponse.json({
            error: "Not Authenticated"
        },{
            status: 401
        })
    }

    return NextResponse.json({
        id: user.id,
        username: user.username,
        dispay_name: user.display_name,
        role: user.role
    })
}