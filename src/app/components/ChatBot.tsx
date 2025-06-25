"use client"
import { useEffect, useState, useRef } from "react"
import {
  getTableData,
  getTableStats,
  getTableDataWithTypes, // ← Add this import
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

// 🎨 Progress Steps Component
const ProgressSteps = ({ currentStep, steps }: { currentStep: number; steps: string[] }) => (
  <div style={{ margin: "15px 0" }}>
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
      {steps.map((step, index) => (
        <div key={index} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              backgroundColor: index <= currentStep ? "#007acc" : "#e0e0e0",
              color: index <= currentStep ? "white" : "#999",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              fontWeight: "bold",
            }}
          >
            {index < currentStep ? "✓" : index + 1}
          </div>
          <span style={{ fontSize: "12px", color: index <= currentStep ? "#007acc" : "#999" }}>{step}</span>
          {index < steps.length - 1 && (
            <div
              style={{
                width: "20px",
                height: "2px",
                backgroundColor: index < currentStep ? "#007acc" : "#e0e0e0",
                margin: "0 5px",
              }}
            />
          )}
        </div>
      ))}
    </div>
  </div>
)

// 🎨 Status Card Component
const StatusCard = ({
  title,
  status,
  details,
  type = "info",
}: {
  title: string
  status: string
  details?: string
  type?: "info" | "success" | "warning" | "error"
}) => {
  const colors = {
    info: { bg: "#e8f4fd", border: "#007acc", text: "#007acc" },
    success: { bg: "#e8f5e8", border: "#4caf50", text: "#4caf50" },
    warning: { bg: "#fff3cd", border: "#ffc107", text: "#856404" },
    error: { bg: "#ffe6e6", border: "#ff4444", text: "#ff4444" },
  }

  const color = colors[type]

  return (
    <div
      style={{
        padding: "12px 16px",
        backgroundColor: color.bg,
        border: `1px solid ${color.border}`,
        borderRadius: "8px",
        marginBottom: "10px",
      }}
    >
      <div style={{ fontWeight: "600", color: color.text, marginBottom: "4px" }}>{title}</div>
      <div style={{ fontSize: "14px", color: color.text }}>{status}</div>
      {details && <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>{details}</div>}
    </div>
  )
}

// 🎨 Loading Spinner Component
const LoadingSpinner = ({ size = 20 }: { size?: number }) => (
  <div
    style={{
      width: size,
      height: size,
      border: `2px solid #e0e0e0`,
      borderTop: `2px solid #007acc`,
      borderRadius: "50%",
      animation: "spin 1s linear infinite",
      display: "inline-block",
      marginRight: "8px",
    }}
  />
)

