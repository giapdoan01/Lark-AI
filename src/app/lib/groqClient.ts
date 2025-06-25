import { Groq } from "groq-sdk"

// Danh sách API keys
const API_KEYS = [
  process.env.NEXT_PUBLIC_GROQ_API_KEY_1 || "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",
  process.env.NEXT_PUBLIC_GROQ_API_KEY_2 || "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",
  process.env.NEXT_PUBLIC_GROQ_API_KEY_3 || "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",
  process.env.NEXT_PUBLIC_GROQ_API_KEY_4 || "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",
  process.env.NEXT_PUBLIC_GROQ_API_KEY_5 || "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",
].filter((key) => key && !key.includes("account") && key.startsWith("gsk_"))

const SINGLE_MODEL = "llama3-70b-8192"

// Cache đơn giản
const testResultsCache = new Map<string, boolean>()

// Function ước tính số tokens
const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / 4)
}

// Extract plain text từ Lark Base fields
const extractPlainTextFromField = (value: unknown): string => {
  if (value === null || value === undefined) {
    return ""
  }

  if (typeof value === "string") {
    return value.trim()
  }

  if (typeof value === "number") {
    return String(value)
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No"
  }

  if (typeof value === "object") {
    try {
      const jsonStr = JSON.stringify(value)

      // Handle array of text objects: [{"type":"text","text":"Intel Pentium"}]
      if (jsonStr.includes('"type":"text"') && jsonStr.includes('"text":')) {
        const textMatches = jsonStr.match(/"text":"([^"]+)"/g)
        if (textMatches) {
          const texts = textMatches.map((match) => match.replace(/"text":"([^"]+)"/, "$1"))
          return texts.join(", ")
        }
      }

      // Handle single option object: {"id":"optr5hYAsF","text":"SSD-128"}
      if (jsonStr.includes('"text":') && jsonStr.includes('"id":')) {
        const textMatch = jsonStr.match(/"text":"([^"]+)"/)
        if (textMatch) {
          return textMatch[1]
        }
      }

      // Handle array of option objects
      if (jsonStr.startsWith("[") && jsonStr.includes('"text":')) {
        const textMatches = jsonStr.match(/"text":"([^"]+)"/g)
        if (textMatches) {
          const texts = textMatches.map((match) => match.replace(/"text":"([^"]+)"/, "$1"))
          return texts.join(", ")
        }
      }

      if (jsonStr === "[null]" || jsonStr === "null") {
        return ""
      }

      // Fallback: return first text value found
      const anyTextMatch = jsonStr.match(/"([^"]+)"/g)
      if (anyTextMatch && anyTextMatch.length > 0) {
        const values = anyTextMatch
          .map((match) => match.replace(/"/g, ""))
          .filter((val) => !["type", "id", "text"].includes(val))

        if (values.length > 0) {
          return values.join(", ")
        }
      }

      return ""
    } catch (error) {
      console.warn("Error parsing field value:", error)
      return String(value).substring(0, 50)
    }
  }

  return String(value)
}

// CSV Conversion với consistent format
const convertToCSV = (data: Array<{ recordId: string; fields: Record<string, unknown> }>): string => {
  if (data.length === 0) return ""

  console.log(`📊 Converting ${data.length} records to consistent CSV format...`)

  // Get ALL unique field names từ TẤT CẢ records
  const allFieldNames = new Set<string>()
  data.forEach((record) => {
    Object.keys(record.fields).forEach((fieldName) => {
      allFieldNames.add(fieldName)
    })
  })

  const fieldNames = Array.from(allFieldNames).sort()
  console.log(`📋 Found ${fieldNames.length} unique fields:`, fieldNames.slice(0, 5))

  // Create consistent headers
  const headers = ["STT", ...fieldNames]
  const csvHeaders = headers.join(",")

  // Convert records với consistent column structure
  const csvRows = data.map((record, index) => {
    const values = [
      String(index + 1), // STT
      ...fieldNames.map((fieldName) => {
        const rawValue = record.fields[fieldName]
        const cleanValue = extractPlainTextFromField(rawValue)

        if (!cleanValue || cleanValue.trim() === "") {
          return ""
        }

        // Escape commas and quotes for CSV
        if (cleanValue.includes(",") || cleanValue.includes('"') || cleanValue.includes("\n")) {
          return `"${cleanValue.replace(/"/g, '""')}"`
        }

        return cleanValue
      }),
    ]

    return values.join(",")
  })

  const csvContent = [csvHeaders, ...csvRows].join("\n")

  // Calculate compression stats
  const originalJsonSize = JSON.stringify(data).length
  const csvSize = csvContent.length
  const compressionRatio = Math.round((1 - csvSize / originalJsonSize) * 100)

  console.log(`✅ Consistent CSV Conversion Complete:`)
  console.log(`  📊 Records: ${data.length}`)
  console.log(`  📋 Fields: ${fieldNames.length}`)
  console.log(`  📄 Total columns: ${headers.length}`)
  console.log(`  📄 Original JSON: ${originalJsonSize} chars`)
  console.log(`  📄 Consistent CSV: ${csvSize} chars`)
  console.log(`  🎯 Compression: ${compressionRatio}% smaller`)

  return csvContent
}

