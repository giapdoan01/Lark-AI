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
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f8f9fa",
        padding: "20px",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "30px",
            padding: "20px",
            backgroundColor: "white",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <h1 style={{ margin: "0 0 10px 0", color: "#333", fontSize: "28px" }}>🚀 Lark Base AI ChatBot</h1>
          <p style={{ margin: 0, color: "#666", fontSize: "16px" }}>
            Phân tích dữ liệu với Llama 4 Scout - Single Request Strategy
          </p>
        </div>

        {/* Features Card */}
        <div
          style={{
            marginBottom: "30px",
            padding: "20px",
            backgroundColor: "white",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <h3 style={{ margin: "0 0 15px 0", color: "#333" }}>✨ Tính năng mới với Llama 4 Scout</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "15px",
            }}
          >
            <div style={{ padding: "15px", backgroundColor: "#e8f4fd", borderRadius: "8px" }}>
              <div style={{ fontWeight: "600", color: "#007acc", marginBottom: "5px" }}>🎲 Random API Selection</div>
              <div style={{ fontSize: "14px", color: "#666" }}>Chọn ngẫu nhiên 1 API working từ pool available</div>
            </div>
            <div style={{ padding: "15px", backgroundColor: "#e8f5e8", borderRadius: "8px" }}>
              <div style={{ fontWeight: "600", color: "#4caf50", marginBottom: "5px" }}>📄 Single Request</div>
              <div style={{ fontSize: "14px", color: "#666" }}>Không chia chunks - gửi toàn bộ CSV trong 1 lần</div>
            </div>
            <div style={{ padding: "15px", backgroundColor: "#fff3cd", borderRadius: "8px" }}>
              <div style={{ fontWeight: "600", color: "#856404", marginBottom: "5px" }}>🤖 Llama 4 Scout</div>
              <div style={{ fontSize: "14px", color: "#666" }}>
                Model mới: meta-llama/llama-4-scout-17b-16e-instruct
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {!selectedTable ? (
          <div
            style={{
              padding: "30px",
              backgroundColor: "white",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              textAlign: "center",
            }}
          >
            <TableSelector onSelect={handleTableSelect} />

            <div style={{ marginTop: "30px", padding: "20px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
              <h4 style={{ margin: "0 0 15px 0", color: "#333" }}>🔧 Single Request Strategy</h4>
              <div style={{ textAlign: "left", maxWidth: "500px", margin: "0 auto" }}>
                <div style={{ marginBottom: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <span
                    style={{
                      width: "24px",
                      height: "24px",
                      backgroundColor: "#007acc",
                      color: "white",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}
                  >
                    1
                  </span>
                  <span>Chọn bảng dữ liệu từ dropdown</span>
                </div>
                <div style={{ marginBottom: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <span
                    style={{
                      width: "24px",
                      height: "24px",
                      backgroundColor: "#007acc",
                      color: "white",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}
                  >
                    2
                  </span>
                  <span>Hệ thống chọn ngẫu nhiên 1 API working</span>
                </div>
                <div style={{ marginBottom: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <span
                    style={{
                      width: "24px",
                      height: "24px",
                      backgroundColor: "#007acc",
                      color: "white",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}
                  >
                    3
                  </span>
                  <span>Gửi toàn bộ CSV trong 1 request duy nhất</span>
                </div>
                <div style={{ marginBottom: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <span
                    style={{
                      width: "24px",
                      height: "24px",
                      backgroundColor: "#007acc",
                      color: "white",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}
                  >
                    4
                  </span>
                  <span>Nhận phân tích toàn diện từ Llama 4 Scout</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: "20px", textAlign: "center" }}>
              <button
                onClick={() => setSelectedTable(null)}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                ← Chọn bảng khác
              </button>
            </div>
            <ChatBot tableId={selectedTable.id} tableName={selectedTable.name} />
          </div>
        )}
      </div>
    </div>
  )
}
