"use client"
import { useState } from "react"
import TableSelector from "./components/TableSelector"
import ChatBot from "./components/ChatBot"

export default function Home() {
  const [selectedTable, setSelectedTable] = useState<{ id: string; name: string } | null>(null)

  const handleTableSelect = (tableId: string, tableName: string) => {
    console.log(`📊 Selected table: ${tableName} (${tableId})`)
    setSelectedTable({ id: tableId, name: tableName })
  }

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <h1>🚀 Lark Base ChatBot với CSV Optimization</h1>
      <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#e8f4fd", borderRadius: "6px" }}>
        <h3>📊 CSV Data Pipeline Features:</h3>
        <ul style={{ margin: "10px 0", paddingLeft: "20px" }}>
          <li>
            🔄 <strong>CSV Format Conversion:</strong> Chuyển đổi JSON → CSV để giảm 30-50% tokens
          </li>
          <li>
            ⚡ <strong>Parallel Processing:</strong> 4 APIs optimize CSV chunks song song
          </li>
          <li>
            🤖 <strong>AI Analysis:</strong> API thứ 5 phân tích CSV data tổng hợp
          </li>
          <li>
            💰 <strong>Cost Optimization:</strong> Giảm chi phí API calls đáng kể
          </li>
          <li>
            📈 <strong>Better Performance:</strong> Xử lý nhanh hơn với large datasets
          </li>
        </ul>
      </div>

      {!selectedTable ? (
        <div>
          <TableSelector onSelect={handleTableSelect} />
          <div style={{ marginTop: "20px", padding: "15px", backgroundColor: "#f9f9f9", borderRadius: "6px" }}>
            <h4>🔧 Hướng dẫn sử dụng:</h4>
            <ol>
              <li>Chọn bảng dữ liệu từ dropdown</li>
              <li>Hệ thống sẽ tự động chạy CSV Data Preprocessing Pipeline</li>
              <li>Dữ liệu được optimize và sẵn sàng cho AI analysis</li>
              <li>Hỏi AI bất kỳ câu hỏi nào về dữ liệu</li>
            </ol>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: "20px" }}>
            <button
              onClick={() => setSelectedTable(null)}
              style={{
                padding: "8px 16px",
                backgroundColor: "#007acc",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              ← Chọn bảng khác
            </button>
          </div>
          <ChatBot tableId={selectedTable.id} tableName={selectedTable.name} />
        </div>
      )}

      <div style={{ marginTop: "40px", padding: "15px", backgroundColor: "#f0f8ff", borderRadius: "6px" }}>
        <h4>📊 CSV vs JSON Comparison:</h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "10px" }}>
          <div>
            <strong>🔴 JSON Format (Cũ):</strong>
            <ul style={{ fontSize: "12px", marginTop: "5px" }}>
              <li>Nhiều metadata không cần thiết</li>
              <li>Nested objects phức tạp</li>
              <li>Token usage cao</li>
              <li>Chi phí API cao</li>
            </ul>
          </div>
          <div>
            <strong>🟢 CSV Format (Mới):</strong>
            <ul style={{ fontSize: "12px", marginTop: "5px" }}>
              <li>Cấu trúc đơn giản, gọn nhẹ</li>
              <li>Dữ liệu tabular tối ưu</li>
              <li>Giảm 30-50% tokens</li>
              <li>Tiết kiệm chi phí đáng kể</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