// 🔥 NEW: Equal distribution chunking với detailed logging
const createEqualDistributionChunks = (
  csvContent: string,
  workingAPICount: number,
): { csvChunks: string[]; chunkStats: any[] } => {
  console.log(`📊 ===== EQUAL DISTRIBUTION CHUNKING =====`)

  const lines = csvContent.split("\n")
  const headerLine = lines[0]
  const dataLines = lines.slice(1)

  console.log(`📋 Total: ${lines.length} lines (1 header + ${dataLines.length} data rows)`)
  console.log(`🔧 Working APIs for processing: ${workingAPICount}`)

  // 🔥 IMPORTANT: Chia đều records cho working APIs
  const recordsPerAPI = Math.floor(dataLines.length / workingAPICount)
  const remainingRecords = dataLines.length % workingAPICount

  console.log(`📊 Records per API: ${recordsPerAPI}`)
  console.log(`📊 Remaining records: ${remainingRecords}`)

  const csvChunks: string[] = []
  const chunkStats: any[] = []

  // 🔥 Chia đều records cho từng working API
  for (let apiIndex = 0; apiIndex < workingAPICount; apiIndex++) {
    const startIndex = apiIndex * recordsPerAPI
    let endIndex = startIndex + recordsPerAPI

    // 🔥 API cuối cùng nhận thêm remaining records
    if (apiIndex === workingAPICount - 1) {
      endIndex += remainingRecords
    }

    const chunkDataLines = dataLines.slice(startIndex, endIndex)
    const chunkCSV = headerLine + "\n" + chunkDataLines.join("\n")

    csvChunks.push(chunkCSV)

    const chunkStat = {
      apiIndex: apiIndex + 1,
      startRecord: startIndex + 1,
      endRecord: endIndex,
      recordCount: chunkDataLines.length,
      characters: chunkCSV.length,
      estimatedTokens: estimateTokens(chunkCSV),
    }

    chunkStats.push(chunkStat)

    console.log(
      `📦 Working API ${apiIndex + 1}: Records ${startIndex + 1}-${endIndex} (${chunkDataLines.length} records, ${chunkCSV.length} chars)`,
    )
  }

  // 🔥 Validation: Đảm bảo không mất records
  const totalProcessedRecords = chunkStats.reduce((sum, stat) => sum + stat.recordCount, 0)
  console.log(`✅ Validation: ${totalProcessedRecords}/${dataLines.length} records distributed`)

  if (totalProcessedRecords !== dataLines.length) {
    console.error(`❌ DATA LOSS DETECTED: ${dataLines.length - totalProcessedRecords} records missing!`)
  } else {
    console.log(`✅ NO DATA LOSS: All ${dataLines.length} records distributed correctly`)
  }

  console.log(`===============================================`)

  return { csvChunks, chunkStats }
}

