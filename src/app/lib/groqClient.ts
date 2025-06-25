import { Groq } from "groq-sdk"

// Danh sách API keys
const API_KEYS = [
  process.env.NEXT_PUBLIC_GROQ_API_KEY_1 || "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",
  process.env.NEXT_PUBLIC_GROQ_API_KEY_2 || "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",
  process.env.NEXT_PUBLIC_GROQ_API_KEY_3 || "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",
  process.env.NEXT_PUBLIC_GROQ_API_KEY_4 || "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",
  process.env.NEXT_PUBLIC_GROQ_API_KEY_5 || "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",
].filter((key) => key && !key.includes("account") && key.startsWith("gsk_"))

// 🔥 NEW: Llama 4 Scout model
const SINGLE_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"

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
  console.log(`  🎯 Estimated tokens: ${estimateTokens(csvContent)}`)

  return csvContent
}

// 🔥 NEW: Random API selection
const selectRandomWorkingAPI = async (): Promise<{ apiKey: string; apiIndex: number; details: any } | null> => {
  console.log(`🎲 Selecting random working API from ${API_KEYS.length} available keys...`)

  // Test all APIs first
  const apiTestResults = []
  for (let i = 0; i < API_KEYS.length; i++) {
    console.log(`🧪 Testing API ${i + 1}...`)
    const testResult = await testSingleAPI(i)
    apiTestResults.push({ ...testResult, index: i })

    if (testResult.success) {
      console.log(`✅ API ${i + 1} working`)
    } else {
      console.log(`❌ API ${i + 1} failed: ${testResult.details.error}`)
    }
  }

  // Get working APIs
  const workingAPIs = apiTestResults.filter((result) => result.success)
  console.log(`🔑 Found ${workingAPIs.length}/${API_KEYS.length} working APIs`)

  if (workingAPIs.length === 0) {
    console.log(`❌ No working APIs found`)
    return null
  }

  // 🎲 Select random working API
  const randomIndex = Math.floor(Math.random() * workingAPIs.length)
  const selectedAPI = workingAPIs[randomIndex]
  const apiKey = API_KEYS[selectedAPI.index]

  console.log(
    `🎯 Randomly selected API ${selectedAPI.index + 1} (${randomIndex + 1}/${workingAPIs.length} working APIs)`,
  )
  console.log(`🔑 Selected API preview: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`)

  return {
    apiKey: apiKey,
    apiIndex: selectedAPI.index,
    details: selectedAPI.details,
  }
}

