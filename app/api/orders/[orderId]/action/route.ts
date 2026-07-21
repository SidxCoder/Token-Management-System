import { getSessionUser } from "@/lib/auth";
import { cancelOrder, deliver, handToCashier, handToRunner, issueToken, OverrideStatus, setBagNumber, WorkflowError } from "@/lib/orders";
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
            case "set_bag_number":
                return NextResponse.json( await setBagNumber(user,orderId, payload));
            case "hand_to_runner":
                return NextResponse.json( await handToRunner(user, orderId));
            case "hand_to_cashier":
                return NextResponse.json( await handToCashier(user, orderId));
            case "deliver":
                return NextResponse.json( await deliver(user, orderId));
            case "cancel_token":
                return NextResponse.json( await cancelOrder(user, orderId));
            case "override_status":
                return NextResponse.json( await OverrideStatus(user, orderId, payload))                
            default:
                return NextResponse.json({
                    error: `unknown action "${action}"`
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