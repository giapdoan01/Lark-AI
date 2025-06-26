"use client"
import { useEffect, useState } from "react"
import { getTableStats, getTableData } from "../lib/base"
import { analyzeDataSimple, answerQuestion, testAPI } from "../lib/groqClient"

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

  // Load data when component mounts
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        console.log(`📊 Loading data from table: ${tableName}`)

        // Test API first
        const apiTest = await testAPI()
        if (!apiTest.success) {
          throw new Error("No working API keys")
        }

        // Get table stats
        const tableStats = await getTableStats(tableId)
        setStats(tableStats)
        console.log(`📊 Table stats:`, tableStats)

        // Get table data
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

  if (loading) {
    return (
      <div style={{ padding: "20px" }}>
        <h2>📊 Loading "{tableName}"...</h2>
        <div>🔄 Getting table data...</div>
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
    </div>
  )
}