// Test single API key với Llama 4 Scout
const testSingleAPI = async (keyIndex: number): Promise<{ success: boolean; details: any }> => {
  const cacheKey = `test_${keyIndex}_${SINGLE_MODEL}`

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

// 🔥 NEW: Single request analysis với Llama 4 Scout
const analyzeFullCSVWithRandomAPI = async (
  csvContent: string,
  tableName: string,
  recordCount: number,
): Promise<{ success: boolean; analysis: string; apiDetails: any; error?: string }> => {
  try {
    console.log(`\n🚀 ===== SINGLE REQUEST ANALYSIS với ${SINGLE_MODEL} =====`)
    console.log(`📊 INPUT: ${recordCount} records`)
    console.log(`📄 CSV size: ${csvContent.length} characters`)
    console.log(`🎯 Estimated tokens: ${estimateTokens(csvContent)}`)

    // 🎲 Select random working API
    const selectedAPI = await selectRandomWorkingAPI()

    if (!selectedAPI) {
      return {
        success: false,
        analysis: "❌ Không có API nào hoạt động",
        apiDetails: { error: "No working APIs" },
        error: "No working APIs available",
      }
    }

    console.log(`🎯 Using API ${selectedAPI.apiIndex + 1} for analysis`)

    const groq = createGroqClient(selectedAPI.apiKey)

    // 🔥 NEW: Single comprehensive analysis prompt
    const analysisPrompt = `Phân tích toàn bộ dữ liệu CSV từ bảng "${tableName}" (${recordCount} records):

${csvContent}

Thực hiện phân tích toàn diện:

1. **Tổng quan dữ liệu:**
   - Số lượng records và fields
   - Loại dữ liệu chính
   - Chất lượng dữ liệu

2. **Thống kê chi tiết:**
   - Phân bố theo các trường quan trọng
   - Giá trị phổ biến nhất
   - Xu hướng và patterns

3. **Insights quan trọng:**
   - Phát hiện thú vị từ dữ liệu
   - Mối quan hệ giữa các trường
   - Recommendations

4. **Kết luận:**
   - Tóm tắt findings chính
   - Actionable insights

Trả lời chi tiết bằng tiếng Việt với format rõ ràng:`

    const promptTokens = estimateTokens(analysisPrompt)
    console.log(`📤 Sending comprehensive analysis request: ${promptTokens} input tokens`)

    const startTime = Date.now()

    // 🔥 Single request với Llama 4 Scout
    const completion = await groq.chat.completions.create({
      model: SINGLE_MODEL,
      messages: [{ role: "user", content: analysisPrompt }],
      temperature: 0.7,
      max_tokens: 4000, // Tăng tokens cho comprehensive analysis
    })

    const responseTime = Date.now() - startTime
    console.log(`📥 Response received (${responseTime}ms)`)

    if (!completion?.choices?.[0]?.message?.content) {
      const errorMsg = "Empty response from API"
      console.log(`❌ ${errorMsg}`)
      return {
        success: false,
        analysis: `❌ Không nhận được phản hồi từ ${SINGLE_MODEL}`,
        apiDetails: selectedAPI.details,
        error: errorMsg,
      }
    }

    const analysis = completion.choices[0].message.content.trim()
    const outputTokens = estimateTokens(analysis)

    console.log(`📊 OUTPUT: ${outputTokens} tokens`)
    console.log(`⚡ Total processing time: ${responseTime}ms`)
    console.log(`✅ SUCCESS: Analyzed ${recordCount} records with single request`)
    console.log(`📋 Analysis preview: ${analysis.substring(0, 150)}...`)
    console.log(`===== END SINGLE REQUEST ANALYSIS =====\n`)

    return {
      success: true,
      analysis: analysis,
      apiDetails: {
        ...selectedAPI.details,
        responseTime: responseTime,
        inputTokens: promptTokens,
        outputTokens: outputTokens,
        totalTokens: promptTokens + outputTokens,
      },
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`❌ Single request analysis failed: ${errorMsg}`)

    return {
      success: false,
      analysis: `❌ Lỗi phân tích với ${SINGLE_MODEL}: ${errorMsg}`,
      apiDetails: { error: errorMsg },
      error: errorMsg,
    }
  }
}

// 🔥 UPDATED: Main pipeline với single request strategy
export const preprocessDataWithPipeline = async (
  data: any[],
  tableName: string,
): Promise<{ success: boolean; optimizedData: string; analysis: string; keyUsage: any }> => {
  try {
    console.log(`🚀 Single Request Pipeline với ${data.length} records - Model: ${SINGLE_MODEL}`)

    if (!API_KEYS || API_KEYS.length === 0) {
      throw new Error("Cần ít nhất 1 API key")
    }

    // 🔥 BƯỚC 1: Convert to consistent CSV
    console.log(`📊 BƯỚC 1: Convert to consistent CSV format...`)
    const fullCSV = convertToCSV(data)

    if (!fullCSV) {
      throw new Error("Không thể tạo CSV content")
    }

    // 🔥 BƯỚC 2: Single comprehensive analysis
    console.log(`🤖 BƯỚC 2: Single comprehensive analysis với random API...`)
    const analysisResult = await analyzeFullCSVWithRandomAPI(fullCSV, tableName, data.length)

    if (!analysisResult.success) {
      console.log(`❌ Analysis failed, using raw CSV`)
      return {
        success: true,
        optimizedData: fullCSV,
        analysis: analysisResult.analysis,
        keyUsage: {
          error: true,
          format: "Raw CSV",
          fallback: true,
          model: SINGLE_MODEL,
          strategy: "Single Request",
          errorDetails: analysisResult.error,
        },
      }
    }

    // 🔥 SUCCESS: Return results
    const keyUsage = {
      totalKeys: API_KEYS.length,
      usedAPI: analysisResult.apiDetails.keyIndex,
      selectedRandomly: true,
      totalRecords: data.length,
      processedRecords: data.length, // All records processed in single request
      dataLoss: 0, // No data loss with single request
      format: "Complete CSV",
      model: SINGLE_MODEL,
      strategy: "Single Request Analysis",
      responseTime: analysisResult.apiDetails.responseTime,
      inputTokens: analysisResult.apiDetails.inputTokens,
      outputTokens: analysisResult.apiDetails.outputTokens,
      totalTokens: analysisResult.apiDetails.totalTokens,
      apiPreview: analysisResult.apiDetails.preview,
    }

    console.log(`✅ Single Request Pipeline Complete:`)
    console.log(`  📊 Records: ${data.length} (100% processed)`)
    console.log(`  🎯 API used: ${analysisResult.apiDetails.keyIndex}`)
    console.log(`  ⚡ Time: ${analysisResult.apiDetails.responseTime}ms`)
    console.log(`  🎫 Tokens: ${analysisResult.apiDetails.totalTokens}`)

    return {
      success: true,
      optimizedData: fullCSV,
      analysis: analysisResult.analysis,
      keyUsage: keyUsage,
    }
  } catch (error) {
    console.error("❌ Single Request Pipeline failed:", error)

    const rawCSV = convertToCSV(data)
    return {
      success: true,
      optimizedData: rawCSV,
      analysis: `❌ Pipeline error với ${SINGLE_MODEL}: ${error}. Sử dụng raw CSV với ${data.length} records.`,
      keyUsage: { error: true, format: "Raw CSV", model: SINGLE_MODEL, fallback: true, strategy: "Single Request" },
    }
  }
}

// 🔥 UPDATED: Answer question với single API
export const answerQuestionWithOptimizedData = async (
  optimizedCSVData: string,
  tableName: string,
  question: string,
  originalRecordCount: number,
): Promise<string> => {
  try {
    console.log(`🤔 Trả lời câu hỏi với CSV data (${originalRecordCount} records) - ${SINGLE_MODEL}`)

    // 🎲 Select random working API
    const selectedAPI = await selectRandomWorkingAPI()

    if (!selectedAPI) {
      return `❌ Không có API nào hoạt động với ${SINGLE_MODEL}`
    }

    console.log(`🎯 Using API ${selectedAPI.apiIndex + 1} for question answering`)

    // Truncate CSV if too long
    const maxCSVLength = 6000 // Tăng limit cho Llama 4 Scout
    const truncatedCSV =
      optimizedCSVData.length > maxCSVLength ? optimizedCSVData.substring(0, maxCSVLength) + "..." : optimizedCSVData

    const questionPrompt = `Dữ liệu từ bảng "${tableName}" (${originalRecordCount} records):

${truncatedCSV}

Câu hỏi: ${question}

Phân tích dữ liệu và trả lời chi tiết bằng tiếng Việt với:
1. Trả lời trực tiếp câu hỏi
2. Dẫn chứng từ dữ liệu cụ thể
3. Insights bổ sung nếu có

Trả lời:`

    const groq = createGroqClient(selectedAPI.apiKey)
    const startTime = Date.now()

    const completion = await groq.chat.completions.create({
      model: SINGLE_MODEL,
      messages: [{ role: "user", content: questionPrompt }],
      temperature: 0.7,
      max_tokens: 2000,
    })

    const responseTime = Date.now() - startTime

    if (!completion?.choices?.[0]?.message?.content) {
      throw new Error("No response content")
    }

    const answer = completion.choices[0].message.content
    console.log(`✅ Question answered with API ${selectedAPI.apiIndex + 1} (${responseTime}ms)`)

    return answer
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

// 🔥 UPDATED: Test all API keys với Llama 4 Scout
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
    format: "Single Request CSV",
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
    format: "Single Request CSV",
    model: SINGLE_MODEL,
  }
}

export const clearApiCache = () => {
  testResultsCache.clear()
  console.log("🔄 Cache cleared")
}