// CSV Validation
const validateCSV = (csvContent: string): { isValid: boolean; rowCount: number; error?: string } => {
  try {
    const lines = csvContent.trim().split("\n")
    if (lines.length < 2) {
      return { isValid: false, rowCount: 0, error: "CSV must have at least header and one data row" }
    }

    const headerCount = lines[0].split(",").length
    let validRows = 0

    for (let i = 1; i < lines.length; i++) {
      const rowCols = lines[i].split(",").length
      if (rowCols === headerCount) {
        validRows++
      }
    }

    return {
      isValid: validRows > 0,
      rowCount: validRows,
      error: validRows === 0 ? "No valid data rows found" : undefined,
    }
  } catch (error) {
    return {
      isValid: false,
      rowCount: 0,
      error: `CSV validation error: ${error}`,
    }
  }
}

// 🔥 ENHANCED: Test single API key với detailed logging
const testSingleAPI = async (keyIndex: number): Promise<{ success: boolean; details: any }> => {
  const cacheKey = `test_${keyIndex}`

  if (testResultsCache.has(cacheKey)) {
    console.log(`🔄 Using cached test result for API ${keyIndex + 1}`)
    return {
      success: testResultsCache.get(cacheKey)!,
      details: { cached: true, keyIndex: keyIndex + 1 },
    }
  }

  try {
    const apiKey = API_KEYS[keyIndex]
    console.log(`🧪 Testing API ${keyIndex + 1} with ${SINGLE_MODEL}`)

    const groq = createGroqClient(apiKey)
    const startTime = Date.now()

    const testCompletion = await groq.chat.completions.create({
      model: SINGLE_MODEL,
      messages: [
        {
          role: "user",
          content: "Test: Return 'OK'",
        },
      ],
      temperature: 0.1,
      max_tokens: 10,
    })

    const responseTime = Date.now() - startTime
    const response = testCompletion?.choices?.[0]?.message?.content
    const success = !!response

    // Cache result
    testResultsCache.set(cacheKey, success)

    const details = {
      keyIndex: keyIndex + 1,
      status: success ? "success" : "failed",
      response: response,
      responseTime: responseTime,
      preview: `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`,
      model: SINGLE_MODEL,
      error: success ? null : "No response content",
    }

    console.log(
      `${success ? "✅" : "❌"} API ${keyIndex + 1} ${SINGLE_MODEL}: ${success ? "OK" : "FAILED"} (${responseTime}ms)`,
    )
    if (success) {
      console.log(`🔍 Response: "${response}"`)
    }

    return { success, details }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.log(`❌ API ${keyIndex + 1} ${SINGLE_MODEL} failed: ${errorMsg}`)

    testResultsCache.set(cacheKey, false)

    const details = {
      keyIndex: keyIndex + 1,
      status: "failed",
      error: errorMsg,
      preview: `${API_KEYS[keyIndex].substring(0, 10)}...${API_KEYS[keyIndex].substring(API_KEYS[keyIndex].length - 4)}`,
      model: SINGLE_MODEL,
      response: null,
      responseTime: 0,
    }

    return { success: false, details }
  }
}

const createGroqClient = (apiKey: string): Groq => {
  return new Groq({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true,
  })
}

