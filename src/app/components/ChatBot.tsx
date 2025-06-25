"use client"
import { useEffect, useState } from "react"
import {
  getTableDataAsCSV,
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
  const [csvData, setCsvData] = useState<string>("")
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
    console.log("🧪 Testing all API keys...")
    const result = await testAllApiKeys()
    setApiStatus(`API Test: ${result.success ? "✅" : "❌"} ${result.message}`)
    setDebugInfo(`Key details: ${JSON.stringify(result.keyDetails, null, 2)}`)
  }

  const testTableAccessFunc = async () => {
    console.log("🧪 Testing table access...")
    const result = await testTableAccess(tableId)
    setDebugInfo(`Table access test: ${result? "✅ Success" : "❌ Failed"} - Check console for details`)
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
    console.log("📥 Loading ALL data as CSV...")
    setLoading(true)
    setLoadingProgress("Đang lấy dữ liệu CSV...")

    try {
      const csv = await getTableDataAsCSV(tableId)
      setCsvData(csv)
      setLoadingProgress("")

      if (csv.split("\n").length > 1) {
        await performDataPreprocessing(csv)
      } else {
        setError("Bảng không có dữ liệu hoặc CSV trống.")
      }
    } catch (err) {
      console.error("❌ Error loading CSV data:", err)
      setError(`Lỗi khi lấy dữ liệu CSV: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const performDataPreprocessing = async (csvData: string) => {
    if (!csvData.trim()) {
      setAutoAnalysis("⚠️ Dữ liệu CSV trống. Cần debug để khắc phục.")
      return
    }

    // Kiểm tra dữ liệu CSV
    const lines = csvData.split("\n").filter((line) => line.trim())
    const hasRealData = lines.slice(1).some((line) => line.split(",").some((value) => value.trim() !== ""))

    if (!hasRealData) {
      setAutoAnalysis("⚠️ Dữ liệu CSV chỉ có recordId hoặc giá trị rỗng. Cần debug để khắc phục.")
      return
    }

    setIsAutoAnalyzing(true)
    try {
      console.log(`🚀 Bắt đầu Data Preprocessing Pipeline với ${lines.length - 1} records...`)

      setPipelineStage("📊 Đang chia dữ liệu thành chunks...")
      setLoadingProgress(`Bước 1/4: Chia ${lines.length - 1} records thành chunks`)

      setPipelineStage("🔧 Đang optimize dữ liệu song song...")
      setLoadingProgress(`Bước 2/4: Optimize dữ liệu với multiple API keys`)

      setPipelineStage("🔄 Đang gộp dữ liệu đã optimize...")
      setLoadingProgress(`Bước 3/4: Gộp dữ liệu CSV đã optimize`)

      setPipelineStage("🤖 Đang phân tích tổng hợp...")
      setLoadingProgress(`Bước 4/4: Phân tích tổng hợp với AI`)

      const result = await preprocessDataWithPipeline(csvData, tableName)

      if (result.success) {
        setOptimizedData(result.optimizedData)
        setAutoAnalysis(result.analysis)
        setKeyUsageInfo(result.keyUsage)
        setIsDataReady(true)
        setPipelineStage("✅ Pipeline hoàn thành!")
        console.log("✅ Hoàn thành Data Preprocessing Pipeline")
      } else {
        setAutoAnalysis

        setAutoAnalysis(result.analysis)
        setIsDataReady(false)
        setPipelineStage("❌ Pipeline thất bại")
      }
    } catch (err) {
      console.error("❌ Lỗi khi chạy preprocessing pipeline:", err)
      setAutoAnalysis("❌ Không thể thực hiện preprocessing pipeline. Vui lòng thử lại.")
      setIsDataReady(false)
      setPipelineStage("❌ Pipeline lỗi")
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

        console.log("🔍 Kiểm tra SDK status...")
        const status = await checkSDKStatus()
        setSdkStatus(`SDK Status: ${status.status} - ${status.message}`)

        if (status.status === "error") {
          throw new Error(status.message)
        }

        await testAPI()

        setLoadingProgress("Đang lấy thống kê bảng...")
        const stats = await getTableStats(tableId)
        setTableStats(stats)
        console.log("📊 Table stats:", stats)

        setLoadingProgress(`Đang lấy dữ liệu CSV (${stats.totalRecords} records)...`)
        console.log("📥 Bắt đầu lấy dữ liệu CSV...")
        const csv = await getTableDataAsCSV(tableId)
        console.log("✅ Đã lấy dữ liệu CSV:", csv.slice(0, 100) + "...")

        setCsvData(csv)

        if (csv.split("\n").length <= 1) {
          setError("Bảng không có dữ liệu hoặc CSV trống. Hãy thử debug để xem chi tiết.")
        } else {
          const hasRealData = csv.split("\n").slice(1).some((line) => line.split(",").some((value) => value.trim() !== ""))
          if (hasRealData) {
            console.log("🚀 Bắt đầu Data Preprocessing Pipeline...")
            await performDataPreprocessing(csv)
          } else {
            setError("Đã lấy được CSV nhưng không có thông tin chi tiết. Vui lòng chạy debug để khắc phục.")
          }
        }
      } catch (err) {
        console.error("❌ Lỗi khi lấy dữ liệu:", err)
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
    if (!question.trim() || !csvData || !isDataReady) return

    setIsAsking(true)
    setAnswer("")

    try {
      console.log("🤔 Bắt đầu trả lời câu hỏi với optimized CSV...")
      const response = await answerQuestionWithData(csvData, tableName, question, autoAnalysis, optimizedData)
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
    if (csvData) {
      await performDataPreprocessing(csvData)
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
            🚀 Đang chạy Data Preprocessing Pipeline...
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
            🔧 Pipeline: {keyUsageInfo.optimizeKeys} keys optimize + 1 key analyze = {keyUsageInfo.optimizeKeys + 1}/
            {keyUsageInfo.totalKeys} keys used
          </div>
        )}
        {optimizedData && (
          <div style={{ color: "green" }}>
            ✅ Optimized CSV: {optimizedData.length} characters (từ {csvData.split("\n").length - 1} records)
          </div>
        )}
        {isDataReady && <div style={{ color: "green" }}>✅ Data Pipeline hoàn thành - Sẵn sàng trả lời câu hỏi!</div>}
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
              🧪 Test API Keys
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
            <h3 style={{ margin: 0 }}>🚀 Data Preprocessing Pipeline ({csvData.split("\n").length - 1} records)</h3>
            <button onClick={refreshAnalysis} disabled={isAutoAnalyzing} style={{ fontSize: "12px" }}>
              {isAutoAnalyzing ? "🔄 Đang xử lý..." : "🔄 Chạy lại Pipeline"}
            </button>
          </div>

          {isAutoAnalyzing ? (
            <div>
              <div>🚀 Đang chạy Data Preprocessing Pipeline với {csvData.split("\n").length - 1} records...</div>
              {pipelineStage && <div style={{ marginTop: "5px", fontStyle: "italic" }}>{pipelineStage}</div>}
              <div style={{ marginTop: "10px", fontSize: "12px", color: "#666" }}>
                <strong>Pipeline Steps:</strong>
                <br />
                1. 📊 Chia dữ liệu CSV → chunks
                <br />
                2. 🔧 Optimize song song → giảm tokens
                <br />
                3. 🔄 Gộp dữ liệu CSV → hoàn chỉnh
                <br />
                4. 🤖 Phân tích tổng hợp → insights
              </div>
            </div>
          ) : (
            <div style={{ whiteSpace: "pre-wrap" }}>{autoAnalysis}</div>
          )}
        </div>
      )}

      <div style={{ marginBottom: "20px" }}>
        <h3>📋 Dữ liệu bảng ({csvData.split("\n").length - 1} bản ghi):</h3>
        {csvData.split("\n").length <= 1 ? (
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
              📊 Xem dữ liệu CSV ({csvData.split("\n").length - 1} records) - Click để mở/đóng
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
              {csvData.split("\n").slice(0, 6).join("\n")}
              {csvData.split("\n").length > 6 && `\n\n... và ${csvData.split("\n").length - 6} records khác`}
            </pre>
          </details>
        )}
      </div>

      {csvData.split("\n").length > 1 && (
        <div>
          <h3>🤖 Hỏi AI về dữ liệu:</h3>
          <div style={{ marginBottom: "10px", fontSize: "12px", color: "#666" }}>
            {isDataReady ? (
              <>
                ✅ Data Pipeline hoàn thành! AI đã nhận được TOÀN BỘ {csvData.split("\n").length - 1} records đã optimize.
                <br />🔍 Ví dụ: &quot;Phân tích theo phòng ban&quot;, &quot;Thống kê tài sản&quot;, &quot;Tìm xu hướng&quot;
                <br />📊 Optimized CSV: {optimizedData.length} characters
              </>
            ) : (
              <>
                ⏳ Đang chạy Data Preprocessing Pipeline... Vui lòng chờ.
                <br />📊 {csvData.split("\n").length - 1} records đang được optimize và phân tích.
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
              🧪 Test Keys
            </button>
            <button onClick={refreshAnalysis} style={{ marginLeft: "10px", fontSize: "12px" }}>
              🔄 Chạy lại Pipeline
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
              <h4>💡 Câu trả lời từ AI (Optimized CSV - {csvData.split("\n").length - 1} records):</h4>
              <div style={{ whiteSpace: "pre-wrap" }}>{answer}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
