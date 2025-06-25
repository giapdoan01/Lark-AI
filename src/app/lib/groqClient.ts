import { Groq } from "groq-sdk"

// Danh sách API keys
const API_KEYS = [
  process.env.NEXT_PUBLIC_GROQ_API_KEY_1 || "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",
  process.env.NEXT_PUBLIC_GROQ_API_KEY_2 || "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",
  process.env.NEXT_PUBLIC_GROQ_API_KEY_3 || "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",
  process.env.NEXT_PUBLIC_GROQ_API_KEY_4 || "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",
  process.env.NEXT_PUBLIC_GROQ_API_KEY_5 || "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",
].filter((key) => key && !key.includes("account") && key.startsWith("gsk_"))

// 🔥 SIMPLIFIED: Chỉ sử dụng 1 model duy nhất
const SINGLE_MODEL = "gemma2-9b-it"

// 🔥 SIMPLIFIED: Cache đơn giản
const testResultsCache = new Map<string, boolean>()

// Function ước tính số tokens (1 token ≈ 4 characters)
const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / 4)
}

// 🔥 SIMPLIFIED: CSV Conversion - loại bỏ JSON hoàn toàn
const convertToCSV = (data: Array<{ recordId: string; fields: Record<string, unknown> }>): string => {
  if (data.length === 0) return ""

  console.log(`📊 Converting ${data.length} records to CSV format...`)

  // Get all unique field names từ tất cả records
  const allFieldNames = new Set<string>()
  data.forEach((record) => {
    Object.keys(record.fields).forEach((fieldName) => {
      allFieldNames.add(fieldName)
    })
  })

  const fieldNames = Array.from(allFieldNames).sort()
  console.log(`📋 Found ${fieldNames.length} unique fields:`, fieldNames.slice(0, 5))

  // Create CSV headers
  const headers = ["recordId", ...fieldNames]
  const csvHeaders = headers.join(",")

  // Convert records to CSV rows
  const csvRows = data.map((record) => {
    const values = [
      record.recordId,
      ...fieldNames.map((fieldName) => {
        const value = record.fields[fieldName]
        if (value === null || value === undefined) return ""

        // Handle different data types
        if (typeof value === "object") {
          return JSON.stringify(value).replace(/"/g, '""')
        }

        // Escape quotes and handle strings
        return String(value).replace(/"/g, '""')
      }),
    ]

    // Wrap values in quotes to handle commas and special characters
    return values.map((v) => `"${v}"`).join(",")
  })

  const csvContent = [csvHeaders, ...csvRows].join("\n")

  console.log(`✅ CSV Conversion Complete:`)
  console.log(`  📊 Records: ${data.length}`)
  console.log(`  📋 Fields: ${fieldNames.length}`)
  console.log(`  📄 CSV size: ${csvContent.length} chars`)
  console.log(`  🎯 Estimated tokens: ${estimateTokens(csvContent)}`)

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

// 🔥 SIMPLIFIED: Test single API key với gemma2-9b-it
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
      max_tokens: 5,
    })

    const response = testCompletion?.choices?.[0]?.message?.content
    const success = !!response

    // Cache result
    testResultsCache.set(cacheKey, success)

    console.log(`✅ API ${keyIndex + 1} ${SINGLE_MODEL}: ${success ? "OK" : "FAILED"}`)
    return success
  } catch (error) {
    console.log(`❌ API ${keyIndex + 1} ${SINGLE_MODEL} failed: ${error}`)
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

// 🔥 SIMPLIFIED: Process single CSV chunk - CHỈ 1 REQUEST
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

    // 🔥 SIMPLIFIED: Prompt đơn giản cho CSV cleaning
    const optimizePrompt = `Clean this CSV data, remove empty rows, keep format:

${csvChunk}

Return clean CSV only:`

    const startTime = Date.now()

    // 🔥 CHỈ 1 REQUEST DUY NHẤT - KHÔNG RETRY, KHÔNG FALLBACK
    const completion = await groq.chat.completions.create({
      model: SINGLE_MODEL,
      messages: [{ role: "user", content: optimizePrompt }],
      temperature: 0.1,
      max_tokens: 2000,
    })

    const responseTime = Date.now() - startTime
    console.log(`📥 Response received (${responseTime}ms)`)

    if (!completion?.choices?.[0]?.message?.content) {
      throw new Error("Empty response from API")
    }

    const optimizedCSV = completion.choices[0].message.content.trim()
    const outputTokens = estimateTokens(optimizedCSV)

    console.log(`📊 OUTPUT: ${outputTokens} tokens`)
    console.log(`⚡ Processing time: ${responseTime}ms`)

    // Validate optimized CSV
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
      console.log(`❌ VALIDATION FAILED: ${optimizedValidation.error}`)
      throw new Error(`Invalid optimized CSV: ${optimizedValidation.error}`)
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`❌ CHUNK ${chunkIndex + 1} FAILED: ${errorMsg}`)

    return {
      success: false,
      optimizedData: "",
      keyIndex: keyIndex,
      error: errorMsg,
    }
  }
}

