"use client"
import { useEffect, useState } from "react"
import { getTableData, checkSDKStatus, debugTableStructure } from "../lib/base"
import { askAI, testGroqAPI } from "../lib/groqClient"

interface ChatBotProps {
  tableId: string
  tableName: string
}

export default function ChatBot({ tableId, tableName }: ChatBotProps) {
  const [tableData, setTableData] = useState<Array<{ recordId: string; fields: Record<string, unknown> }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [isAsking, setIsAsking] = useState(false)
  const [sdkStatus, setSdkStatus] = useState<string>("")
  const [debugInfo, setDebugInfo] = useState<string>("")
  const [apiStatus, setApiStatus] = useState<string>("")

  const runDebug = async () => {
    console.log("🔍 Chạy debug...")
    await debugTableStructure(tableId)
    setDebugInfo("Debug completed - check console for details")
  }

  const testAPI = async () => {
    console.log("🧪 Testing API...")
    const result = await testGroqAPI()
    setApiStatus(`API Test: ${result.success ? "✅" : "❌"} ${result.message}`)
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Kiểm tra SDK trước
        console.log("🔍 Kiểm tra SDK status...")
        const status = await checkSDKStatus()
        setSdkStatus(`SDK Status: ${status.status} - ${status.message}`)

        if (status.status === "error") {
          throw new Error(status.message)
        }

        // Test API
        await testAPI()

        // Lấy dữ liệu bảng
        console.log("📥 Bắt đầu lấy dữ liệu bảng...")
        const data = await getTableData(tableId)
        console.log("✅ Kết quả cuối cùng:", data)

        setTableData(data)

        if (data.length === 0) {
          setError("Bảng không có dữ liệu hoặc không thể đọc được records. Hãy thử debug để xem chi tiết.")
        }
      } catch (err) {
        console.error("❌ Lỗi khi lấy dữ liệu bảng:", err)
        const errorMessage = err instanceof Error ? err.message : String(err)
        setError(`Lỗi: ${errorMessage}`)
      } finally {
        setLoading(false)
      }
    }

    if (tableId) {
      loadData()
    }
  }, [tableId])

  const handleAskQuestion = async () => {
    if (!question.trim() || tableData.length === 0) return

    setIsAsking(true)
    setAnswer("") // Clear previous answer

    try {
      console.log("🤖 Bắt đầu xử lý câu hỏi...")

      // Tạo context với dữ liệu rút gọn nếu cần
      const dataPreview = tableData.slice(0, 5) // Chỉ lấy 5 records đầu tiên
      const context = `Bạn là một AI assistant thông minh. Dưới đây là dữ liệu từ bảng "${tableName}" trong Lark Base:

${JSON.stringify(dataPreview, null, 2)}

${tableData.length > 5 ? `\n(Hiển thị 5/${tableData.length} records đầu tiên)` : ""}

Hãy phân tích dữ liệu này và trả lời câu hỏi của người dùng một cách chính xác và hữu ích. Trả lời bằng tiếng Việt.`

      console.log("📝 Context được tạo, độ dài:", context.length)

      const response = await askAI(context, question)
      setAnswer(response)
      console.log("✅ Đã nhận được câu trả lời từ AI")
    } catch (err) {
      console.error("❌ Lỗi khi hỏi AI:", err)
      const errorMessage = err instanceof Error ? err.message : String(err)
      setAnswer(`❌ Lỗi khi xử lý câu hỏi: ${errorMessage}`)
    } finally {
      setIsAsking(false)
    }
  }

  if (loading) {
    return (
      <div>
        <div>🔄 Đang tải dữ liệu từ bảng &quot;{tableName}&quot;...</div>
        {sdkStatus && <div style={{ fontSize: "12px", color: "#666", marginTop: "10px" }}>{sdkStatus}</div>}
        {apiStatus && <div style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>{apiStatus}</div>}
      </div>
    )
  }

  return (
    <div>
      <h2>📊 Bảng: {tableName}</h2>

      <div style={{ marginBottom: "15px", fontSize: "12px", color: "#666" }}>
        {sdkStatus && <div>✅ {sdkStatus}</div>}
        {apiStatus && <div>{apiStatus}</div>}
      </div>

      {error && (
        <div
          style={{
            color: "red",
            marginBottom: "20px",
            padding: "10px",
            backgroundColor: "#ffe6e6",
            borderRadius: "6px",
          }}
        >
          ❌ {error}
          <div style={{ marginTop: "10px" }}>
            <button onClick={runDebug} style={{ marginRight: "10px", fontSize: "12px" }}>
              🔍 Chạy Debug
            </button>
            <button onClick={testAPI} style={{ marginRight: "10px", fontSize: "12px" }}>
              🧪 Test API
            </button>
            <button onClick={() => window.location.reload()} style={{ fontSize: "12px" }}>
              🔄 Thử lại
            </button>
          </div>
          {debugInfo && <div style={{ marginTop: "10px", fontSize: "12px", color: "#666" }}>{debugInfo}</div>}
        </div>
      )}

      <div style={{ marginBottom: "20px" }}>
        <h3>📋 Dữ liệu bảng ({tableData.length} bản ghi):</h3>
        {tableData.length === 0 ? (
          <div style={{ padding: "20px", backgroundColor: "#f9f9f9", borderRadius: "6px", textAlign: "center" }}>
            <p>⚠️ Không có dữ liệu để hiển thị</p>
            <p style={{ fontSize: "12px", color: "#666" }}>Có thể bảng trống hoặc có vấn đề với quyền truy cập</p>
            <button onClick={runDebug} style={{ fontSize: "12px" }}>
              🔍 Debug Table Structure
            </button>
          </div>
        ) : (
          <pre
            style={{
              whiteSpace: "pre-wrap",
              backgroundColor: "#f9f9f9",
              padding: "10px",
              borderRadius: "6px",
              maxHeight: "300px",
              overflow: "auto",
              fontSize: "12px",
            }}
          >
            {JSON.stringify(tableData.slice(0, 3), null, 2)}
            {tableData.length > 3 && `\n\n... và ${tableData.length - 3} records khác`}
          </pre>
        )}
      </div>

      {tableData.length > 0 && (
        <div>
          <h3>🤖 Hỏi AI về dữ liệu:</h3>
          <div style={{ marginBottom: "10px", fontSize: "12px", color: "#666" }}>
            💡 Mẹo: Hãy hỏi cụ thể như &quot;Tổng hợp dữ liệu&quot;, &quot;Phân tích xu hướng&quot;, &quot;Thống kê số
            liệu&quot;
          </div>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ví dụ: Tổng hợp dữ liệu này cho tôi, hoặc phân tích xu hướng..."
            rows={3}
            style={{ width: "100%", marginBottom: "10px" }}
          />
          <div style={{ marginBottom: "10px" }}>
            <button onClick={handleAskQuestion} disabled={isAsking || !question.trim()}>
              {isAsking ? "🤔 Đang suy nghĩ..." : "🚀 Hỏi AI"}
            </button>
            <button onClick={testAPI} style={{ marginLeft: "10px", fontSize: "12px" }}>
              🧪 Test API
            </button>
          </div>

          {answer && (
            <div
              style={{
                marginTop: "20px",
                padding: "15px",
                backgroundColor: answer.includes("❌") ? "#ffe6e6" : "#e8f5e8",
                borderRadius: "6px",
                border: `1px solid ${answer.includes("❌") ? "#ff4444" : "#4caf50"}`,
              }}
            >
              <h4>💡 Câu trả lời từ AI:</h4>
              <div style={{ whiteSpace: "pre-wrap" }}>{answer}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
