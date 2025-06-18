"use client"
import { useEffect, useState } from "react"
import {
  getTableData,
  getTableStats,
  testTableDataSample,
  checkSDKStatus,
  debugTableStructure,
  testTableAccess,
} from "../lib/base"
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
  const [workingModel, setWorkingModel] = useState<string>("")
  const [autoAnalysis, setAutoAnalysis] = useState<string>("")
  const [isAutoAnalyzing, setIsAutoAnalyzing] = useState(false)
  const [tableStats, setTableStats] = useState<any>(null)
  const [loadingProgress, setLoadingProgress] = useState<string>("")

  const runDebug = async () => {
    console.log("🔍 Chạy detailed debug...")
    await debugTableStructure(tableId)
    setDebugInfo("Detailed debug completed - check console for comprehensive analysis")
  }

  const testAPI = async () => {
    console.log("🧪 Testing API...")
    const result = await testGroqAPI()
    setApiStatus(`API Test: ${result.success ? "✅" : "❌"} ${result.message}`)
    if (result.workingModel) {
      setWorkingModel(result.workingModel)
    }
  }

  const testTableAccessFunc = async () => {
    console.log("🧪 Testing table access...")
    const result = await testTableAccess(tableId)
    setDebugInfo(`Table access test: ${result ? "✅ Success" : "❌ Failed"} - Check console for details`)
  }

  const testSample = async () => {
    console.log("🧪 Testing with sample data...")
    try {
      const sampleData = await testTableDataSample(tableId, 5)
      setDebugInfo(`Sample test: ✅ Got ${sampleData.length} records - Check console for details`)
    } catch (err) {
      setDebugInfo(`Sample test: ❌ Failed - ${err}`)
    }
  }

  const loadAllData = async () => {
    console.log("📥 Loading ALL data...")
    setLoading(true)
    setLoadingProgress("Đang lấy tất cả dữ liệu...")

    try {
      const data = await getTableData(tableId)
      setTableData(data)
      setLoadingProgress("")

      if (data.length > 0) {
        await performAutoAnalysis(data)
      }
    } catch (err) {
      console.error("❌ Error loading all data:", err)
      setError(`Lỗi khi lấy tất cả dữ liệu: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  // Function để AI tự động phân tích dữ liệu khi load xong
  const performAutoAnalysis = async (data: Array<{ recordId: string; fields: Record<string, unknown> }>) => {
    if (data.length === 0) return

    // Kiểm tra xem có dữ liệu thực không
    const hasRealData = data.some((record) =>
      Object.values(record.fields).some((value) => value !== null && value !== undefined && value !== ""),
    )

    if (!hasRealData) {
      setAutoAnalysis("⚠️ Dữ liệu chỉ có recordId mà không có thông tin chi tiết fields. Cần debug để khắc phục.")
      return
    }

    setIsAutoAnalyzing(true)
    try {
      console.log("🤖 Bắt đầu phân tích tự động...")

      const context = `Bạn là một AI assistant chuyên phân tích dữ liệu. Dưới đây là TOÀN BỘ dữ liệu từ bảng "${tableName}" trong Lark Base (${data.length} records):

${JSON.stringify(data, null, 2)}

Hãy phân tích và tóm tắt dữ liệu này một cách chi tiết, bao gồm:
1. Tổng quan về dữ liệu (số lượng records, các trường dữ liệu)
2. Phân tích nội dung chính
3. Các thống kê quan trọng
4. Nhận xét và đánh giá

Trả lời bằng tiếng Việt một cách chi tiết và dễ hiểu.`

      const analysis = await askAI(context, "Hãy phân tích toàn bộ dữ liệu này cho tôi.")
      setAutoAnalysis(analysis)
      console.log("✅ Hoàn thành phân tích tự động")
    } catch (err) {
      console.error("❌ Lỗi khi phân tích tự động:", err)
      setAutoAnalysis("❌ Không thể thực hiện phân tích tự động. Vui lòng thử hỏi AI thủ công.")
    } finally {
      setIsAutoAnalyzing(false)
    }
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

        // Lấy thống kê bảng trước
        setLoadingProgress("Đang lấy thống kê bảng...")
        const stats = await getTableStats(tableId)
        setTableStats(stats)
        console.log("📊 Table stats:", stats)

        // Lấy TẤT CẢ dữ liệu bảng
        setLoadingProgress(`Đang lấy tất cả ${stats.totalRecords} records...`)
        console.log("📥 Bắt đầu lấy TẤT CẢ dữ liệu bảng...")
        const data = await getTableData(tableId)
        console.log("✅ Kết quả cuối cùng:", data)

        setTableData(data)

        if (data.length === 0) {
          setError("Bảng không có dữ liệu hoặc không thể đọc được records. Hãy thử debug để xem chi tiết.")
        } else {
          // Kiểm tra xem có dữ liệu thực không
          const hasRealData = data.some((record) =>
            Object.values(record.fields).some((value) => value !== null && value !== undefined && value !== ""),
          )

          if (hasRealData) {
            // Tự động phân tích dữ liệu khi load xong
            console.log("🚀 Bắt đầu phân tích tự động...")
            setLoadingProgress("Đang phân tích dữ liệu bằng AI...")
            await performAutoAnalysis(data)
          } else {
            setError("Đã lấy được records nhưng không có thông tin chi tiết fields. Vui lòng chạy debug để khắc phục.")
          }
        }
      } catch (err) {
        console.error("❌ Lỗi khi lấy dữ liệu bảng:", err)
        const errorMessage = err instanceof Error ? err.message : String(err)
        setError(`Lỗi: ${errorMessage}`)
      } finally {
        setLoading(false)
        setLoadingProgress("")
      }
    }

    if (tableId) {
      loadData()
    }
  }, [tableId, tableName])

  const handleAskQuestion = async () => {
    if (!question.trim() || tableData.length === 0) return

    setIsAsking(true)
    setAnswer("") // Clear previous answer

    try {
      console.log("🤖 Bắt đầu xử lý câu hỏi...")

      // Sử dụng toàn bộ dữ liệu cho context
      const context = `Bạn là một AI assistant thông minh. Dưới đây là TOÀN BỘ dữ liệu từ bảng "${tableName}" trong Lark Base:

${JSON.stringify(tableData, null, 2)}

Tổng cộng có ${tableData.length} records trong bảng.

Hãy phân tích dữ liệu này và trả lời câu hỏi của người dùng một cách chính xác và hữu ích. Trả lời bằng tiếng Việt.`

      console.log("📝 Context được tạo với toàn bộ dữ liệu, độ dài:", context.length)

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

  const refreshAnalysis = async () => {
    if (tableData.length > 0) {
      await performAutoAnalysis(tableData)
    }
  }

  if (loading) {
    return (
      <div>
        <div>🔄 Đang tải dữ liệu từ bảng &quot;{tableName}&quot;...</div>
        {tableStats && (
          <div style={{ fontSize: "12px", color: "#666", marginTop: "10px" }}>
            📊 Bảng có {tableStats.totalRecords} records và {tableStats.totalFields} fields
          </div>
        )}
        {loadingProgress && (
          <div style={{ fontSize: "12px", color: "#007acc", marginTop: "5px" }}>{loadingProgress}</div>
        )}
        {sdkStatus && <div style={{ fontSize: "12px", color: "#666", marginTop: "10px" }}>{sdkStatus}</div>}
        {apiStatus && <div style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>{apiStatus}</div>}
        {isAutoAnalyzing && (
          <div style={{ fontSize: "12px", color: "#007acc", marginTop: "5px" }}>
            🤖 Đang phân tích dữ liệu tự động...
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <h2>📊 Bảng: {tableName}</h2>

      <div style={{ marginBottom: "15px", fontSize: "12px", color: "#666" }}>
        {sdkStatus && <div>✅ {sdkStatus}</div>}
        {apiStatus && <div>{apiStatus}</div>}
        {workingModel && <div>🤖 Đang sử dụng model: {workingModel}</div>}
        {tableStats && (
          <div>
            📊 Thống kê: {tableStats.totalRecords} records, {tableStats.totalFields} fields
          </div>
        )}
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
              🔍 Detailed Debug
            </button>
            <button onClick={testAPI} style={{ marginRight: "10px", fontSize: "12px" }}>
              🧪 Test API
            </button>
            <button onClick={testTableAccessFunc} style={{ marginRight: "10px", fontSize: "12px" }}>
              🧪 Test Access
            </button>
            <button onClick={testSample} style={{ marginRight: "10px", fontSize: "12px" }}>
              🧪 Test Sample
            </button>
            <button onClick={loadAllData} style={{ marginRight: "10px", fontSize: "12px" }}>
              📥 Load All Data
            </button>
            <button onClick={() => window.location.reload()} style={{ fontSize: "12px" }}>
              🔄 Thử lại
            </button>
          </div>
          {debugInfo && <div style={{ marginTop: "10px", fontSize: "12px", color: "#666" }}>{debugInfo}</div>}
        </div>
      )}

      {/* Phần phân tích tự động */}
      {(autoAnalysis || isAutoAnalyzing) && (
        <div
          style={{
            marginBottom: "20px",
            padding: "15px",
            backgroundColor: "#e8f4fd",
            borderRadius: "6px",
            border: "1px solid #007acc",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <h3 style={{ margin: 0 }}>🤖 Phân tích tự động</h3>
            <button onClick={refreshAnalysis} disabled={isAutoAnalyzing} style={{ fontSize: "12px" }}>
              {isAutoAnalyzing ? "🔄 Đang phân tích..." : "🔄 Phân tích lại"}
            </button>
          </div>
          {isAutoAnalyzing ? (
            <div>🤖 Đang phân tích toàn bộ {tableData.length} records...</div>
          ) : (
            <div style={{ whiteSpace: "pre-wrap" }}>{autoAnalysis}</div>
          )}
        </div>
      )}

      <div style={{ marginBottom: "20px" }}>
        <h3>📋 Dữ liệu bảng ({tableData.length} bản ghi):</h3>
        {tableData.length === 0 ? (
          <div style={{ padding: "20px", backgroundColor: "#f9f9f9", borderRadius: "6px", textAlign: "center" }}>
            <p>⚠️ Không có dữ liệu để hiển thị</p>
            <p style={{ fontSize: "12px", color: "#666" }}>Có thể bảng trống hoặc có vấn đề với quyền truy cập</p>
            <button onClick={runDebug} style={{ fontSize: "12px", marginRight: "10px" }}>
              🔍 Detailed Debug
            </button>
            <button onClick={testSample} style={{ fontSize: "12px" }}>
              🧪 Test Sample
            </button>
          </div>
        ) : (
          <details>
            <summary style={{ cursor: "pointer", padding: "10px", backgroundColor: "#f9f9f9", borderRadius: "6px" }}>
              📊 Xem dữ liệu chi tiết ({tableData.length} records) - Click để mở/đóng
            </summary>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                backgroundColor: "#f9f9f9",
                padding: "10px",
                borderRadius: "6px",
                maxHeight: "400px",
                overflow: "auto",
                fontSize: "11px",
                marginTop: "10px",
              }}
            >
              {JSON.stringify(tableData.slice(0, 5), null, 2)}
              {tableData.length > 5 && `\n\n... và ${tableData.length - 5} records khác`}
            </pre>
          </details>
        )}
      </div>

      {tableData.length > 0 && (
        <div>
          <h3>🤖 Hỏi AI về dữ liệu:</h3>
          <div style={{ marginBottom: "10px", fontSize: "12px", color: "#666" }}>
            💡 AI đã đọc toàn bộ {tableData.length} records với thông tin chi tiết. Bạn có thể hỏi bất kỳ câu hỏi nào!
            <br />🔍 Ví dụ: &quot;Phân tích theo phòng ban&quot;, &quot;Thống kê tài sản&quot;, &quot;Tìm xu hướng&quot;
          </div>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ví dụ: Phân tích dữ liệu theo phòng ban, thống kê tài sản, tìm các mẫu dữ liệu..."
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
            <button onClick={refreshAnalysis} style={{ marginLeft: "10px", fontSize: "12px" }}>
              🔄 Phân tích lại
            </button>
            <button onClick={runDebug} style={{ marginLeft: "10px", fontSize: "12px" }}>
              🔍 Debug
            </button>
            <button onClick={loadAllData} style={{ marginLeft: "10px", fontSize: "12px" }}>
              📥 Reload All
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