// Summarize CSV chunk thay vì optimize
const summarizeCSVChunk = async (
  apiKey: string,
  keyIndex: number,
  csvChunk: string,
  chunkIndex: number,
  totalChunks: number,
): Promise<{ success: boolean; summary: string; keyIndex: number; recordCount: number; error?: string }> => {
  try {
    const lines = csvChunk.trim().split("\n")
    const dataRowCount = lines.length - 1 // Trừ header

    console.log(`\n📊 ===== API ${keyIndex + 1} - SUMMARIZE CHUNK ${chunkIndex + 1}/${totalChunks} =====`)
    console.log(`📊 INPUT: ${dataRowCount} records`)
    console.log(`⚡ Model: ${SINGLE_MODEL}`)

    // Validate CSV
    const csvValidation = validateCSV(csvChunk)
    if (!csvValidation.isValid) {
      console.log(`❌ CSV VALIDATION FAILED: ${csvValidation.error}`)
      return {
        success: false,
        summary: "",
        keyIndex: keyIndex,
        recordCount: 0,
        error: `CSV validation failed: ${csvValidation.error}`,
      }
    }

    console.log(`✅ CSV Validation: ${csvValidation.rowCount} valid rows`)

    const groq = createGroqClient(apiKey)

    // Summarize prompt thay vì optimize
    const summarizePrompt = `Thống kê dữ liệu CSV này một cách ngắn gọn nhất có thể:

${csvChunk}

Trả về thống kê theo format:
- Tổng records: [số]
- Các trường chính: [liệt kê]
- Thống kê quan trọng: [ngắn gọn]
- Insights: [1-2 câu]

Chỉ trả về thống kê, không giải thích thêm:`

    const promptTokens = estimateTokens(summarizePrompt)
    console.log(`📤 Sending summarize request: ${promptTokens} input tokens`)

    const startTime = Date.now()

    const completion = await groq.chat.completions.create({
      model: SINGLE_MODEL,
      messages: [{ role: "user", content: summarizePrompt }],
      temperature: 0.1,
      max_tokens: 500, // Giảm tokens cho summary
    })

    const responseTime = Date.now() - startTime
    console.log(`📥 Response received (${responseTime}ms)`)

    if (!completion?.choices?.[0]?.message?.content) {
      const errorMsg = "Empty response from API"
      console.log(`❌ ${errorMsg}`)
      return {
        success: false,
        summary: "",
        keyIndex: keyIndex,
        recordCount: dataRowCount,
        error: errorMsg,
      }
    }

    const summary = completion.choices[0].message.content.trim()
    const outputTokens = estimateTokens(summary)

    console.log(`📊 OUTPUT: ${outputTokens} tokens`)
    console.log(`⚡ Processing time: ${responseTime}ms`)
    console.log(`✅ SUCCESS: Summarized ${dataRowCount} records`)
    console.log(`📋 Summary preview: ${summary.substring(0, 100)}...`)
    console.log(`===== END CHUNK ${chunkIndex + 1} =====\n`)

    return {
      success: true,
      summary: summary,
      keyIndex: keyIndex,
      recordCount: dataRowCount,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`❌ CHUNK ${chunkIndex + 1} FAILED: ${errorMsg}`)

    return {
      success: false,
      summary: `❌ Lỗi thống kê chunk ${chunkIndex + 1}: ${errorMsg}`,
      keyIndex: keyIndex,
      recordCount: 0,
      error: errorMsg,
    }
  }
}

