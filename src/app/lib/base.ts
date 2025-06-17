import { base } from '@lark-base-open/js-sdk'

export const getTableData = async (tableId: string) => {
    const table = await base.getTable(tableId)
    const response = await table.getRecords({})
    const records = (response as any).items || []
    const fields = await table.getFieldMetaList()

    const data = records.map(record => {
        const row: Record<string, any> = {}
        for (const field of fields) {
            row[field.name] = record.fields[field.id]
        }
        return row
    })

    return {
        tableName: table.name,
        fields,
        data,
    }
}
