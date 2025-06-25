"use client"
import { useEffect, useState, useRef } from "react"
import {
  getTableData,
  getTableStats,
  testTableDataSample,
  checkSDKStatus,
  debugTableStructure,
  testTableAccess,
} from "../lib/base"
import { preprocessDataWithPipeline, answerQuestionWithData } from "../lib/groqClient"

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

  // Refs
  const hasLoadedData = useRef(false)
  const hasRunPipeline = useRef(false)
  const isInitializing = useRef(false)

  // 🎨 Pipeline Steps
  const pipelineSteps = ["Kiểm tra SDK", "Lấy dữ liệu", "Chia đều chunks", "Thống kê AI", "Phân tích tổng hợp"]

  // 🔧 Optimized Functions
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
    setCurrentStep(2)

    try {
      setProcessingStatus("🚀 Bắt đầu Equal Distribution Pipeline...")

      const result = await preprocessDataWithPipeline(data, tableName)

      if (result.success) {
        setOptimizedData(result.optimizedData)
        setAutoAnalysis(result.analysis)
        setKeyUsageInfo(result.keyUsage)
        setIsDataReady(true)
        setCurrentStep(4)
        setProcessingStatus("✅ Pipeline hoàn thành!")
      } else {
        setAutoAnalysis(result.analysis)
        setIsDataReady(false)
        setProcessingStatus("❌ Pipeline thất bại")
      }
    } catch (err) {
      console.error("❌ Pipeline error:", err)
      setAutoAnalysis("❌ Không thể thực hiện Equal Distribution pipeline.")
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

        // Step 2: Get Data
        setProcessingStatus("📊 Lấy thống kê bảng...")
        const stats = await getTableStats(tableId)
        setTableStats(stats)

        setProcessingStatus(`📥 Lấy TẤT CẢ ${stats.totalRecords} records...`)
        const data = await getTableData(tableId)
        setTableData(data)
        hasLoadedData.current = true
        setCurrentStep(2)

        console.log(`✅ Loaded ${data.length} records from table (expected: ${stats.totalRecords})`)

        if (data.length === 0) {
          setError("Bảng không có dữ liệu.")
          return
        }

        // 🔥 IMPORTANT: Validation - check for data loss
        if (data.length !== stats.totalRecords) {
          console.warn(`⚠️ POTENTIAL DATA LOSS: Expected ${stats.totalRecords}, got ${data.length} records`)
        }

        // Step 3: Process Data
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

  // 🔧 Optimized Question Handler
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

        {isAutoAnalyzing && (
          <StatusCard
            title="🚀 Equal Distribution Pipeline"
            status="Đang chia đều records cho các APIs và thống kê..."
            details="Chia đều → Thống kê song song → Gộp kết quả → Phân tích tổng hợp"
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

      {/* Status Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "20px" }}>
        {tableStats && (
          <StatusCard
            title="📊 Thống kê bảng"
            status={`${tableStats.totalRecords} records, ${tableStats.totalFields} fields`}
            details={`Loaded: ${tableData.length} records`}
            type={tableData.length === tableStats.totalRecords ? "success" : "warning"}
          />
        )}

        {keyUsageInfo && (
          <StatusCard
            title="🔧 Equal Distribution Pipeline"
            status={`${keyUsageInfo.processedChunks || 0} chunks processed`}
            details={
              keyUsageInfo.dataLoss
                ? `⚠️ Data loss: ${keyUsageInfo.dataLoss} records | Strategy: ${keyUsageInfo.strategy}`
                : `✅ No data loss | Strategy: ${keyUsageInfo.strategy}`
            }
            type={keyUsageInfo.dataLoss > 0 ? "warning" : "success"}
          />
        )}
      </div>

      {/* Data Loss Warning */}
      {keyUsageInfo && keyUsageInfo.dataLoss > 0 && (
        <StatusCard
          title="⚠️ Cảnh báo mất dữ liệu"
          status={`Mất ${keyUsageInfo.dataLoss} records trong quá trình xử lý`}
          details={`Expected: ${keyUsageInfo.totalRecords}, Processed: ${keyUsageInfo.processedRecords}`}
          type="warning"
        />
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
            title="🤖 Phân tích tổng hợp AI"
            status="Phân tích từ tất cả chunks hoàn thành"
            details={
              keyUsageInfo
                ? `${keyUsageInfo.processedRecords}/${keyUsageInfo.totalRecords} records được phân tích`
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
                ✅ Sẵn sàng! AI đã phân tích {tableData.length} records qua Equal Distribution Pipeline.
                {keyUsageInfo && keyUsageInfo.dataLoss > 0 && (
                  <span style={{ color: "#ff9800" }}> (⚠️ Mất {keyUsageInfo.dataLoss} records trong xử lý)</span>
                )}
              </span>
            ) : (
              <span style={{ color: "#ff9800" }}>⏳ Đang xử lý {tableData.length} records...</span>
            )}
          </div>

          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ví dụ: Phân tích theo phòng ban, thống kê thiết bị, tìm xu hướng..."
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
              {isAsking ? "Đang suy nghĩ..." : "🚀 Hỏi AI"}
            </button>

            <div style={{ fontSize: "12px", color: "#666" }}>
              {keyUsageInfo && `${keyUsageInfo.processedRecords}/${keyUsageInfo.totalRecords} records`}
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
              <h4 style={{ margin: "0 0 10px 0", color: "#333" }}>💡 Câu trả lời từ AI</h4>
              <div style={{ whiteSpace: "pre-wrap", fontSize: "14px", lineHeight: "1.5" }}>{answer}</div>
              {keyUsageInfo && (
                <div style={{ marginTop: "10px", fontSize: "12px", color: "#666" }}>
                  📊 Dựa trên {keyUsageInfo.processedRecords}/{keyUsageInfo.totalRecords} records qua Equal Distribution
                  Pipeline
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
