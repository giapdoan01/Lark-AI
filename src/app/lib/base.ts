import { base, bitable } from '@lark-base-open/js-sdk'

interface FieldMeta {
    id: string
    name: string
}

interface TableData {
    tableId: string
    tableName: string
    fields: FieldMeta[]
    data: Record<string, unknown>[]
}

export async function getTableData(tableId: string): Promise<{
    tableName: string
    data: Record<string, unknown>[]
}> {
    const base = await bitable.base.getCurrent()
    const table = await base.getTableById(tableId)
    const tableMeta = await table.getFieldMetaList()

    // ✅ Tìm view đầu tiên KHÔNG bị ẩn bản ghi
    const views = await table.getViewList()
    const targetView = views[0] // Bạn có thể cho chọn view trong giao diện nếu muốn

    const recordsRes = await targetView.getRecords()
    console.log("✅ Views:", views.map(v => v.name))
    console.log("✅ View đang dùng:", targetView.name)
    console.log("✅ Records raw:", recordsRes)

    // ✅ Nếu không có bản ghi, in ra log để debug
    if (recordsRes.records.length === 0) {
        console.warn('⚠️ Không có bản ghi nào được trả về từ view:', targetView.name)
    }

    const records = recordsRes.records.map(record => {
        const rowData: Record<string, unknown> = {}
        for (const field of tableMeta) {
            rowData[field.name] = record.fields[field.id]
        }
        return rowData
    })

    return {
        tableName: table.name,
        data: records,
    }
}