// 🔥 UPDATED: API Status Component for raw JSON strategy
const APIStatusPanel = ({
  apiTestResults,
  isVisible,
  onToggle,
  onRefreshTests,
}: {
  apiTestResults: any
  isVisible: boolean
  onToggle: () => void
  onRefreshTests: () => void
}) => (
  <div style={{ marginBottom: "20px" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
      <button
        onClick={onToggle}
        style={{
          padding: "8px 16px",
          backgroundColor: "#f8f9fa",
          border: "1px solid #dee2e6",
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "12px",
          fontWeight: "500",
        }}
      >
        {isVisible ? "🔽 Ẩn" : "🔼 Hiện"} API Status Debug ({apiTestResults?.workingKeys || 0}/
        {apiTestResults?.totalKeys || 0} working)
      </button>

      {isVisible && (
        <button
          onClick={onRefreshTests}
          style={{
            padding: "6px 12px",
            backgroundColor: "#007acc",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "11px",
          }}
        >
          🔄 Test lại APIs
        </button>
      )}
    </div>

    {isVisible && apiTestResults && (
      <div
        style={{
          padding: "15px",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
          border: "1px solid #dee2e6",
        }}
      >
        <div style={{ marginBottom: "15px" }}>
          <h4 style={{ margin: "0 0 10px 0", fontSize: "14px" }}>
            🔑 API Keys Status: {apiTestResults.workingKeys}/{apiTestResults.totalKeys} hoạt động
          </h4>
          <div style={{ fontSize: "12px", color: "#666" }}>
            Model: {apiTestResults.keyDetails?.[0]?.model || "meta-llama/llama-4-scout-17b-16e-instruct"}
          </div>
          <div style={{ fontSize: "12px", color: "#007acc", marginTop: "5px" }}>
            🎲 Strategy: Raw JSON (No CSV conversion) + Random API selection
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "10px" }}>
          {apiTestResults.keyDetails?.map((key: any, index: number) => (
            <div
              key={index}
              style={{
                padding: "10px",
                backgroundColor: key.status === "success" ? "#e8f5e8" : "#ffe6e6",
                border: `1px solid ${key.status === "success" ? "#4caf50" : "#ff4444"}`,
                borderRadius: "6px",
              }}
            >
              <div
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}
              >
                <span style={{ fontWeight: "600", fontSize: "12px" }}>API {key.keyIndex}</span>
                <span
                  style={{
                    fontSize: "11px",
                    color: key.status === "success" ? "#4caf50" : "#ff4444",
                    fontWeight: "600",
                  }}
                >
                  {key.status === "success" ? "✅ WORKING" : "❌ FAILED"}
                </span>
              </div>

              <div style={{ fontSize: "10px", color: "#666", marginBottom: "5px" }}>{key.preview}</div>

              {key.status === "success" ? (
                <div style={{ fontSize: "11px", color: "#4caf50" }}>
                  Response: "{key.response}" ({key.responseTime}ms)
                </div>
              ) : (
                <div style={{ fontSize: "11px", color: "#ff4444" }}>Error: {key.error?.substring(0, 50)}...</div>
              )}
            </div>
          ))}
        </div>

        {/* Raw JSON Strategy Info */}
        <div style={{ marginTop: "15px", padding: "10px", backgroundColor: "#e8f5e8", borderRadius: "6px" }}>
          <h5 style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#4caf50" }}>📄 Raw JSON Strategy:</h5>
          <div style={{ fontSize: "12px", color: "#4caf50" }}>
            • No CSV conversion: Gửi raw JSON trực tiếp cho API
            <br />• Zero data loss: 100% original Lark Base data preserved
            <br />• Complete field structures: Text objects, options, users, attachments
            <br />• Random API selection: Chọn ngẫu nhiên từ {apiTestResults.workingKeys} working APIs
            <br />• Model: meta-llama/llama-4-scout-17b-16e-instruct
            <br />• <strong>Benefit: Maximum data integrity, no conversion artifacts</strong>
          </div>
        </div>
      </div>
    )}
  </div>
)

