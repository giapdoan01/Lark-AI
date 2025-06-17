"use client"
import { useEffect, useState } from "react"
import { base } from "@lark-base-open/js-sdk"

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadTables = async () => {
      try {
        const tableList = await base.getTableMetaList()
        setTables(tableList)
        setError(null)
      } catch (err) {
        console.error("❌ Lỗi khi lấy danh sách bảng:", err)
        setError("Không thể lấy danh sách bảng. Vui lòng kiểm tra kết nối Lark Base.")
      } finally {
        setLoading(false)
      }
    }

    loadTables()
  }, [])

  if (loading) {
    return <div>🔄 Đang tải danh sách bảng...</div>
  }

  if (error) {
    return <div style={{ color: "red" }}>❌ {error}</div>
  }

  return (
    <div>
      <label htmlFor="table-select">📊 Chọn bảng dữ liệu:</label>
      <select
        id="table-select"
        onChange={(e) => {
          const selectedId = e.target.value
          const selectedTable = tables.find((t) => t.id === selectedId)
          if (selectedTable) {
            onSelect(selectedTable.id, selectedTable.name)
          }
        }}
        style={{ marginLeft: "10px", padding: "5px" }}
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
