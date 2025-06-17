import { base } from '@lark-base-open/js-sdk'

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

  // Ép kiểu an toàn qua `unknown` rồi mới về đúng kiểu
  const response = await table.getRecords({})
  const items = (response as unknown as { items?: { fields: Record<string, unknown> }[] }).items || []

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
