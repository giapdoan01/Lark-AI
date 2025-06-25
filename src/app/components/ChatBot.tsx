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
import { preprocessDataWithPipeline, answerQuestionWithData, testAllApiKeys } from "../lib/groqClient"

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
  const [autoAnalysis, setAutoAnalysis] = useState<string>("")
  const [isAutoAnalyzing, setIsAutoAnalyzing] = useState(false)
  const [tableStats, setTableStats] = useState<any>(null)
  const [loadingProgress, setLoadingProgress] = useState<string>("")
  const [keyUsageInfo, setKeyUsageInfo] = useState<any>(null)
  const [isDataReady, setIsDataReady] = useState(false)
  const [optimizedData, setOptimizedData] = useState<string>("")
  const [pipelineStage, setPipelineStage] = useState<string>("")

  const runDebug = async () => {
    console.log("🔍 Chạy detailed debug...")
    await debugTableStructure(tableId)
    setDebugInfo("Detailed debug completed - check console for comprehensive analysis")
  }

  const testAPI = async () => {
    console.log("🧪 Testing all API keys với CSV format...")
    const result = await testAllApiKeys()
    setApiStatus(`CSV API Test: ${result.success ? "✅" : "❌"} ${result.message}`)
    setDebugInfo(`CSV Key details: ${JSON.stringify(result.keyDetails, null, 2)}`)
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
        await performDataPreprocessing(data)
      }
    } catch (err) {
      console.error("❌ Error loading all data:", err)
      setError(`Lỗi khi lấy tất cả dữ liệu: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  // 🔥 UPDATED: Function preprocessing pipeline với CSV format
  const performDataPreprocessing = async (data: Array<{ recordId: string; fields: Record<string, unknown> }>) => {
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
      console.log(`🚀 Bắt đầu CSV Data Preprocessing Pipeline với ${data.length} records...`)

      // Stage 1: Chia dữ liệu
      setPipelineStage("📊 Đang chia dữ liệu thành CSV chunks...")
      setLoadingProgress(`Bước 1/4: Chia ${data.length} records thành CSV chunks`)

      // Stage 2: Optimize
      setPipelineStage("🔧 Đang optimize CSV dữ liệu song song...")
      setLoadingProgress(`Bước 2/4: Optimize CSV với multiple API keys`)

      // Stage 3: Merge
      setPipelineStage("🔄 Đang gộp CSV dữ liệu đã optimize...")
      setLoadingProgress(`Bước 3/4: Gộp CSV dữ liệu đã optimize`)

      // Stage 4: Analyze
      setPipelineStage("🤖 Đang phân tích CSV tổng hợp...")
      setLoadingProgress(`Bước 4/4: Phân tích CSV tổng hợp với AI`)

      // Chạy CSV preprocessing pipeline
      const result = await preprocessDataWithPipeline(data, tableName)

      if (result.success) {
        setOptimizedData(result.optimizedData)
        setAutoAnalysis(result.analysis)
        setKeyUsageInfo(result.keyUsage)
        setIsDataReady(true)
        setPipelineStage("✅ CSV Pipeline hoàn thành!")
        console.log("✅ Hoàn thành CSV Data Preprocessing Pipeline")
      } else {
        setAutoAnalysis(result.analysis)
        setIsDataReady(false)
        setPipelineStage("❌ CSV Pipeline thất bại")
      }
    } catch (err) {
      console.error("❌ Lỗi khi chạy CSV preprocessing pipeline:", err)
      setAutoAnalysis("❌ Không thể thực hiện CSV preprocessing pipeline. Vui lòng thử lại.")
      setIsDataReady(false)
      setPipelineStage("❌ CSV Pipeline lỗi")
    } finally {
      setIsAutoAnalyzing(false)
      setLoadingProgress("")
      setPipelineStage("")
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

        // Test API keys với CSV format
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
            // Chạy CSV Data Preprocessing Pipeline
            console.log("🚀 Bắt đầu CSV Data Preprocessing Pipeline...")
            await performDataPreprocessing(data)
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
    if (!question.trim() || tableData.length === 0 || !isDataReady) return

    setIsAsking(true)
    setAnswer("") // Clear previous answer

    try {
      console.log("🤔 Bắt đầu trả lời câu hỏi với CSV optimized data...")

      // Sử dụng CSV optimized data để trả lời câu hỏi
      const response = await answerQuestionWithData(tableData, tableName, question, autoAnalysis, optimizedData)
      setAnswer(response)
      console.log("✅ Đã nhận được câu trả lời từ AI với CSV format")
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
      await performDataPreprocessing(tableData)
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
        {pipelineStage && <div style={{ fontSize: "12px", color: "#ff6600", marginTop: "5px" }}>{pipelineStage}</div>}
        {sdkStatus && <div style={{ fontSize: "12px", color: "#666", marginTop: "10px" }}>{sdkStatus}</div>}
        {apiStatus && <div style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>{apiStatus}</div>}
        {isAutoAnalyzing && (
          <div style={{ fontSize: "12px", color: "#007acc", marginTop: "5px" }}>
            🚀 Đang chạy CSV Data Preprocessing Pipeline...
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
        {tableStats && (
          <div>
            📊 Thống kê: {tableStats.totalRecords} records, {tableStats.totalFields} fields
          </div>
        )}
        {keyUsageInfo && (
          <div>
            🔧 CSV Pipeline: {keyUsageInfo.optimizeKeys} keys optimize + 1 key analyze = {keyUsageInfo.optimizeKeys + 1}
            /{keyUsageInfo.totalKeys} keys used
            {keyUsageInfo.format && <span> | Format: {keyUsageInfo.format}</span>}
            {keyUsageInfo.csvCompressionVsJson && <span> | CSV vs JSON: {keyUsageInfo.csvCompressionVsJson}</span>}
          </div>
        )}
        {optimizedData && (
          <div style={{ color: "green" }}>
            ✅ Optimized CSV data: {optimizedData.length} characters (từ {tableData.length} records)
            {keyUsageInfo?.csvCompressionVsJson && (
              <span> - CSV giảm {100 - Number.parseInt(keyUsageInfo.csvCompressionVsJson)}% tokens vs JSON</span>
            )}
          </div>
        )}
        {isDataReady && (
          <div style={{ color: "green" }}>✅ CSV Data Pipeline hoàn thành - Sẵn sàng trả lời câu hỏi!</div>
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
              🧪 Test CSV APIs
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

      {/* CSV Data Preprocessing Pipeline Status */}
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
            <h3 style={{ margin: 0 }}>🚀 CSV Data Preprocessing Pipeline ({tableData.length} records)</h3>
            <button onClick={refreshAnalysis} disabled={isAutoAnalyzing} style={{ fontSize: "12px" }}>
              {isAutoAnalyzing ? "🔄 Đang xử lý..." : "🔄 Chạy lại CSV Pipeline"}
            </button>
          </div>

          {isAutoAnalyzing ? (
            <div>
              <div>🚀 Đang chạy CSV Data Preprocessing Pipeline với {tableData.length} records...</div>
              {pipelineStage && <div style={{ marginTop: "5px", fontStyle: "italic" }}>{pipelineStage}</div>}
              <div style={{ marginTop: "10px", fontSize: "12px", color: "#666" }}>
                <strong>CSV Pipeline Steps:</strong>
                <br />
                1. 📊 Chia dữ liệu → CSV chunks
                <br />
                2. 🔧 Optimize CSV song song → giảm tokens
                <br />
                3. 🔄 Gộp CSV dữ liệu → hoàn chỉnh
                <br />
                4. 🤖 Phân tích CSV tổng hợp → insights
                <br />
                <strong>CSV Benefits:</strong> Giảm 30-50% tokens so với JSON format
              </div>
            </div>
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
              {keyUsageInfo?.format && (
                <span style={{ color: "#007acc" }}> | Optimized: {keyUsageInfo.format} format</span>
              )}
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
          <h3>🤖 Hỏi AI về dữ liệu CSV:</h3>
          <div style={{ marginBottom: "10px", fontSize: "12px", color: "#666" }}>
            {isDataReady ? (
              <>
                ✅ CSV Data Pipeline hoàn thành! AI đã nhận được TOÀN BỘ {tableData.length} records đã optimize trong
                CSV format.
                <br />🔍 Ví dụ: &quot;Phân tích theo phòng ban&quot;, &quot;Thống kê tài sản&quot;, &quot;Tìm xu
                hướng&quot;
                <br />📊 Optimized CSV data: {optimizedData.length} characters
                {keyUsageInfo?.csvCompressionVsJson && (
                  <span> (CSV giảm {100 - Number.parseInt(keyUsageInfo.csvCompressionVsJson)}% tokens vs JSON)</span>
                )}
              </>
            ) : (
              <>
                ⏳ Đang chạy CSV Data Preprocessing Pipeline... Vui lòng chờ.
                <br />📊 {tableData.length} records đang được optimize thành CSV format.
              </>
            )}
          </div>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ví dụ: Phân tích dữ liệu theo phòng ban, thống kê tài sản, tìm các mẫu dữ liệu..."
            rows={3}
            style={{ width: "100%", marginBottom: "10px" }}
            disabled={!isDataReady}
          />
          <div style={{ marginBottom: "10px" }}>
            <button onClick={handleAskQuestion} disabled={isAsking || !question.trim() || !isDataReady}>
              {isAsking ? "🤔 Đang suy nghĩ..." : "🚀 Hỏi AI (Optimized CSV)"}
            </button>
            <button onClick={testAPI} style={{ marginLeft: "10px", fontSize: "12px" }}>
              🧪 Test CSV Keys
            </button>
            <button onClick={refreshAnalysis} style={{ marginLeft: "10px", fontSize: "12px" }}>
              🔄 Chạy lại CSV Pipeline
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
              <h4>💡 Câu trả lời từ AI (Optimized CSV Pipeline - {tableData.length} records):</h4>
              <div style={{ whiteSpace: "pre-wrap" }}>{answer}</div>
              {keyUsageInfo?.csvCompressionVsJson && (
                <div style={{ marginTop: "10px", fontSize: "12px", color: "#666" }}>
                  📊 CSV Format: Giảm {100 - Number.parseInt(keyUsageInfo.csvCompressionVsJson)}% tokens so với JSON
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
