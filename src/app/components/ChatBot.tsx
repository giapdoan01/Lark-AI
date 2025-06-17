'use client'
import { useEffect, useState } from 'react'
import { getTableData } from '../lib/base'

interface ChatBotProps {
  tableId: string
}

export default function ChatBot({ tableId }: ChatBotProps) {
  const [context, setContext] = useState('')

  useEffect(() => {
    const loadData = async () => {
      try {
        const { tableName, data } = await getTableData(tableId)
        console.log("📥 Dữ liệu từ bảng:", data)

        if (data.length === 0) {
          setContext(`⚠️ Bảng "${tableName}" không có dữ liệu.`)
        } else {
          setContext(`📊 Dữ liệu từ bảng "${tableName}":\n${JSON.stringify(data, null, 2)}`)
        }
      } catch (error) {
        console.error("❌ Lỗi khi lấy dữ liệu bảng:", error)
        setContext('❌ Đã xảy ra lỗi khi đọc dữ liệu từ bảng.')
      }
    }

    if (tableId) loadData()
  }, [tableId])

  return (
    <pre style={{ whiteSpace: 'pre-wrap', backgroundColor: '#f9f9f9', padding: '10px', borderRadius: '6px' }}>
      {context}
    </pre>
  )
}