// 🔥 UPDATED: Main pipeline với enhanced API testing
export const preprocessDataWithPipeline = async (
  data: any[],
  tableName: string,
): Promise<{ success: boolean; optimizedData: string; analysis: string; keyUsage: any }> => {
  try {
    console.log(`🚀 Equal Distribution Summarization Pipeline với ${data.length} records - Model: ${SINGLE_MODEL}`)

    if (!API_KEYS || API_KEYS.length < 2) {
      throw new Error("Cần ít nhất 2 API keys (1 cho processing, 1 cho analysis)")
    }

    // 🔥 BƯỚC 1: Convert to consistent CSV
    console.log(`📊 BƯỚC 1: Convert to consistent CSV format...`)
    const fullCSV = convertToCSV(data)

    if (!fullCSV) {
      throw new Error("Không thể tạo CSV content")
    }

    // 🔥 BƯỚC 2: Test ALL processing APIs (không test analysis API)
    const processingAPICount = API_KEYS.length - 1
    console.log(`🧪 BƯỚC 2: Test ${processingAPICount} processing APIs...`)

    const apiTestResults = []
    for (let i = 0; i < processingAPICount; i++) {
      console.log(`🧪 Testing processing API ${i + 1}...`)
      const testResult = await testSingleAPI(i)
      apiTestResults.push(testResult)

      if (testResult.success) {
        console.log(`✅ Processing API ${i + 1} working`)
      } else {
        console.log(`❌ Processing API ${i + 1} failed: ${testResult.details.error}`)
      }
    }

    const workingAPIResults = apiTestResults.filter((result) => result.success)
    const workingAPICount = workingAPIResults.length
    console.log(`🔑 ${workingAPICount}/${processingAPICount} processing APIs hoạt động`)

    // 🔥 Log failed APIs
    const failedAPIs = apiTestResults.filter((result) => !result.success)
    if (failedAPIs.length > 0) {
      console.log(`❌ Failed APIs:`)
      failedAPIs.forEach((failed) => {
        console.log(`  API ${failed.details.keyIndex}: ${failed.details.error}`)
      })
    }

    if (workingAPICount === 0) {
      console.log(`⚠️ No working processing APIs, using raw CSV`)
      return {
        success: true,
        optimizedData: fullCSV,
        analysis: `⚠️ Không có processing APIs hoạt động với ${SINGLE_MODEL}, sử dụng raw CSV với ${data.length} records.`,
        keyUsage: {
          error: true,
          format: "Raw CSV",
          fallback: true,
          model: SINGLE_MODEL,
          failedAPIs: failedAPIs.length,
          totalAPIs: processingAPICount,
        },
      }
    }

    // 🔥 BƯỚC 3: Equal distribution chunking với working APIs
    console.log(`📊 BƯỚC 3: Equal distribution chunking với ${workingAPICount} working APIs...`)
    const { csvChunks, chunkStats } = createEqualDistributionChunks(fullCSV, workingAPICount)

    if (csvChunks.length === 0) {
      throw new Error("Không thể tạo CSV chunks")
    }

    // Show distribution summary
    console.log(`📊 Distribution Summary:`)
    chunkStats.forEach((stat) => {
      console.log(`  Working API ${stat.apiIndex}: ${stat.recordCount} records (${stat.startRecord}-${stat.endRecord})`)
    })

    // 🔥 BƯỚC 4: Summarize chunks với working APIs
    console.log(`⏳ BƯỚC 4: Summarize ${csvChunks.length} CSV chunks với ${workingAPICount} working APIs...`)

    const summaryResults = []

    // Xử lý từng chunk với working API tương ứng
    for (let i = 0; i < csvChunks.length; i++) {
      const csvChunk = csvChunks[i]
      const workingAPIResult = workingAPIResults[i] // Sử dụng working API tương ứng
      const actualAPIIndex = workingAPIResult.details.keyIndex - 1 // Convert to 0-based index

      console.log(
        `📊 Summarizing chunk ${i + 1}/${csvChunks.length} với working API ${workingAPIResult.details.keyIndex}`,
      )
      console.log(`📊 Chunk stats: ${chunkStats[i].recordCount} records`)

      // CHỈ 1 REQUEST DUY NHẤT - SUMMARIZE
      const result = await summarizeCSVChunk(API_KEYS[actualAPIIndex], actualAPIIndex, csvChunk, i, csvChunks.length)

      summaryResults.push(result)

      // Delay nhỏ giữa các chunks
      if (i < csvChunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    // 🔥 BƯỚC 5: Validate results
    const successfulResults = summaryResults.filter((r) => r && r.success)
    console.log(`📊 Results: ${successfulResults.length}/${csvChunks.length} chunks thành công`)

    if (successfulResults.length === 0) {
      console.log(`❌ All chunks failed, using raw CSV`)
      return {
        success: true,
        optimizedData: fullCSV,
        analysis: `⚠️ Tất cả chunks thất bại với ${SINGLE_MODEL}, sử dụng raw CSV với ${data.length} records.`,
        keyUsage: {
          totalKeys: API_KEYS.length,
          processedChunks: 0,
          fallback: true,
          format: "Raw CSV",
          model: SINGLE_MODEL,
          failedAPIs: failedAPIs.length,
          workingAPIs: workingAPICount,
        },
      }
    }

    // 🔥 BƯỚC 6: Calculate data loss
    const totalProcessedRecords = successfulResults.reduce((sum, result) => sum + result.recordCount, 0)
    const dataLoss = data.length - totalProcessedRecords
    console.log(`📊 Total processed records: ${totalProcessedRecords}/${data.length}`)

    // 🔥 IMPORTANT: Validation - đảm bảo tracking data loss
    if (dataLoss > 0) {
      console.warn(`⚠️ DATA LOSS: ${dataLoss} records not processed due to ${failedAPIs.length} failed API(s)`)
    } else {
      console.log(`✅ NO DATA LOSS: All ${data.length} records processed`)
    }

    const combinedSummaries = successfulResults
      .map((result, index) => `=== CHUNK ${index + 1} (${result.recordCount} records) ===\n${result.summary}`)
      .join("\n\n")

    // 🔥 BƯỚC 7: Final analysis với API cuối cùng
    const analysisAPIIndex = API_KEYS.length - 1
    console.log(`🤖 BƯỚC 7: Final analysis với API ${analysisAPIIndex + 1} - Model: ${SINGLE_MODEL}`)

    const finalAnalysisPrompt = `Phân tích tổng hợp dữ liệu từ bảng "${tableName}" (${data.length} records, processed: ${totalProcessedRecords}):

${combinedSummaries}

Tổng hợp phân tích:
1. Tổng quan toàn bộ dữ liệu
2. Thống kê chính từ tất cả chunks
3. Insights quan trọng nhất
4. Kết luận

${dataLoss > 0 ? `\nLưu ý: Có ${dataLoss} records không được xử lý do API lỗi.` : ""}

Trả lời ngắn gọn bằng tiếng Việt:`

    const finalAnalysis = await analyzeWithLlama(API_KEYS[analysisAPIIndex], finalAnalysisPrompt)

    const keyUsage = {
      totalKeys: API_KEYS.length,
      processingKeys: processingAPICount,
      workingKeys: workingAPICount,
      failedKeys: failedAPIs.length,
      analysisKeys: 1,
      processedChunks: successfulResults.length,
      totalRecords: data.length,
      processedRecords: totalProcessedRecords,
      dataLoss: dataLoss,
      successRate: `${Math.round((successfulResults.length / csvChunks.length) * 100)}%`,
      format: "Summarized CSV",
      model: SINGLE_MODEL,
      strategy: "Equal Distribution + Summarization",
      failedAPIDetails: failedAPIs.map((f) => ({
        apiIndex: f.details.keyIndex,
        error: f.details.error,
        preview: f.details.preview,
      })),
    }

    return {
      success: true,
      optimizedData: fullCSV, // Return original CSV for reference
      analysis: finalAnalysis,
      keyUsage: keyUsage,
    }
  } catch (error) {
    console.error("❌ Equal Distribution Pipeline failed:", error)

    const rawCSV = convertToCSV(data)
    return {
      success: true,
      optimizedData: rawCSV,
      analysis: `❌ Pipeline error với ${SINGLE_MODEL}: ${error}. Sử dụng raw CSV với ${data.length} records.`,
      keyUsage: { error: true, format: "Raw CSV", model: SINGLE_MODEL, fallback: true },
    }
  }
}

// Analysis với llama3-70b-8192
const analyzeWithLlama = async (apiKey: string, prompt: string): Promise<string> => {
  try {
    const promptTokens = estimateTokens(prompt)
    console.log(`🤖 Final analysis với ${SINGLE_MODEL}: ${promptTokens} tokens`)

    const groq = createGroqClient(apiKey)
    const startTime = Date.now()

    const completion = await groq.chat.completions.create({
      model: SINGLE_MODEL,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    })

    const responseTime = Date.now() - startTime

    if (!completion?.choices?.[0]?.message?.content) {
      throw new Error("No response content")
    }

    const analysis = completion.choices[0].message.content || "Không có phân tích"
    const outputTokens = estimateTokens(analysis)

    console.log(`✅ Final analysis complete: ${outputTokens} tokens (${responseTime}ms)`)

    return analysis
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`❌ Final analysis failed: ${errorMsg}`)
    return `❌ Không thể phân tích với ${SINGLE_MODEL}: ${errorMsg}`
  }
}

// Answer question với CSV
export const answerQuestionWithOptimizedData = async (
  optimizedCSVData: string,
  tableName: string,
  question: string,
  originalRecordCount: number,
): Promise<string> => {
  try {
    console.log(`🤔 Trả lời câu hỏi với CSV data (${originalRecordCount} records)`)

    const maxCSVLength = 4000
    const truncatedCSV =
      optimizedCSVData.length > maxCSVLength ? optimizedCSVData.substring(0, maxCSVLength) + "..." : optimizedCSVData

    const questionPrompt = `Dữ liệu từ bảng "${tableName}" (${originalRecordCount} records):

${truncatedCSV}

Câu hỏi: ${question}

Trả lời ngắn gọn bằng tiếng Việt:`

    const analysisAPIIndex = API_KEYS.length - 1
    return await analyzeWithLlama(API_KEYS[analysisAPIIndex], questionPrompt)
  } catch (error) {
    console.error("❌ answerQuestionWithOptimizedData failed:", error)
    return `❌ Lỗi khi trả lời câu hỏi với ${SINGLE_MODEL}: ${error}`
  }
}

// Export functions
export const analyzeDataWithParallelKeys = preprocessDataWithPipeline

export const answerQuestionWithData = async (
  data: any[],
  tableName: string,
  question: string,
  previousAnalysis?: string,
  optimizedData?: string,
): Promise<string> => {
  try {
    if (optimizedData && optimizedData.length > 0) {
      return await answerQuestionWithOptimizedData(optimizedData, tableName, question, data.length)
    } else {
      const quickCSV = convertToCSV(data.slice(0, 30))
      return await answerQuestionWithOptimizedData(quickCSV, tableName, question, data.length)
    }
  } catch (error) {
    console.error("❌ answerQuestionWithData failed:", error)
    return `❌ Lỗi khi trả lời câu hỏi: ${error}`
  }
}

// 🔥 ENHANCED: Test all API keys với detailed results
export const testAllApiKeys = async (): Promise<{
  success: boolean
  message: string
  workingKeys: number
  totalKeys: number
  keyDetails: any[]
}> => {
  console.log(`🧪 Testing ${API_KEYS.length} API keys với ${SINGLE_MODEL}...`)

  const testPromises = API_KEYS.map(async (apiKey, index) => {
    try {
      const groq = createGroqClient(apiKey)
      const startTime = Date.now()

      const testCompletion = await groq.chat.completions.create({
        model: SINGLE_MODEL,
        messages: [
          {
            role: "user",
            content: "Test: Return 'OK'",
          },
        ],
        temperature: 0.1,
        max_tokens: 10,
      })

      const responseTime = Date.now() - startTime
      const response = testCompletion?.choices?.[0]?.message?.content || "No response"
      console.log(`✅ API ${index + 1}: OK (${responseTime}ms)`)

      return {
        keyIndex: index + 1,
        status: "success" as const,
        response: response,
        responseTime: responseTime,
        preview: `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`,
        model: SINGLE_MODEL,
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.log(`❌ API ${index + 1}: ${errorMsg}`)
      return {
        keyIndex: index + 1,
        status: "failed" as const,
        error: errorMsg,
        preview: `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`,
        model: SINGLE_MODEL,
        responseTime: 0,
      }
    }
  })

  const results = await Promise.all(testPromises)
  const workingKeys = results.filter((r) => r.status === "success").length

  return {
    success: workingKeys > 0,
    message: `${workingKeys}/${API_KEYS.length} API keys hoạt động với ${SINGLE_MODEL}`,
    workingKeys: workingKeys,
    totalKeys: API_KEYS.length,
    keyDetails: results,
  }
}

// Backward compatibility functions
export const askAI = async (context: string, question: string): Promise<string> => {
  return await answerQuestionWithData([], "Unknown", question)
}

export const askAIWithFullData = async (data: any[], tableName: string, question: string): Promise<string> => {
  return await answerQuestionWithData(data, tableName, question)
}

export const askAIWithRawData = async (data: any[], tableName: string, question: string): Promise<string> => {
  return await answerQuestionWithData(data, tableName, question)
}

export const testGroqAPI = async () => {
  const result = await testAllApiKeys()
  return {
    success: result.success,
    message: result.message,
    workingModel: SINGLE_MODEL,
    format: "Equal Distribution CSV",
  }
}

export const getAvailableModels = (): string[] => {
  return [SINGLE_MODEL]
}

export const getApiKeysInfo = () => {
  return {
    totalKeys: API_KEYS.length,
    keysPreview: API_KEYS.map(
      (key, index) => `API ${index + 1}: ${key.substring(0, 10)}...${key.substring(key.length - 4)} (${SINGLE_MODEL})`,
    ),
    format: "Equal Distribution CSV",
    model: SINGLE_MODEL,
  }
}

export const clearApiCache = () => {
  testResultsCache.clear()
  console.log("🔄 Cache cleared")
}
