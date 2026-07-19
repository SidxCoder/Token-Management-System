import { getSessionUser } from "@/lib/auth";
import { issueToken, WorkflowError } from "@/lib/orders";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, { params }: {params: Promise< {orderId: string}> }){
    const user = await getSessionUser();

    if(!user) return NextResponse.json({
        error: "unauthenticated"
    },{
        status: 401
    })

    const { orderId } = await params;

    const { action, ...payload } = await req.json().catch(() => ({}));

    try {
        switch ( action ) {
            case "issue_token":
                return NextResponse.json( await issueToken(user, orderId));
            default:
                return NextResponse.json({
                    error: `unknown action "${action}`
                },{
                    status: 400
                })
        }
    } catch (e) {
        if(e instanceof WorkflowError) return NextResponse.json({
            error: e.message
        },{
            status: e.status
        });
        throw e;
    }
}