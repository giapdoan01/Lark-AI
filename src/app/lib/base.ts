import { base } from '@lark-base-open/js-sdk'

interface FieldMeta {
    id: string
    name: string
}

interface RecordItem {
    recordId: string
    fields: Record<string, unknown>
}

interface ResponseWithItems {
    items: RecordItem[]
}

interface TableData {
    tableName: string
    fields: FieldMeta[]
    data: Record<string, unknown>[]
}

export const getTableData = async (tableId: string): Promise<TableData> => {
    const table = await base.getTable(tableId)

    const response = await table.getRecords({})
    const records = (response as unknown as ResponseWithItems).items || []

    const fields: FieldMeta[] = await table.getFieldMetaList()

    const data = records.map(record => {
        const row: Record<string, unknown> = {}
        for (const field of fields) {
            row[field.name] = record.fields[field.id]
        }
        return row
    })

    return {
        tableName: (table as any).name, // ép kiểu tránh lỗi TypeScript
        fields,
        data,
    }
}
