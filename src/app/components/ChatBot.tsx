'use client'
import { useEffect, useState } from 'react'
import { getTableData } from '../lib/base'
import { askAI } from '@/ultis/groqClient'

export default function ChatBot({ tableId }: { tableId: string }) {
  const [chat, setChat] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const [context, setContext] = useState<string>('')

  useEffect(() => {
    const loadData = async () => {
      const { tableName, data } = await getTableData(tableId)
      const contextText = `Dữ liệu bảng "${tableName}":\n` + JSON.stringify(data, null, 2)
      setContext(contextText)
    }
    loadData()
  }, [tableId])

  const handleAsk = async () => {
    setLoading(true)
    const response = await askAI(context, input)
    setChat(prev => [...prev, `👤 ${input}`, `🤖 ${response}`])
    setInput('')
    setLoading(false)
  }

  return (
    <div>
      {chat.map((msg, idx) => (
        <p key={idx}>{msg}</p>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
        disabled={loading}
        placeholder="Hỏi về dữ liệu..."
      />
    </div>
  )
}
