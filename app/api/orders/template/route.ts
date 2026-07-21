import { NextResponse } from "next/server";
import * as XSLX from "xlsx"

export async function GET() {
    const wb = XSLX.utils.book_new();
    XSLX.utils.book_append_sheet(wb, XSLX.utils.aoa_to_sheet([
        ["Order ID", "Customer Name", "Phone Number"],
        ["ORD-1001", "Abishek Newar", "9876549876"],
        ["ORD-1002", "Siddhart Sharma", "9878654632"]
    ]), "Orders")

    XSLX.utils.book_append_sheet(wb, XSLX.utils.aoa_to_sheet([
        ["Order ID", "Product Name", "SKU Code", "SKU Description", "Bag Number"],
        ["ORD-1001", "S26 ultra", "SKU-001", "Galaxy S26 ultra 256GB", ""],
        ["ORD-1002", "earbuds 2", "SKU-002", "Buds 2 Pro Black", "12"],
        ["ORD-1002", "F26", "SKU-003", "Galaxy F26 128GB", ""]
    ]), "Items")

    const buf = XSLX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
        headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": 'attachment; filename="tms-template.xlsx"',
        }
    })
}
