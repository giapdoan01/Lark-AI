"use client"
import { useEffect, useState } from "react"
import { getTableStats, getTableData, debugSingleRecord } from "../lib/base"
import { analyzeDataSimple, answerQuestion, testAllApiKeys } from "../lib/groqClient"

interface ChatBotProps {
  tableId: string
  tableName: string
}

export default function ChatBot({ tableId, tableName }: ChatBotProps) {
  const [tableData, setTableData] = useState<Array<{ recordId: string; fields: Record<string, any> }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [isAsking, setIsAsking] = useState(false)
  const [analysis, setAnalysis] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [stats, setStats] = useState<any>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  // Load data when component mounts
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        console.log(`📊 Loading data from table: ${tableName}`)

        // Test API first
        console.log(`🧪 Testing API keys...`)
        const apiTest = await testAllApiKeys()
        console.log(`🔑 API test result:`, apiTest)

        if (!apiTest.success) {
          throw new Error(`No working API keys: ${apiTest.message}`)
        }

        // Get table stats
        console.log(`📊 Getting table stats...`)
        const tableStats = await getTableStats(tableId)
        setStats(tableStats)
        console.log(`📊 Table stats:`, tableStats)

        // Debug single record first
        console.log(`🔍 Debugging single record...`)
        const debugResult = await debugSingleRecord(tableId, 0)
        setDebugInfo(debugResult)
        console.log(`🔍 Debug result:`, debugResult)

        // Get table data
        console.log(`📊 Getting full table data...`)
        const data = await getTableData(tableId)
        setTableData(data)
        console.log(`✅ Loaded ${data.length} records`)

        // Auto analyze if we have data
        if (data.length > 0) {
          setIsAnalyzing(true)
          const analysisResult = await analyzeDataSimple(data, tableName)
          if (analysisResult.success) {
            setAnalysis(analysisResult.analysis)
          } else {
            setAnalysis(analysisResult.analysis)
          }
          setIsAnalyzing(false)
        }
      } catch (err) {
        console.error("❌ Error loading data:", err)
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setLoading(false)
      }
    }

    if (tableId) {
      loadData()
    }
  }, [tableId, tableName])

  const handleAskQuestion = async () => {
    if (!question.trim() || tableData.length === 0) return

    setIsAsking(true)
    setAnswer("")

    try {
      const response = await answerQuestion(tableData, tableName, question)
      setAnswer(response)
    } catch (err) {
      setAnswer(`❌ Error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsAsking(false)
    }
  }

  const handleDebugRecord = async () => {
    try {
      console.log(`🔍 Re-debugging first record...`)
      const debugResult = await debugSingleRecord(tableId, 0)
      setDebugInfo(debugResult)
      console.log(`🔍 Fresh debug result:`, debugResult)
    } catch (err) {
      console.error("❌ Debug failed:", err)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: "20px" }}>
        <h2>📊 Loading "{tableName}"...</h2>
        <div>🔄 Getting table data...</div>
        <div style={{ fontSize: "12px", color: "#666", marginTop: "10px" }}>
          Check browser console for detailed API call logs
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: "20px" }}>
        <h2>❌ Error</h2>
        <div style={{ color: "red", marginBottom: "10px" }}>{error}</div>
        <button onClick={() => window.location.reload()}>🔄 Retry</button>
      </div>
    )
  }

  return (
    <div style={{ padding: "20px", maxWidth: "800px" }}>
      {/* Header */}
      <h2>📊 {tableName}</h2>

      {/* Stats */}
      {stats && (
        <div
          style={{
            padding: "15px",
            backgroundColor: "#f0f0f0",
            borderRadius: "8px",
            marginBottom: "20px",
          }}
        >
          <div>
            📊 Records: {tableData.length}/{stats.totalRecords}
          </div>
          <div>📋 Fields: {stats.totalFields}</div>
          <div>
            ✅ Data loaded: {tableData.filter((r) => Object.keys(r.fields).length > 0).length} records with data
          </div>
        </div>
      )}

      {/* Debug Info */}
      {debugInfo && (
        <div
          style={{
            padding: "15px",
            backgroundColor: "#e8f4fd",
            borderRadius: "8px",
            marginBottom: "20px",
            border: "1px solid #007acc",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <h3 style={{ margin: 0 }}>🔍 Debug Info (First Record)</h3>
            <button
              onClick={handleDebugRecord}
              style={{
                padding: "5px 10px",
                backgroundColor: "#007acc",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              🔄 Re-debug
            </button>
          </div>

          <div style={{ fontSize: "13px" }}>
            <div>📋 Record ID: {debugInfo.recordId}</div>
            <div>📊 Record has fields: {debugInfo.summary.recordHasFields ? "✅ Yes" : "❌ No"}</div>
            <div>📊 Record field count: {debugInfo.summary.recordFieldCount}</div>
            <div>📊 Cell value tests: {debugInfo.summary.cellValueCount}</div>
            <div>📊 Fields with data: {debugInfo.summary.fieldsWithData}</div>
          </div>

          <details style={{ marginTop: "10px" }}>
            <summary style={{ cursor: "pointer", fontWeight: "500" }}>View Raw Debug Data</summary>
            <pre
              style={{
                fontSize: "10px",
                backgroundColor: "#f8f9fa",
                padding: "10px",
                borderRadius: "4px",
                marginTop: "5px",
                maxHeight: "200px",
                overflow: "auto",
              }}
            >
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {/* Analysis */}
      {isAnalyzing && (
        <div style={{ marginBottom: "20px" }}>
          <div>🤖 Analyzing data...</div>
        </div>
      )}

      {analysis && (
        <div
          style={{
            marginBottom: "20px",
            padding: "15px",
            backgroundColor: "#e8f5e8",
            borderRadius: "8px",
            border: "1px solid #4caf50",
          }}
        >
          <h3>🤖 AI Analysis</h3>
          <div style={{ whiteSpace: "pre-wrap", fontSize: "14px" }}>{analysis}</div>
        </div>
      )}

      {/* Question Interface */}
      {tableData.length > 0 && (
        <div
          style={{
            padding: "20px",
            backgroundColor: "white",
            border: "1px solid #ddd",
            borderRadius: "8px",
          }}
        >
          <h3>🤖 Ask questions about the data</h3>

          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask questions about your data..."
            rows={3}
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              marginBottom: "10px",
            }}
          />

          <button
            onClick={handleAskQuestion}
            disabled={isAsking || !question.trim()}
            style={{
              padding: "10px 20px",
              backgroundColor: "#007acc",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {isAsking ? "🤔 Thinking..." : "🚀 Ask AI"}
          </button>

          {answer && (
            <div
              style={{
                marginTop: "15px",
                padding: "15px",
                backgroundColor: "#f8f9fa",
                border: "1px solid #dee2e6",
                borderRadius: "4px",
              }}
            >
              <h4>💡 Answer</h4>
              <div style={{ whiteSpace: "pre-wrap" }}>{answer}</div>
            </div>
          )}
        </div>
      )}

      {/* Console Log Notice */}
      <div
        style={{
          marginTop: "20px",
          padding: "10px",
          backgroundColor: "#fff3cd",
          border: "1px solid #ffc107",
          borderRadius: "4px",
          fontSize: "12px",
          color: "#856404",
        }}
      >
        💡 <strong>Tip:</strong> Mở Browser Console (F12) để xem detailed logs của tất cả API calls tới Lark Base
      </div>
    </div>
  )
}