// 🔥 SIMPLIFIED: Main pipeline - CHỈ CSV, CHỈ 1 REQUEST PER CHUNK
export const preprocessDataWithPipeline = async (
  data: any[],
  tableName: string,
): Promise<{ success: boolean; optimizedData: string; analysis: string; keyUsage: any }> => {
  try {
    console.log(`🚀 CSV Pipeline với ${data.length} records - Model: ${SINGLE_MODEL}`)

    if (!API_KEYS || API_KEYS.length < 5) {
      throw new Error("Cần ít nhất 5 API keys")
    }

    // 🔥 BƯỚC 1: Chia CSV thành chunks
    console.log(`📊 BƯỚC 1: Chia CSV thành chunks...`)
    const { chunks, csvChunks } = createCSVChunks(data)

    if (csvChunks.length === 0) {
      throw new Error("Không thể tạo CSV chunks")
    }

    // 🔥 BƯỚC 2: Test API keys
    console.log(`🧪 BƯỚC 2: Test ${Math.min(4, csvChunks.length)} API keys...`)
    const keyTests = await Promise.all(
      API_KEYS.slice(0, Math.min(4, csvChunks.length)).map((key, index) => testSingleAPI(index)),
    )
    const workingKeys = keyTests.filter(Boolean).length
    console.log(`🔑 ${workingKeys}/${Math.min(4, csvChunks.length)} APIs hoạt động`)

    if (workingKeys === 0) {
      // Fallback với raw CSV
      const rawCSV = convertToCSV(data)
      return {
        success: true,
        optimizedData: rawCSV,
        analysis: `⚠️ Không có API keys hoạt động, sử dụng raw CSV với ${data.length} records.`,
        keyUsage: { error: true, format: "CSV", fallback: true, model: SINGLE_MODEL },
      }
    }

    // 🔥 BƯỚC 3: Process từng chunk - CHỈ 1 REQUEST PER CHUNK
    console.log(`⏳ BƯỚC 3: Process ${csvChunks.length} CSV chunks...`)

    const processResults = []

    // Xử lý từng chunk với API tương ứng - CHỈ 1 REQUEST
    for (let i = 0; i < csvChunks.length; i++) {
      const csvChunk = csvChunks[i]
      const keyIndex = i // API 1,2,3,4

      console.log(`🔧 Processing CSV chunk ${i + 1} với API ${keyIndex + 1}`)

      // CHỈ 1 REQUEST DUY NHẤT - KHÔNG RETRY
      const result = await processSingleCSVChunk(API_KEYS[keyIndex], keyIndex, csvChunk, i, csvChunks.length)

      processResults.push(result)

      // Delay nhỏ giữa các chunks
      if (i < csvChunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }

    // Kiểm tra kết quả
    const successfulResults = processResults.filter((r) => r && r.success)
    console.log(`📊 Results: ${successfulResults.length}/${csvChunks.length} chunks thành công`)

    // Nếu tất cả thất bại, sử dụng raw CSV
    if (successfulResults.length === 0) {
      const rawCSV = convertToCSV(data)
      return {
        success: true,
        optimizedData: rawCSV,
        analysis: `⚠️ Processing thất bại, sử dụng raw CSV với ${data.length} records.`,
        keyUsage: {
          totalKeys: API_KEYS.length,
          processedChunks: 0,
          fallback: true,
          format: "CSV",
          model: SINGLE_MODEL,
        },
      }
    }

    // 🔥 BƯỚC 4: Gộp CSV chunks
    console.log(`📊 BƯỚC 4: Gộp ${successfulResults.length} CSV chunks`)

    let combinedCSVData = ""
    let headers = ""
    const allRows: string[] = []
    let validChunks = 0

    successfulResults.forEach((result, index) => {
      try {
        const csvLines = result.optimizedData.trim().split("\n")
        if (csvLines.length < 2) return

        if (validChunks === 0) {
          headers = csvLines[0]
          allRows.push(...csvLines.slice(1))
        } else {
          allRows.push(...csvLines.slice(1))
        }
        validChunks++
      } catch (parseError) {
        console.warn(`⚠️ Không thể parse CSV result từ chunk ${index + 1}:`, parseError)
      }
    })

    combinedCSVData = headers + "\n" + allRows.join("\n")
    const finalTokens = estimateTokens(combinedCSVData)

    // 🔥 BƯỚC 5: Phân tích tổng hợp - CHỈ 1 REQUEST
    console.log(`🤖 BƯỚC 5: Phân tích CSV với API 5 - Model: ${SINGLE_MODEL}`)

    const analysisPrompt = `Bạn là một AI analyst. Phân tích dữ liệu CSV từ bảng "${tableName}" (${data.length} records):

${combinedCSVData}

Phân tích:
1. 📊 Tổng quan dữ liệu CSV
2. 📈 Thống kê quan trọng
3. 🔍 Patterns và insights
4. 💡 Đánh giá chất lượng

Trả lời bằng tiếng Việt, ngắn gọn.`

    const finalAnalysis = await analyzeWithGemma(API_KEYS[4], analysisPrompt)

    const keyUsage = {
      totalKeys: API_KEYS.length,
      processedChunks: successfulResults.length,
      successRate: `${Math.round((successfulResults.length / csvChunks.length) * 100)}%`,
      chunks: csvChunks.length,
      validChunks: validChunks,
      finalDataSize: combinedCSVData.length,
      finalTokens: finalTokens,
      format: "CSV",
      model: SINGLE_MODEL,
    }

    return {
      success: true,
      optimizedData: combinedCSVData,
      analysis: finalAnalysis,
      keyUsage: keyUsage,
    }
  } catch (error) {
    console.error("❌ CSV Pipeline failed:", error)
    return {
      success: false,
      optimizedData: "",
      analysis: `❌ Lỗi CSV pipeline: ${error}`,
      keyUsage: { error: true, format: "CSV", model: SINGLE_MODEL },
    }
  }
}

// 🔥 SIMPLIFIED: Analysis với gemma2-9b-it - CHỈ 1 REQUEST
const analyzeWithGemma = async (apiKey: string, prompt: string): Promise<string> => {
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

// 🔥 SIMPLIFIED: Answer question với CSV - CHỈ 1 REQUEST
export const answerQuestionWithOptimizedData = async (
  optimizedCSVData: string,
  tableName: string,
  question: string,
  originalRecordCount: number,
): Promise<string> => {
  try {
    console.log(`🤔 Trả lời câu hỏi với CSV data (${originalRecordCount} records)`)

    const questionPrompt = `Dữ liệu từ bảng "${tableName}" (${originalRecordCount} records):

${optimizedCSVData}

Câu hỏi: ${question}

Phân tích CSV và trả lời ngắn gọn bằng tiếng Việt:`

    // CHỈ 1 REQUEST DUY NHẤT
    return await analyzeWithGemma(API_KEYS[4], questionPrompt)
  } catch (error) {
    console.error("❌ answerQuestionWithOptimizedData failed:", error)
    return `❌ Lỗi khi trả lời câu hỏi: ${error}`
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

// 🔥 SIMPLIFIED: Test all API keys
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
        max_tokens: 5,
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
    format: "CSV",
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
    format: "CSV",
    model: SINGLE_MODEL,
  }
}

// 🔥 SIMPLIFIED: Clear cache function
export const clearApiCache = () => {
  testResultsCache.clear()
  console.log("🔄 Cache cleared")
}
