import { cookies } from "next/headers";
import { prisma } from "./db";

export async function getSessionUser() {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;

    if(!token) return null;

    const session = await prisma.sessions.findUnique({
        where: {
            token: token
        },
        include: {
            user: true
        }
    })


    if(!session) return null;
    if(session.expires_at < new Date()) return null;
    if(!session.user.active) return null;

    return session.user
}