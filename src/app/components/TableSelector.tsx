"use client"
import { useEffect, useState } from "react"
import { base } from "@lark-base-open/js-sdk"
import { checkSDKStatus } from "../lib/base"

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
  const [sdkStatus, setSdkStatus] = useState<string>("")

  useEffect(() => {
    const loadTables = async () => {
      try {
        setLoading(true)

        // Kiểm tra SDK trước
        const status = await checkSDKStatus()
        setSdkStatus(`${status.status}: ${status.message}`)

        if (status.status === "error") {
          throw new Error(status.message)
        }

        // Lấy danh sách bảng
        const tableList = await base.getTableMetaList()
        console.log("📋 Danh sách bảng:", tableList)

        setTables(tableList)
        setError(null)
      } catch (err) {
        console.error("❌ Lỗi khi lấy danh sách bảng:", err)
        const errorMessage = err instanceof Error ? err.message : String(err)
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    loadTables()
  }, [])

  if (loading) {
    return (
      <div>
        <div>🔄 Đang tải danh sách bảng...</div>
        {sdkStatus && <div style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>{sdkStatus}</div>}
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <div style={{ color: "red", marginBottom: "10px" }}>❌ {error}</div>
        <div style={{ fontSize: "12px", color: "#666", marginBottom: "10px" }}>SDK Status: {sdkStatus}</div>
        <div style={{ fontSize: "14px", marginBottom: "10px" }}>
          <strong>Các bước khắc phục:</strong>
          <ol>
            <li>Đảm bảo ứng dụng đang chạy trong Lark Base</li>
            <li>Kiểm tra quyền truy cập bảng</li>
            <li>Thử refresh trang</li>
          </ol>
        </div>
        <button onClick={() => window.location.reload()}>🔄 Thử lại</button>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: "10px" }}>
        <div style={{ fontSize: "12px", color: "#666" }}>✅ {sdkStatus}</div>
      </div>

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
        <option value="">-- Chọn bảng ({tables.length} bảng có sẵn) --</option>
        {tables.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  )
}
