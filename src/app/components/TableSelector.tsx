'use client'
import { useEffect, useState } from 'react'
import { base } from '@lark-base-open/js-sdk'

interface TableMeta {
  id: string
  name: string
}

export default function TableSelector({
  onSelect,
}: {
  onSelect: (tableId: string, tableName: string) => void
}) {
  const [tables, setTables] = useState<TableMeta[]>([])

  useEffect(() => {
    base.getTableMetaList().then(setTables)
  }, [])

  return (
    <div>
      <label>Chọn bảng dữ liệu:</label>
      <select
        onChange={(e) => {
          const selectedId = e.target.value
          const selectedTable = tables.find((t) => t.id === selectedId)
          if (selectedTable) {
            onSelect(selectedTable.id, selectedTable.name)
          }
        }}
      >
        <option value="">-- Chọn bảng --</option>
        {tables.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  )
}
