import { Groq } from "groq-sdk"

// Danh sách API keys
const API_KEYS = [
  process.env.NEXT_PUBLIC_GROQ_API_KEY_1 || "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",
  process.env.NEXT_PUBLIC_GROQ_API_KEY_2 || "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",
  process.env.NEXT_PUBLIC_GROQ_API_KEY_3 || "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",
  process.env.NEXT_PUBLIC_GROQ_API_KEY_4 || "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",
  process.env.NEXT_PUBLIC_GROQ_API_KEY_5 || "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",
].filter((key) => key && !key.includes("account") && key.startsWith("gsk_"))

// 🔥 UPDATED: Chuyển sang llama3-70b-8192
const SINGLE_MODEL = "llama3-70b-8192"

// 🔥 SIMPLIFIED: Cache đơn giản
const testResultsCache = new Map<string, boolean>()

// Function ước tính số tokens (1 token ≈ 4 characters)
const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / 4)
}

// 🔥 NEW: Function để extract plain text từ Lark Base field values
const extractPlainTextFromField = (value: unknown): string => {
  if (value === null || value === undefined) {
    return ""
  }

  // Nếu là string đơn giản
  if (typeof value === "string") {
    return value.trim()
  }

  // Nếu là number
  if (typeof value === "number") {
    return String(value)
  }

  // Nếu là boolean
  if (typeof value === "boolean") {
    return value ? "Yes" : "No"
  }

  // Nếu là object, cố gắng extract text
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

      // Handle array of option objects: [{"id":"optr5hYAsF","text":"SSD-128"},{"id":"opt6DIhdHV","text":"HDD-256"}]
      if (jsonStr.startsWith("[") && jsonStr.includes('"text":')) {
        const textMatches = jsonStr.match(/"text":"([^"]+)"/g)
        if (textMatches) {
          const texts = textMatches.map((match) => match.replace(/"text":"([^"]+)"/, "$1"))
          return texts.join(", ")
        }
      }

      // Handle [null] arrays
      if (jsonStr === "[null]" || jsonStr === "null") {
        return ""
      }

      // Fallback: return first text value found
      const anyTextMatch = jsonStr.match(/"([^"]+)"/g)
      if (anyTextMatch && anyTextMatch.length > 0) {
        // Filter out keys like "type", "id", "text"
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
      return String(value).substring(0, 50) // Truncate long values
    }
  }

  return String(value)
}

// 🔥 UPDATED: CSV Conversion với plain text extraction
const convertToCSV = (data: Array<{ recordId: string; fields: Record<string, unknown> }>): string => {
  if (data.length === 0) return ""

  console.log(`📊 Converting ${data.length} records to clean CSV format...`)

  // Get all unique field names từ tất cả records
  const allFieldNames = new Set<string>()
  data.forEach((record) => {
    Object.keys(record.fields).forEach((fieldName) => {
      allFieldNames.add(fieldName)
    })
  })

  const fieldNames = Array.from(allFieldNames).sort()
  console.log(`📋 Found ${fieldNames.length} unique fields:`, fieldNames.slice(0, 5))

  // 🔥 NEW: Create simple headers (STT thay vì recordId)
  const headers = ["STT", ...fieldNames]
  const csvHeaders = headers.join(",")

  // 🔥 UPDATED: Convert records to clean CSV rows
  const csvRows = data.map((record, index) => {
    const values = [
      String(index + 1), // STT thay vì recordId dài
      ...fieldNames.map((fieldName) => {
        const rawValue = record.fields[fieldName]
        const cleanValue = extractPlainTextFromField(rawValue)

        // Escape commas and quotes for CSV
        if (cleanValue.includes(",") || cleanValue.includes('"') || cleanValue.includes("\n")) {
          return `"${cleanValue.replace(/"/g, '""')}"`
        }

        return cleanValue || ""
      }),
    ]

    return values.join(",")
  })

  const csvContent = [csvHeaders, ...csvRows].join("\n")

  // 🔥 NEW: Calculate compression stats
  const originalJsonSize = JSON.stringify(data).length
  const csvSize = csvContent.length
  const compressionRatio = Math.round((1 - csvSize / originalJsonSize) * 100)

  console.log(`✅ Clean CSV Conversion Complete:`)
  console.log(`  📊 Records: ${data.length}`)
  console.log(`  📋 Fields: ${fieldNames.length}`)
  console.log(`  📄 Original JSON: ${originalJsonSize} chars`)
  console.log(`  📄 Clean CSV: ${csvSize} chars`)
  console.log(`  🎯 Compression: ${compressionRatio}% smaller`)
  console.log(`  🎯 Estimated tokens: ${estimateTokens(csvContent)}`)

  // Show sample of clean data
  const sampleRows = csvContent.split("\n").slice(0, 3)
  console.log(`📋 Sample clean CSV:`)
  sampleRows.forEach((row, i) => {
    console.log(`  ${i === 0 ? "Header" : `Row ${i}`}: ${row.substring(0, 100)}${row.length > 100 ? "..." : ""}`)
  })

  return csvContent
}

