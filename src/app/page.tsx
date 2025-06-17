"use client"
import { useState } from "react"
import TableSelector from "./components/TableSelector"
import ChatBot from "./components/ChatBot"

export default function Home() {
  const [selectedTable, setSelectedTable] = useState<{ id: string; name: string } | null>(null)

  return (
    <div className="container">
      <h1>🤖 AI Chatbot với Lark Base</h1>

      {!selectedTable && <TableSelector onSelect={(id, name) => setSelectedTable({ id, name })} />}

      {selectedTable && (
        <div>
          <button onClick={() => setSelectedTable(null)} style={{ marginBottom: "1rem" }}>
            ← Chọn bảng khác
          </button>
          <ChatBot tableId={selectedTable.id} tableName={selectedTable.name} />
        </div>
      )}
    </div>
  )
}
