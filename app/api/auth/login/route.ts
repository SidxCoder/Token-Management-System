import { prisma } from "@/lib/db";
import { error } from "console";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest){
    const {username, password} = await req.json().catch(()=> null)
    if (!username || !password) {
        return NextResponse.json({
            error: "username and password required"
        },{
            status:401
        })
    }
    const user =await  prisma.user.findUnique({
        where: {
            username: username,
            password_hash: password
        }
    })

    if(!user || !user?.active){
        return NextResponse.json({
            error: "invalid credentials"
        },{
            status: 401
        })
    }

    const session = await prisma.sessions.create({
        data:{
            userId:user.id,
            expires_at: new Date(Date.now() + 1000 * 60 * 60 *8),
        }
    })

    const cookieStore = await cookies();
    cookieStore.set("session", session.token, {
        httpOnly: true,
        sameSite: "lax",
        expires: session.expires_at
    })

    return NextResponse.json({
        id: user.id,
        display_name: user.display_name,
        role: user.role
    })

}