// 🔥 SIMPLIFIED: CSV Validation
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

// 🔥 SIMPLIFIED: Chia CSV thành chunks đơn giản
const createCSVChunks = (data: any[]): { chunks: any[][]; csvChunks: string[] } => {
  console.log(`📊 ===== CSV CHUNKING với ${data.length} records =====`)

  // Chia data thành 4 chunks đều nhau
  const recordsPerChunk = Math.ceil(data.length / 4)
  const chunks: any[][] = []
  const csvChunks: string[] = []

  for (let i = 0; i < 4; i++) {
    const startIndex = i * recordsPerChunk
    const endIndex = Math.min(startIndex + recordsPerChunk, data.length)
    const chunk = data.slice(startIndex, endIndex)

    if (chunk.length > 0) {
      const chunkCSV = convertToCSV(chunk)
      const chunkTokens = estimateTokens(chunkCSV)

      console.log(`📊 Chunk ${i + 1}: ${chunk.length} records, ${chunkTokens} tokens`)
      chunks.push(chunk)
      csvChunks.push(chunkCSV)
    }
  }

  console.log(`📊 Total chunks created: ${chunks.length}`)
  console.log(`===============================================`)

  return { chunks, csvChunks }
}

// 🔥 UPDATED: Test single API key với llama3-70b-8192
const testSingleAPI = async (keyIndex: number): Promise<boolean> => {
  const cacheKey = `test_${keyIndex}`

  // Check cache first
  if (testResultsCache.has(cacheKey)) {
    console.log(`🔄 Using cached test result for API ${keyIndex + 1}`)
    return testResultsCache.get(cacheKey)!
  }

  try {
    const apiKey = API_KEYS[keyIndex]
    console.log(`🧪 Testing API ${keyIndex + 1} with ${SINGLE_MODEL}`)

    const groq = createGroqClient(apiKey)

    // CHỈ 1 REQUEST DUY NHẤT
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

    const response = testCompletion?.choices?.[0]?.message?.content
    const success = !!response

    // Cache result
    testResultsCache.set(cacheKey, success)

    console.log(`✅ API ${keyIndex + 1} ${SINGLE_MODEL}: ${success ? "OK" : "FAILED"}`)
    if (success) {
      console.log(`🔍 Response: "${response}"`)
    }
    return success
  } catch (error) {
    console.log(`❌ API ${keyIndex + 1} ${SINGLE_MODEL} failed:`, error)
    testResultsCache.set(cacheKey, false)
    return false
  }
}

const createGroqClient = (apiKey: string): Groq => {
  return new Groq({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true,
  })
}

