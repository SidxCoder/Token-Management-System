export type UploadError = { sheet: string; row: number; message: string};

export type ParsedOrder = {
    order_id: string,
    custoemr_name: string,
    phone: string,
    bag_number: number | null,
    items: {
        product_name: string,
        packed: boolean
    }[]
}