import { base, IGetRecordsResponse } from '@lark-base-open/js-sdk'

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

export const getTableData = async (tableId: string): Promise<TableData> => {
  const table = await base.getTable(tableId)
  const response = await table.getRecords({})

  // Ép kiểu tạm qua unknown → rồi ép lại có kiểm tra "items"
  const maybeWithItems = response as unknown as { items?: any[] }

  const items = Array.isArray(maybeWithItems.items) ? maybeWithItems.items : []

  const fields = await table.getFieldMetaList()
  const meta = await table.getMeta()

  const data = items.map(record => {
    const row: Record<string, unknown> = {}
    for (const field of fields) {
      row[field.name] = record.fields[field.id]
    }
    return row
  })

  return {
    tableId,
    tableName: meta.name,
    fields,
    data,
  }
}