// 🔥 UPDATED: Process single CSV chunk với better error handling
const processSingleCSVChunk = async (
  apiKey: string,
  keyIndex: number,
  csvChunk: string,
  chunkIndex: number,
  totalChunks: number,
): Promise<{ success: boolean; optimizedData: string; keyIndex: number; error?: string }> => {
  try {
    const estimatedTokens = estimateTokens(csvChunk)

    console.log(`\n🔧 ===== API ${keyIndex + 1} - CSV CHUNK ${chunkIndex + 1}/${totalChunks} =====`)
    console.log(`📊 INPUT: ${estimatedTokens} tokens`)
    console.log(`⚡ Model: ${SINGLE_MODEL}`)

    // Validate CSV
    const csvValidation = validateCSV(csvChunk)
    if (!csvValidation.isValid) {
      console.log(`❌ CSV VALIDATION FAILED: ${csvValidation.error}`)
      return {
        success: false,
        optimizedData: "",
        keyIndex: keyIndex,
        error: `CSV validation failed: ${csvValidation.error}`,
      }
    }

    console.log(`✅ CSV Validation: ${csvValidation.rowCount} valid rows`)

    const groq = createGroqClient(apiKey)

    // 🔥 UPDATED: Simple prompt cho clean CSV
    const optimizePrompt = `Clean this CSV data, remove empty rows, keep only meaningful data:

${csvChunk}

Return clean CSV with same structure:`

    const promptTokens = estimateTokens(optimizePrompt)
    console.log(`📤 Sending request: ${promptTokens} input tokens`)

    const startTime = Date.now()

    // 🔥 CHỈ 1 REQUEST DUY NHẤT với llama3-70b-8192
    const completion = await groq.chat.completions.create({
      model: SINGLE_MODEL,
      messages: [{ role: "user", content: optimizePrompt }],
      temperature: 0.1,
      max_tokens: 4000, // Tăng max_tokens cho llama3-70b
    })

    const responseTime = Date.now() - startTime
    console.log(`📥 Response received (${responseTime}ms)`)

    if (!completion?.choices?.[0]?.message?.content) {
      const errorMsg = "Empty response from API"
      console.log(`❌ ${errorMsg}`)
      return {
        success: false,
        optimizedData: "",
        keyIndex: keyIndex,
        error: errorMsg,
      }
    }

    const optimizedCSV = completion.choices[0].message.content.trim()
    const outputTokens = estimateTokens(optimizedCSV)

    console.log(`📊 OUTPUT: ${outputTokens} tokens`)
    console.log(`⚡ Processing time: ${responseTime}ms`)

    // 🔥 IMPROVED: More lenient CSV validation
    const optimizedValidation = validateCSV(optimizedCSV)
    if (optimizedValidation.isValid) {
      console.log(`✅ SUCCESS: Valid CSV with ${optimizedValidation.rowCount} rows`)
      console.log(`===== END CHUNK ${chunkIndex + 1} =====\n`)

      return {
        success: true,
        optimizedData: optimizedCSV,
        keyIndex: keyIndex,
      }
    } else {
      // 🔥 FALLBACK: Nếu validation fail, vẫn return original chunk
      console.log(`⚠️ Validation failed but using original chunk: ${optimizedValidation.error}`)
      return {
        success: true,
        optimizedData: csvChunk, // Use original chunk
        keyIndex: keyIndex,
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`❌ CHUNK ${chunkIndex + 1} FAILED: ${errorMsg}`)

    // 🔥 IMPROVED: Return original chunk instead of failing
    console.log(`🔄 Using original chunk as fallback`)
    return {
      success: true,
      optimizedData: csvChunk, // Use original chunk as fallback
      keyIndex: keyIndex,
      error: `Processing failed, using original: ${errorMsg}`,
    }
  }
}

// 🔥 UPDATED: Main pipeline với better error handling
export const preprocessDataWithPipeline = async (
  data: any[],
  tableName: string,
): Promise<{ success: boolean; optimizedData: string; analysis: string; keyUsage: any }> => {
  try {
    console.log(`🚀 Clean CSV Pipeline với ${data.length} records - Model: ${SINGLE_MODEL}`)

    if (!API_KEYS || API_KEYS.length < 5) {
      throw new Error("Cần ít nhất 5 API keys")
    }

    // 🔥 BƯỚC 1: Chia CSV thành chunks
    console.log(`📊 BƯỚC 1: Chia CSV thành clean chunks...`)
    const { chunks, csvChunks } = createCSVChunks(data)

    if (csvChunks.length === 0) {
      throw new Error("Không thể tạo CSV chunks")
    }

    // Show sample of clean CSV
    console.log(`📋 Sample clean CSV chunk:`)
    const sampleLines = csvChunks[0].split("\n").slice(0, 3)
    sampleLines.forEach((line, i) => {
      console.log(`  ${i === 0 ? "Header" : `Row ${i}`}: ${line}`)
    })

    // 🔥 BƯỚC 2: Test API keys với detailed logging
    console.log(`🧪 BƯỚC 2: Test ${Math.min(4, csvChunks.length)} API keys...`)
    const keyTests = []

    for (let i = 0; i < Math.min(4, csvChunks.length); i++) {
      console.log(`🧪 Testing API ${i + 1}...`)
      const testResult = await testSingleAPI(i)
      keyTests.push(testResult)

      if (testResult) {
        console.log(`✅ API ${i + 1} working`)
      } else {
        console.log(`❌ API ${i + 1} failed`)
      }
    }

    const workingKeys = keyTests.filter(Boolean).length
    console.log(`🔑 ${workingKeys}/${Math.min(4, csvChunks.length)} APIs hoạt động`)

    if (workingKeys === 0) {
      console.log(`⚠️ No working APIs, using clean raw CSV`)
      const rawCSV = convertToCSV(data)
      return {
        success: true,
        optimizedData: rawCSV,
        analysis: `⚠️ Không có API keys hoạt động với ${SINGLE_MODEL}, sử dụng clean CSV với ${data.length} records.`,
        keyUsage: { error: true, format: "Clean CSV", fallback: true, model: SINGLE_MODEL },
      }
    }

    // 🔥 BƯỚC 3: Process từng chunk với better error handling
    console.log(`⏳ BƯỚC 3: Process ${csvChunks.length} clean CSV chunks...`)

    const processResults = []

    // Xử lý từng chunk với API tương ứng
    for (let i = 0; i < csvChunks.length; i++) {
      const csvChunk = csvChunks[i]
      const keyIndex = i % workingKeys // Cycle through working keys

      console.log(`🔧 Processing clean CSV chunk ${i + 1} với API ${keyIndex + 1}`)

      // CHỈ 1 REQUEST DUY NHẤT
      const result = await processSingleCSVChunk(API_KEYS[keyIndex], keyIndex, csvChunk, i, csvChunks.length)

      processResults.push(result)

      // Delay nhỏ giữa các chunks
      if (i < csvChunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000)) // Tăng delay lên 1s
      }
    }

    // 🔥 IMPROVED: Accept partial success
    const successfulResults = processResults.filter((r) => r && r.success)
    console.log(`📊 Results: ${successfulResults.length}/${csvChunks.length} chunks thành công`)

    // 🔥 IMPROVED: Chỉ fail nếu không có chunk nào thành công
    if (successfulResults.length === 0) {
      console.log(`❌ All chunks failed, using clean raw CSV`)
      const rawCSV = convertToCSV(data)
      return {
        success: true,
        optimizedData: rawCSV,
        analysis: `⚠️ Tất cả chunks thất bại với ${SINGLE_MODEL}, sử dụng clean CSV với ${data.length} records.`,
        keyUsage: {
          totalKeys: API_KEYS.length,
          processedChunks: 0,
          fallback: true,
          format: "Clean CSV",
          model: SINGLE_MODEL,
        },
      }
    }

    // 🔥 BƯỚC 4: Gộp CSV chunks
    console.log(`📊 BƯỚC 4: Gộp ${successfulResults.length} clean CSV chunks`)

    let combinedCSVData = ""
    let headers = ""
    const allRows: string[] = []
    let validChunks = 0

    successfulResults.forEach((result, index) => {
      try {
        const csvLines = result.optimizedData.trim().split("\n")
        if (csvLines.length < 2) {
          console.log(`⚠️ Chunk ${index + 1} has insufficient data`)
          return
        }

        if (validChunks === 0) {
          headers = csvLines[0]
          allRows.push(...csvLines.slice(1))
        } else {
          allRows.push(...csvLines.slice(1))
        }
        validChunks++
        console.log(`✅ Merged chunk ${index + 1}: ${csvLines.length - 1} rows`)
      } catch (parseError) {
        console.warn(`⚠️ Không thể parse CSV result từ chunk ${index + 1}:`, parseError)
      }
    })

    combinedCSVData = headers + "\n" + allRows.join("\n")
    const finalTokens = estimateTokens(combinedCSVData)

    console.log(`📊 Final Clean CSV: ${allRows.length} total rows, ${finalTokens} tokens`)

    // Show final sample
    const finalSample = combinedCSVData.split("\n").slice(0, 5)
    console.log(`📋 Final clean CSV sample:`)
    finalSample.forEach((line, i) => {
      console.log(`  ${i === 0 ? "Header" : `Row ${i}`}: ${line}`)
    })

    // 🔥 BƯỚC 5: Phân tích tổng hợp
    console.log(`🤖 BƯỚC 5: Phân tích clean CSV với API 5 - Model: ${SINGLE_MODEL}`)

    const analysisPrompt = `Phân tích dữ liệu CSV từ bảng "${tableName}" (${data.length} records):

${combinedCSVData.substring(0, 3000)}${combinedCSVData.length > 3000 ? "..." : ""}

Tóm tắt:
1. Tổng quan dữ liệu
2. Thống kê chính  
3. Insights quan trọng

Trả lời ngắn gọn bằng tiếng Việt.`

    const finalAnalysis = await analyzeWithLlama(API_KEYS[4], analysisPrompt)

    const keyUsage = {
      totalKeys: API_KEYS.length,
      processedChunks: successfulResults.length,
      successRate: `${Math.round((successfulResults.length / csvChunks.length) * 100)}%`,
      chunks: csvChunks.length,
      validChunks: validChunks,
      finalDataSize: combinedCSVData.length,
      finalTokens: finalTokens,
      format: "Clean CSV",
      model: SINGLE_MODEL,
    }

    return {
      success: true,
      optimizedData: combinedCSVData,
      analysis: finalAnalysis,
      keyUsage: keyUsage,
    }
  } catch (error) {
    console.error("❌ Clean CSV Pipeline failed:", error)

    // 🔥 IMPROVED: Always return clean raw CSV as fallback
    const rawCSV = convertToCSV(data)
    return {
      success: true,
      optimizedData: rawCSV,
      analysis: `❌ Pipeline error với ${SINGLE_MODEL}: ${error}. Sử dụng clean CSV với ${data.length} records.`,
      keyUsage: { error: true, format: "Clean CSV", model: SINGLE_MODEL, fallback: true },
    }
  }
}

