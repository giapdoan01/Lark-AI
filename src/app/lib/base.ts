import { base } from '@lark-base-open/js-sdk'

interface FieldMeta {
  id: string
  name: string
}

interface RecordItem {
  recordId: string
  fields: Record<string, unknown>
}

interface TableData {
  tableName: string
  fields: FieldMeta[]
  data: Record<string, unknown>[]
}

export const getTableData = async (tableId: string): Promise<TableData> => {
  const table = await base.getTable(tableId)
  const tableMeta = await table.getMeta() // lấy tên bảng
  const fields = await table.getFieldMetaList()
  const response = await table.getRecords({})
  const records: RecordItem[] = (response as any).items || []

  const data = records.map(record => {
    const row: Record<string, unknown> = {}
    for (const field of fields) {
      row[field.name] = record.fields[field.id]
    }
    return row
  })

  return {
    tableName: tableMeta.name,
    fields,
    data,
  }
}
