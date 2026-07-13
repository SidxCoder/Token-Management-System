import { NextResponse } from "next/server";
import * as XSLX from "xlsx"

export async function GET() {
    const wb = XSLX.utils.book_new();
    XSLX.utils.book_append_sheet(wb, XSLX.utils.aoa_to_sheet([
        ["Order ID", "Customer Name", "Phone Number", "Bag Number"],
        ["ORD-1001", "Abishek Newar", "9876549876", "12"],
        ["ORD-1002", "Siddhart Sharma", "9878654632",""]
    ]), "Orders")

    XSLX.utils.book_append_sheet(wb, XSLX.utils.aoa_to_sheet([
        ["Order ID", "Product Name", "Packed"],
        ["ORD-1001", "S26 ultra", "No"],
        ["ORD-1002", "earbuds 2", "Yes"],
        ["ORD-1002", "F26", "No"]
    ]))

    const buf = XSLX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
        headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": 'attachment; filename="tms-template.xlsx"',
        }
    })
}