export default function ChatBot({ tableId, tableName }: ChatBotProps) {
  // States
  const [tableData, setTableData] = useState<Array<{ recordId: string; fields: Record<string, unknown> }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [isAsking, setIsAsking] = useState(false)
  const [autoAnalysis, setAutoAnalysis] = useState<string>("")
  const [isAutoAnalyzing, setIsAutoAnalyzing] = useState(false)
  const [tableStats, setTableStats] = useState<any>(null)
  const [keyUsageInfo, setKeyUsageInfo] = useState<any>(null)
  const [isDataReady, setIsDataReady] = useState<boolean>(false)
  const [optimizedData, setOptimizedData] = useState<string>("")

  // 🎨 UI States
  const [currentStep, setCurrentStep] = useState(0)
  const [processingStatus, setProcessingStatus] = useState<string>("")
  const [showDebugTools, setShowDebugTools] = useState(false)

  // API Status States
  const [apiTestResults, setApiTestResults] = useState<any>(null)
  const [showApiStatus, setShowApiStatus] = useState(false)
  const [isTestingApis, setIsTestingApis] = useState(false)

  // Refs
  const hasLoadedData = useRef(false)
  const hasRunPipeline = useRef(false)
  const isInitializing = useRef(false)

  // 🔥 UPDATED: Pipeline Steps for raw JSON
  const pipelineSteps = ["Kiểm tra SDK", "Test APIs", "Lấy dữ liệu", "Raw JSON", "Phân tích AI"]

  // Test API Keys Function
  const testApiKeys = async () => {
    setIsTestingApis(true)
    try {
      console.log("🧪 Testing all API keys...")
      const results = await testAllApiKeys()
      setApiTestResults(results)

      // Auto show API status if there are failed keys
      if (results.workingKeys < results.totalKeys) {
        setShowApiStatus(true)
      }

      console.log("✅ API test results:", results)
    } catch (error) {
      console.error("❌ API testing failed:", error)
      setApiTestResults({
        success: false,
        message: "API testing failed",
        workingKeys: 0,
        totalKeys: 0,
        keyDetails: [],
      })
    } finally {
      setIsTestingApis(false)
    }
  }

  // 🔥 UPDATED: Raw JSON preprocessing với field metadata
  const performDataPreprocessing = async (data: Array<{ recordId: string; fields: Record<string, unknown> }>) => {
    if (data.length === 0 || hasRunPipeline.current) return

    const hasRealData = data.some((record) =>
      Object.values(record.fields).some((value) => value !== null && value !== undefined && value !== ""),
    )

    if (!hasRealData) {
      setAutoAnalysis("⚠️ Dữ liệu không có thông tin chi tiết fields.")
      return
    }

    hasRunPipeline.current = true
    setIsAutoAnalyzing(true)
    setCurrentStep(4)

    try {
      setProcessingStatus("🚀 Bắt đầu Clean JSON Pipeline với field standardization...")

      // Get enhanced field metadata
      const { fieldTypes, fieldNames } = await getTableDataWithTypes(tableId)
      const fieldMetadata = { fieldTypes, fieldNames }

      const result = await preprocessDataWithPipeline(data, tableName, fieldMetadata)

      if (result.success) {
        setOptimizedData(result.optimizedData)
        setAutoAnalysis(result.analysis)
        setKeyUsageInfo(result.keyUsage)
        setIsDataReady(true)
        setCurrentStep(4)
        setProcessingStatus("✅ Clean JSON Pipeline hoàn thành!")
      } else {
        setAutoAnalysis(result.analysis)
        setIsDataReady(false)
        setProcessingStatus("❌ Pipeline thất bại")
      }
    } catch (err) {
      console.error("❌ Pipeline error:", err)
      setAutoAnalysis("❌ Không thể thực hiện Clean JSON pipeline.")
      setIsDataReady(false)
      setProcessingStatus("❌ Pipeline lỗi")
      hasRunPipeline.current = false
    } finally {
      setIsAutoAnalyzing(false)
    }
  }

  // 🔧 Optimized useEffect
  useEffect(() => {
    const initializeData = async () => {
      if (isInitializing.current || hasLoadedData.current) return

      isInitializing.current = true
      setLoading(true)
      setError(null)
      setCurrentStep(0)

      try {
        // Step 1: SDK Check
        setProcessingStatus("🔍 Kiểm tra SDK...")
        const status = await checkSDKStatus()

        if (status.status === "error") {
          throw new Error(status.message)
        }
        setCurrentStep(1)

        // Step 2: Test API Keys
        setProcessingStatus("🧪 Test API keys...")
        await testApiKeys()
        setCurrentStep(2)

        // Step 3: Get Data
        setProcessingStatus("📊 Lấy thống kê bảng...")
        const stats = await getTableStats(tableId)
        setTableStats(stats)

        setProcessingStatus(`📥 Lấy TẤT CẢ ${stats.totalRecords} records...`)
        const data = await getTableData(tableId)
        setTableData(data)
        hasLoadedData.current = true
        setCurrentStep(3)

        console.log(`✅ Loaded ${data.length} records from table (expected: ${stats.totalRecords})`)

        if (data.length === 0) {
          setError("Bảng không có dữ liệu.")
          return
        }

        // 🔥 IMPORTANT: Check for data loss at source
        if (data.length !== stats.totalRecords) {
          console.warn(`⚠️ DATA LOSS AT SOURCE: Expected ${stats.totalRecords}, got ${data.length} records`)
          console.warn(`This is likely a Lark Base SDK issue, not a conversion issue`)
        }

        // Step 4: Process Data with Raw JSON
        const hasRealData = data.some((record) =>
          Object.values(record.fields).some((value) => value !== null && value !== undefined && value !== ""),
        )

        if (hasRealData) {
          await performDataPreprocessing(data)
        } else {
          setError("Không có dữ liệu chi tiết fields.")
        }
      } catch (err) {
        console.error("❌ Initialization error:", err)
        setError(err instanceof Error ? err.message : String(err))
        hasLoadedData.current = false
        hasRunPipeline.current = false
      } finally {
        setLoading(false)
        isInitializing.current = false
      }
    }

    if (tableId && !hasLoadedData.current) {
      initializeData()
    }
  }, [tableId, tableName])

  // Question Handler
  const handleAskQuestion = async () => {
    if (!question.trim() || !isDataReady) return

    setIsAsking(true)
    setAnswer("")

    try {
      const response = await answerQuestionWithData(tableData, tableName, question, autoAnalysis, optimizedData)
      setAnswer(response)
    } catch (err) {
      setAnswer(`❌ Lỗi: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsAsking(false)
    }
  }

  // 🎨 Loading State
  if (loading) {
    return (
      <div style={{ padding: "20px", maxWidth: "800px" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: "20px" }}>
          <LoadingSpinner size={24} />
          <h2 style={{ margin: 0 }}>📊 Đang xử lý bảng "{tableName}"</h2>
        </div>

        <ProgressSteps currentStep={currentStep} steps={pipelineSteps} />

        <StatusCard
          title="Trạng thái xử lý"
          status={processingStatus}
          details={tableStats ? `${tableStats.totalRecords} records, ${tableStats.totalFields} fields` : undefined}
          type="info"
        />

        {isTestingApis && (
          <StatusCard
            title="🧪 Testing API Keys"
            status="Đang kiểm tra tất cả API keys với Llama 4 Scout..."
            details="Model: meta-llama/llama-4-scout-17b-16e-instruct"
            type="info"
          />
        )}

        {isAutoAnalyzing && (
          <StatusCard
            title="🚀 Raw JSON Pipeline"
            status="Đang gửi raw JSON data trực tiếp cho API..."
            details="No CSV conversion → Zero data loss → Complete field structures"
            type="info"
          />
        )}
      </div>
    )
  }

  // 🎨 Main Interface
  return (
    <div style={{ padding: "20px", maxWidth: "1000px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ margin: "0 0 10px 0", color: "#333" }}>📊 {tableName}</h2>
        <ProgressSteps currentStep={currentStep} steps={pipelineSteps} />
      </div>

      {/* API Status Panel */}
      {apiTestResults && (
        <APIStatusPanel
          apiTestResults={apiTestResults}
          isVisible={showApiStatus}
          onToggle={() => setShowApiStatus(!showApiStatus)}
          onRefreshTests={testApiKeys}
        />
      )}

      {/* Status Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "20px" }}>
        {tableStats && (
          <StatusCard
            title="📊 Thống kê bảng"
            status={`${tableStats.totalRecords} records, ${tableStats.totalFields} fields`}
            details={`Loaded: ${tableData.length} records${
              tableData.length !== tableStats.totalRecords ? " ⚠️ Data loss at source" : ""
            }`}
            type={tableData.length === tableStats.totalRecords ? "success" : "warning"}
          />
        )}

        {keyUsageInfo && (
          <StatusCard
            title="📄 Raw JSON Pipeline"
            status={`API ${keyUsageInfo.usedAPI || "N/A"} được chọn ngẫu nhiên`}
            details={
              keyUsageInfo.totalTokens
                ? `${keyUsageInfo.totalTokens} tokens | ${keyUsageInfo.responseTime}ms | No CSV conversion`
                : `Strategy: ${keyUsageInfo.strategy} | Zero conversion loss`
            }
            type="success"
          />
        )}
      </div>

      {/* Data Loss Warning (if any) */}
      {tableStats && tableData.length !== tableStats.totalRecords && (
        <div style={{ marginBottom: "20px" }}>
          <StatusCard
            title="⚠️ Data Loss Detection"
            status={`Mất ${tableStats.totalRecords - tableData.length} records tại nguồn (Lark Base SDK)`}
            details={`Expected: ${tableStats.totalRecords}, Loaded: ${tableData.length}. Đây là vấn đề từ SDK, không phải conversion.`}
            type="warning"
          />

          <div style={{ textAlign: "center", marginTop: "10px" }}>
            <button
              onClick={() => setShowApiStatus(true)}
              style={{
                padding: "8px 16px",
                backgroundColor: "#ffc107",
                color: "#856404",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "500",
              }}
            >
              🔍 Xem chi tiết API status
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={{ marginBottom: "20px" }}>
          <StatusCard title="❌ Lỗi xử lý" status={error} type="error" />

          <div style={{ textAlign: "center", marginTop: "10px" }}>
            <button
              onClick={() => setShowDebugTools(!showDebugTools)}
              style={{
                padding: "8px 16px",
                backgroundColor: "#f8f9fa",
                border: "1px solid #dee2e6",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              {showDebugTools ? "Ẩn" : "Hiện"} Debug Tools
            </button>
          </div>

          {showDebugTools && (
            <div
              style={{
                marginTop: "15px",
                padding: "15px",
                backgroundColor: "#f8f9fa",
                borderRadius: "8px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                gap: "10px",
              }}
            >
              <button onClick={() => debugTableStructure(tableId)} style={{ padding: "6px 12px", fontSize: "11px" }}>
                🔍 Debug
              </button>
              <button onClick={() => testTableAccess(tableId)} style={{ padding: "6px 12px", fontSize: "11px" }}>
                🧪 Test Access
              </button>
              <button onClick={() => testTableDataSample(tableId, 5)} style={{ padding: "6px 12px", fontSize: "11px" }}>
                📊 Sample
              </button>
              <button onClick={testApiKeys} style={{ padding: "6px 12px", fontSize: "11px" }}>
                🔑 Test APIs
              </button>
              <button onClick={() => window.location.reload()} style={{ padding: "6px 12px", fontSize: "11px" }}>
                🔄 Reload
              </button>
            </div>
          )}
        </div>
      )}

      {/* Analysis Results */}
      {autoAnalysis && (
        <div style={{ marginBottom: "20px" }}>
          <StatusCard
            title="🤖 Phân tích AI với Raw JSON"
            status="Phân tích từ raw JSON data hoàn thành"
            details={
              keyUsageInfo
                ? `API ${keyUsageInfo.usedAPI} | ${keyUsageInfo.totalTokens} tokens | ${keyUsageInfo.responseTime}ms | No conversion loss`
                : undefined
            }
            type="success"
          />
          <div
            style={{
              marginTop: "10px",
              padding: "15px",
              backgroundColor: "white",
              border: "1px solid #dee2e6",
              borderRadius: "8px",
              whiteSpace: "pre-wrap",
              fontSize: "14px",
              lineHeight: "1.5",
            }}
          >
            {autoAnalysis}
          </div>
        </div>
      )}

      {/* Question Interface */}
      {tableData.length > 0 && (
        <div
          style={{
            padding: "20px",
            backgroundColor: "white",
            border: "1px solid #dee2e6",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <h3 style={{ margin: "0 0 15px 0", color: "#333" }}>🤖 Hỏi AI về dữ liệu</h3>

          <div style={{ marginBottom: "15px", fontSize: "13px", color: "#666" }}>
            {isDataReady ? (
              <span style={{ color: "#4caf50" }}>
                ✅ Sẵn sàng! AI đã phân tích {tableData.length} records với Raw JSON (No CSV conversion).
                {keyUsageInfo && keyUsageInfo.usedAPI && (
                  <span style={{ color: "#007acc" }}> API {keyUsageInfo.usedAPI} được sử dụng.</span>
                )}
              </span>
            ) : (
              <span style={{ color: "#ff9800" }}>⏳ Đang xử lý {tableData.length} records...</span>
            )}
          </div>

          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ví dụ: Có bao nhiêu records thực tế? Phân tích theo phòng ban, thống kê thiết bị..."
            rows={3}
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid #dee2e6",
              borderRadius: "8px",
              fontSize: "14px",
              resize: "vertical",
              marginBottom: "15px",
            }}
            disabled={!isDataReady}
          />

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              onClick={handleAskQuestion}
              disabled={isAsking || !question.trim() || !isDataReady}
              style={{
                padding: "10px 20px",
                backgroundColor: isDataReady ? "#007acc" : "#ccc",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: isDataReady ? "pointer" : "not-allowed",
                fontSize: "14px",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {isAsking && <LoadingSpinner size={16} />}
              {isAsking ? "Đang suy nghĩ..." : "🚀 Hỏi AI (Raw JSON)"}
            </button>

            <div style={{ fontSize: "12px", color: "#666" }}>
              {keyUsageInfo && `${keyUsageInfo.totalRecords} records`}
              {apiTestResults && ` | ${apiTestResults.workingKeys}/${apiTestResults.totalKeys} APIs`}
              {keyUsageInfo && keyUsageInfo.format && ` | ${keyUsageInfo.format}`}
            </div>
          </div>

          {/* Answer */}
          {answer && (
            <div
              style={{
                marginTop: "20px",
                padding: "15px",
                backgroundColor: answer.includes("❌") ? "#ffe6e6" : "#e8f5e8",
                border: `1px solid ${answer.includes("❌") ? "#ff4444" : "#4caf50"}`,
                borderRadius: "8px",
              }}
            >
              <h4 style={{ margin: "0 0 10px 0", color: "#333" }}>💡 Câu trả lời từ Llama 4 Scout (Raw JSON)</h4>
              <div style={{ whiteSpace: "pre-wrap", fontSize: "14px", lineHeight: "1.5" }}>{answer}</div>
              {keyUsageInfo && (
                <div style={{ marginTop: "10px", fontSize: "12px", color: "#666" }}>
                  📊 Dựa trên {keyUsageInfo.totalRecords} records qua Raw JSON Pipeline với API {keyUsageInfo.usedAPI}
                  {keyUsageInfo.stats && keyUsageInfo.stats.dataIntegrityRate && (
                    <span> | Data integrity: {keyUsageInfo.stats.dataIntegrityRate.toFixed(1)}%</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add CSS for spinner animation */}
      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
}
