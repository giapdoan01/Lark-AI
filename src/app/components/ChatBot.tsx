'use client'
import { useEffect, useState } from 'react'
import TableSelector from './TableSelector'
import { getTableData } from '../lib/base'

export default function ChatBot() {
  const [tableId, setTableId] = useState<string | null>(null)
  const [tableName, setTableName] = useState<string>('')
  const [context, setContext] = useState('')

  useEffect(() => {
    if (!tableId) return

    const loadData = async () => {
      try {
        const { tableName, data } = await getTableData(tableId)
        console.log('📥 Dữ liệu từ bảng:', data)
        setTableName(tableName)

        if (data.length === 0) {
          setContext('⚠️ Bảng bạn chọn không có dữ liệu.')
        } else {
          setContext(`📊 Dữ liệu bảng "${tableName}":\n${JSON.stringify(data, null, 2)}`)
        }
      } catch (error) {
        console.error('❌ Lỗi khi lấy dữ liệu bảng:', error)
        setContext('❌ Đã xảy ra lỗi khi đọc dữ liệu từ bảng.')
      }
    }

    loadData()
  }, [tableId])

  return (
    <div>
      <TableSelector
        onSelect={(id, name) => {
          console.log('🟢 Bảng được chọn:', id)
          setTableId(id)
          setTableName(name)
        }}
      />
      <pre
        style={{
          whiteSpace: 'pre-wrap',
          backgroundColor: '#f9f9f9',
          padding: '10px',
          borderRadius: '6px',
        }}
      >
        {context}
      </pre>
    </div>
  )
}
