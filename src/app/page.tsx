'use client'
import { useState } from 'react'
import TableSelector from './components/TableSelector'
import ChatBot from './components/ChatBot'

export default function Home() {
  const [tableId, setTableId] = useState<string | null>(null)

  return (
    <div>
      {!tableId && <TableSelector onSelect={setTableId} />}
      {tableId && <ChatBot tableId={tableId} />}
    </div>
  )
}
