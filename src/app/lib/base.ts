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
  tableId: string
  fields: FieldMeta[]
  data: Record<string, unknown>[]
}

export const getTableData = async (tableId: string): Promise<TableData> => {
  const table = await base.getTable(tableId)

  // Kiểm tra nếu không có bảng
  if (!table) throw new Error(`Không tìm thấy bảng với ID: ${tableId}`)

  const fields: FieldMeta[] = await table.getFieldMetaList()
  const response = await table.getRecords({})
  const records = (response as unknown as ResponseWithItems).items || []

  const data = records.map((record) => {
    const row: Record<string, unknown> = {}
    for (const field of fields) {
      row[field.name] = record.fields[field.id]
    }
    return row
  })

  return {
    tableId, // dùng tableId thay vì table.name (vì `table.name` không có trong SDK)
    fields,
    data,
  }
}
