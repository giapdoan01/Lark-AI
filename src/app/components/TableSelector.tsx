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

  useEffect(() => {
    const loadTables = async () => {
      try {
        setLoading(true)

        // Check SDK
        const status = await checkSDKStatus()
        if (status.status === "error") {
          throw new Error(status.message)
        }

        // Get tables
        const tableList = await base.getTableMetaList()
        console.log("📋 Found tables:", tableList.length)

        setTables(tableList)
        setError(null)
      } catch (err) {
        console.error("❌ Error loading tables:", err)
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setLoading(false)
      }
    }

    loadTables()
  }, [])

  if (loading) {
    return <div>🔄 Loading tables...</div>
  }

  if (error) {
    return (
      <div>
        <div style={{ color: "red", marginBottom: "10px" }}>❌ {error}</div>
        <button onClick={() => window.location.reload()}>🔄 Retry</button>
      </div>
    )
  }

  return (
    <div>
      <label htmlFor="table-select">📊 Select table:</label>
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
        <option value="">-- Select table ({tables.length} available) --</option>
        {tables.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  )
}
