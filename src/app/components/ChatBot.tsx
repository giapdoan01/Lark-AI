"use client"
import { useEffect, useState } from "react"
import { getTableData, getTableDataAlternative, checkSDKStatus, debugTableAPI } from "../lib/base"
import { askAI } from "../lib/groqClient"

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
  const [debugMode, setDebugMode] = useState(false)

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

        // Debug API nếu cần
        if (debugMode) {
          await debugTableAPI(tableId)
        }

        // Thử phương pháp chính trước
        console.log("📥 Thử phương pháp chính...")
        let data
        try {
          data = await getTableData(tableId)
        } catch (mainError) {
          console.log("❌ Phương pháp chính thất bại, thử phương pháp thay thế...")
          data = await getTableDataAlternative(tableId)
        }

        console.log("✅ Dữ liệu từ bảng:", data)
        setTableData(data)
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
  }, [tableId, debugMode])

  const handleAskQuestion = async () => {
    if (!question.trim() || tableData.length === 0) return

    setIsAsking(true)
    try {
      const context = `Bạn là một AI assistant thông minh. Dưới đây là dữ liệu từ bảng &quot;${tableName}&quot; trong Lark Base:

${JSON.stringify(tableData, null, 2)}

Hãy phân tích dữ liệu này và trả lời câu hỏi của người dùng một cách chính xác và hữu ích. Trả lời bằng tiếng Việt.`

      const response = await askAI(context, question)
      setAnswer(response)
    } catch (err) {
      console.error("❌ Lỗi khi hỏi AI:", err)
      setAnswer("❌ Đã xảy ra lỗi khi xử lý câu hỏi. Vui lòng thử lại.")
    } finally {
      setIsAsking(false)
    }
  }

  if (loading) {
    return (
      <div>
        <div>🔄 Đang tải dữ liệu từ bảng &quot;{tableName}&quot;...</div>
        {sdkStatus && <div style={{ fontSize: "12px", color: "#666", marginTop: "10px" }}>{sdkStatus}</div>}
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <div style={{ color: "red", marginBottom: "10px" }}>❌ {error}</div>
        {sdkStatus && <div style={{ fontSize: "12px", color: "#666", marginBottom: "10px" }}>{sdkStatus}</div>}

        <details style={{ marginTop: "10px" }}>
          <summary style={{ cursor: "pointer", color: "#666" }}>🔍 Thông tin debug (click để xem)</summary>
          <div style={{ marginTop: "10px", fontSize: "12px", fontFamily: "monospace" }}>
            <div>Table ID: {tableId}</div>
            <div>Table Name: {tableName}</div>
            <div>SDK Status: {sdkStatus}</div>
            <div>Kiểm tra Console để xem log chi tiết</div>
            <label style={{ display: "block", marginTop: "10px" }}>
              <input type="checkbox" checked={debugMode} onChange={(e) => setDebugMode(e.target.checked)} /> Bật debug
              mode
            </label>
          </div>
        </details>

        <button onClick={() => window.location.reload()} style={{ marginTop: "10px" }}>
          🔄 Thử lại
        </button>
      </div>
    )
  }

  return (
    <div>
      <h2>📊 Bảng: {tableName}</h2>

      {sdkStatus && <div style={{ fontSize: "12px", color: "#666", marginBottom: "10px" }}>✅ {sdkStatus}</div>}

      <div style={{ marginBottom: "20px" }}>
        <h3>📋 Dữ liệu bảng ({tableData.length} bản ghi):</h3>
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
          {JSON.stringify(tableData, null, 2)}
        </pre>
      </div>

      <div>
        <h3>🤖 Hỏi AI về dữ liệu:</h3>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ví dụ: Tổng hợp dữ liệu này cho tôi, hoặc phân tích xu hướng..."
          rows={3}
          style={{ width: "100%", marginBottom: "10px" }}
        />
        <button onClick={handleAskQuestion} disabled={isAsking || !question.trim()}>
          {isAsking ? "🤔 Đang suy nghĩ..." : "🚀 Hỏi AI"}
        </button>

        {answer && (
          <div
            style={{
              marginTop: "20px",
              padding: "15px",
              backgroundColor: "#e8f5e8",
              borderRadius: "6px",
              border: "1px solid #4caf50",
            }}
          >
            <h4>💡 Câu trả lời từ AI:</h4>
            <div style={{ whiteSpace: "pre-wrap" }}>{answer}</div>
          </div>
        )}
      </div>
    </div>
  )
}