// 🔥 UPDATED: Analysis với llama3-70b-8192
const analyzeWithLlama = async (apiKey: string, prompt: string): Promise<string> => {
  try {
    const promptTokens = estimateTokens(prompt)
    console.log(`🤖 Analysis với ${SINGLE_MODEL}: ${promptTokens} tokens`)

    const groq = createGroqClient(apiKey)
    const startTime = Date.now()

    // CHỈ 1 REQUEST DUY NHẤT
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

    console.log(`✅ Analysis complete: ${outputTokens} tokens (${responseTime}ms)`)

    return analysis
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`❌ Analysis failed: ${errorMsg}`)
    return `❌ Không thể phân tích với ${SINGLE_MODEL}: ${errorMsg}`
  }
}

// 🔥 UPDATED: Answer question với CSV
export const answerQuestionWithOptimizedData = async (
  optimizedCSVData: string,
  tableName: string,
  question: string,
  originalRecordCount: number,
): Promise<string> => {
  try {
    console.log(`🤔 Trả lời câu hỏi với clean CSV data (${originalRecordCount} records)`)

    // 🔥 IMPROVED: Truncate CSV if too long
    const maxCSVLength = 4000
    const truncatedCSV =
      optimizedCSVData.length > maxCSVLength ? optimizedCSVData.substring(0, maxCSVLength) + "..." : optimizedCSVData

    const questionPrompt = `Dữ liệu từ bảng "${tableName}" (${originalRecordCount} records):

${truncatedCSV}

Câu hỏi: ${question}

Trả lời ngắn gọn bằng tiếng Việt:`

    // CHỈ 1 REQUEST DUY NHẤT
    return await analyzeWithLlama(API_KEYS[4], questionPrompt)
  } catch (error) {
    console.error("❌ answerQuestionWithOptimizedData failed:", error)
    return `❌ Lỗi khi trả lời câu hỏi với ${SINGLE_MODEL}: ${error}`
  }
}

// Export function chính
export const analyzeDataWithParallelKeys = preprocessDataWithPipeline

// 🔥 SIMPLIFIED: Answer question function
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

// 🔥 UPDATED: Test all API keys với llama3-70b-8192
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

      const response = testCompletion?.choices?.[0]?.message?.content || "No response"
      console.log(`✅ API ${index + 1}: OK`)

      return {
        keyIndex: index + 1,
        status: "success" as const,
        response: response,
        preview: `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`,
        model: SINGLE_MODEL,
      }
    } catch (error) {
      console.log(`❌ API ${index + 1}: ${error}`)
      return {
        keyIndex: index + 1,
        status: "failed" as const,
        error: error instanceof Error ? error.message : String(error),
        preview: `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`,
        model: SINGLE_MODEL,
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
    format: "Clean CSV",
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
    format: "Clean CSV",
    model: SINGLE_MODEL,
  }
}

// 🔥 SIMPLIFIED: Clear cache function
export const clearApiCache = () => {
  testResultsCache.clear()
  console.log("🔄 Cache cleared")
}
