'use client'
import { useEffect, useState } from 'react'
import TableSelector from './TableSelector'
import { getTableData } from '../lib/base'

export default function ChatBot() {
  const [tableId, setTableId] = useState<string | null>(null)
  const [context, setContext] = useState('')
  const [tableName, setTableName] = useState('')

  useEffect(() => {
    if (!tableId) return

    const loadData = async () => {
      try {
        const { tableName, data } = await getTableData(tableId)
        setTableName(tableName)
        console.log("📥 Dữ liệu từ bảng:", data)

        if (data.length === 0) {
          setContext(`⚠️ Bảng "${tableName}" bạn chọn không có dữ liệu.`)
        } else {
          setContext(`📊 Dữ liệu từ bảng "${tableName}":\n${JSON.stringify(data, null, 2)}`)
        }
      } catch (error) {
        console.error("❌ Lỗi khi lấy dữ liệu bảng:", error)
        setContext('❌ Đã xảy ra lỗi khi đọc dữ liệu từ bảng.')
      }
    }

    loadData()
  }, [tableId])

  return (
    <div>
      <TableSelector onSelect={(id) => {
        console.log("🟢 Bảng được chọn:", id)
        setTableId(id)
      }} />
      <pre style={{
        whiteSpace: 'pre-wrap',
        backgroundColor: '#f9f9f9',
        padding: '10px',
        borderRadius: '6px'
      }}>
        {context}
      </pre>
    </div>
  )
}
