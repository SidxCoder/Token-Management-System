import * as XLSX from "xlsx";

export type UploadError = { sheet: string; row: number; message: string };

export type ParsedItem = {
  product_name: string;
  sku_code: string;
  sku_description: string;
  bag_number: number | null;
};

export type ParsedOrder = {
  order_id: string;
  customer_name: string;
  phone: string;
  items: ParsedItem[];
};

const ORDER_HEADERS = ["Order ID", "Customer Name", "Phone Number"];
const ITEM_HEADERS = ["Order ID", "Product Name", "SKU Code", "SKU Description", "Bag Number"];

type Row = Record<string, unknown>;
const cell = (r: Row, key: string) => String(r[key] ?? "").trim();

function checkHeaders(sheet: XLSX.WorkSheet, expected: string[], sheetName: string, errors: UploadError[]) {
  const raw = (XLSX.utils.sheet_to_json(sheet, { header: 1 })[0] as unknown[]) ?? [];
  const found = raw.map((h) => String(h ?? "").trim());
  expected.forEach((h, i) => {
    if (found[i] !== h) {
      errors.push({
        sheet: sheetName,
        row: 1,
        message: `Expected header "${h}" in column ${i + 1}, found "${found[i] ?? ""}"`,
      });
    }
  });
}

export function parseOrdersWorkbook(buf: Buffer): { errors: UploadError[]; orders: ParsedOrder[] } {
  const errors: UploadError[] = [];

  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buf, { type: "buffer" });
  } catch {
    return { errors: [{ sheet: "-", row: 0, message: "File is not a readable .xlsx workbook" }], orders: [] };
  }

  for (const name of ["Orders", "Items"]) {
    if (!wb.SheetNames.includes(name)) {
      errors.push({ sheet: name, row: 0, message: `Sheet "${name}" is missing` });
    }
  }
  if (errors.length) return { errors, orders: [] };

  const ordersSheet = wb.Sheets["Orders"];
  const itemsSheet = wb.Sheets["Items"];

  checkHeaders(ordersSheet, ORDER_HEADERS, "Orders", errors);
  checkHeaders(itemsSheet, ITEM_HEADERS, "Items", errors);
  // Wrong headers make every cell lookup miss; per-cell errors would be noise.
  if (errors.length) return { errors, orders: [] };

  const orderRows = XLSX.utils.sheet_to_json<Row>(ordersSheet, { defval: "" });
  const orders = new Map<string, ParsedOrder & { rowNum: number }>();

  orderRows.forEach((r, i) => {
    const rowNum = i + 2; // +1 header row, +1 one-indexing
    const order_id = cell(r, "Order ID");
    const customer_name = cell(r, "Customer Name");
    const phone = cell(r, "Phone Number");
    let ok = true;

    if (!order_id) {
      errors.push({ sheet: "Orders", row: rowNum, message: "Order ID is empty" });
      ok = false;
    }
    if (!customer_name) {
      errors.push({ sheet: "Orders", row: rowNum, message: "Customer Name is empty" });
      ok = false;
    }
    if (!phone) {
      errors.push({ sheet: "Orders", row: rowNum, message: "Phone Number is empty" });
      ok = false;
    } else if (!/^\d{7,15}$/.test(phone)) {
      errors.push({ sheet: "Orders", row: rowNum, message: `Phone Number must be 7-15 digits, got "${phone}"` });
      ok = false;
    }
    if (order_id && orders.has(order_id)) {
      errors.push({ sheet: "Orders", row: rowNum, message: `Duplicate Order ID "${order_id}" in sheet` });
      ok = false;
    }

    if (ok) orders.set(order_id, { order_id, customer_name, phone, items: [], rowNum });
  });

  const itemRows = XLSX.utils.sheet_to_json<Row>(itemsSheet, { defval: "" });
  // bag number -> owning order_id: a bag may repeat within one order, never across two
  const bagOwner = new Map<number, string>();

  itemRows.forEach((r, i) => {
    const rowNum = i + 2;
    const order_id = cell(r, "Order ID");
    const product_name = cell(r, "Product Name");
    const sku_code = cell(r, "SKU Code");
    const sku_description = cell(r, "SKU Description");
    const bagRaw = cell(r, "Bag Number");
    let ok = true;

    if (!order_id) {
      errors.push({ sheet: "Items", row: rowNum, message: "Order ID is empty" });
      ok = false;
    }
    if (!product_name) {
      errors.push({ sheet: "Items", row: rowNum, message: "Product Name is empty" });
      ok = false;
    }
    if (!sku_code) {
      errors.push({ sheet: "Items", row: rowNum, message: "SKU Code is empty" });
      ok = false;
    }
    if (!sku_description) {
      errors.push({ sheet: "Items", row: rowNum, message: "SKU Description is empty" });
      ok = false;
    }

    let bag_number: number | null = null;
    if (bagRaw !== "") {
      if (!/^\d+$/.test(bagRaw)) {
        errors.push({ sheet: "Items", row: rowNum, message: `Bag Number must be a whole number, got "${bagRaw}"` });
        ok = false;
      } else {
        bag_number = Number(bagRaw);
      }
    }

    if (!ok) return;

    if (bag_number !== null) {
      const owner = bagOwner.get(bag_number);
      if (owner && owner !== order_id) {
        errors.push({
          sheet: "Items",
          row: rowNum,
          message: `Bag Number ${bag_number} is already used by order "${owner}" - a bag cannot span two orders`,
        });
        return;
      }
      bagOwner.set(bag_number, order_id);
    }

    const parent = orders.get(order_id);
    if (!parent) {
      errors.push({ sheet: "Items", row: rowNum, message: `Order ID "${order_id}" does not exist in the Orders sheet` });
      return;
    }

    // SKU codes may repeat — the same product can appear more than once on an
    // order (and across orders), so no per-order SKU uniqueness check.
    parent.items.push({ product_name, sku_code, sku_description, bag_number });
  });

  for (const o of orders.values()) {
    if (o.items.length === 0) {
      errors.push({ sheet: "Orders", row: o.rowNum, message: `Order "${o.order_id}" has no items in the Items sheet` });
    }
  }

  return { errors, orders: [...orders.values()].map(({ rowNum: _rowNum, ...o }) => o) };
}
