import { Groq } from "groq-sdk"

// Danh sách API keys
const API_KEYS = [
  process.env.NEXT_PUBLIC_GROQ_API_KEY_1 || "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",
  process.env.NEXT_PUBLIC_GROQ_API_KEY_2 || "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",
  process.env.NEXT_PUBLIC_GROQ_API_KEY_3 || "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",
  process.env.NEXT_PUBLIC_GROQ_API_KEY_4 || "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",
  process.env.NEXT_PUBLIC_GROQ_API_KEY_5 || "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",
].filter((key) => key && !key.includes("account") && key.startsWith("gsk_"))

// 🔥 FIXED: Sử dụng chính xác compound-beta models
const AVAILABLE_MODELS = [
  "compound-beta", // Model chính user muốn dùng
  "compound-beta-mini", // Model backup user muốn dùng
  "llama-3.1-8b-instant", // Fallback nếu compound models fail
]

// 🔥 FIXED: Separate caches for different data types
const apiCallCache = new Map<string, any>()
const testResultsCache = new Map<string, boolean>() // Boolean results only
const detailedTestCache = new Map<string, any>() // Detailed test results

// Function ước tính số tokens (1 token ≈ 4 characters)
const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / 4)
}

// 🔥 NEW: Debug function để kiểm tra model thực sự được gọi
const debugModelCall = async (apiKey: string, modelName: string): Promise<void> => {
  try {
    console.log(`🔍 DEBUG: Testing model "${modelName}" với API key ${apiKey.substring(0, 10)}...`)

    const groq = createGroqClient(apiKey)

    const testCompletion = await groq.chat.completions.create({
      model: modelName,
      messages: [
        {
          role: "user",
          content: "What model are you? Return only the model name.",
        },
      ],
      temperature: 0.1,
      max_tokens: 50,
    })

    const response = testCompletion?.choices?.[0]?.message?.content
    console.log(`🔍 DEBUG: Requested model: "${modelName}"`)
    console.log(`🔍 DEBUG: Response: "${response}"`)
    console.log(`🔍 DEBUG: Full completion object:`, JSON.stringify(testCompletion, null, 2))
  } catch (error) {
    console.error(`🔍 DEBUG: Model "${modelName}" failed:`, error)
  }
}

// 🔥 NEW: Function test tất cả models để tìm model nào hoạt động
const testAvailableModels = async (): Promise<string[]> => {
  const modelsToTest = [
    "compound-beta",
    "compound-beta-mini",
    "llama-3.1-70b-versatile",
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768",
  ]

  const workingModels: string[] = []

  console.log(`🧪 Testing ${modelsToTest.length} models...`)

  for (const modelName of modelsToTest) {
    try {
      const groq = createGroqClient(API_KEYS[0]) // Test với key đầu tiên

      console.log(`🧪 Testing model: ${modelName}`)

      const testCompletion = await groq.chat.completions.create({
        model: modelName,
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
      if (response) {
        console.log(`✅ Model "${modelName}" works: ${response}`)
        workingModels.push(modelName)

        // Debug thêm để xem model thực sự
        await debugModelCall(API_KEYS[0], modelName)
      } else {
        console.log(`❌ Model "${modelName}" no response`)
      }

      // Delay giữa các test
      await new Promise((resolve) => setTimeout(resolve, 1000))
    } catch (error) {
      console.error(`❌ Model "${modelName}" failed:`, error)
    }
  }

  console.log(`✅ Working models: ${workingModels.join(", ")}`)
  return workingModels
}

// 🔥 NEW: CSV Conversion Functions
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

  const originalSize = JSON.stringify(data).length
  const csvSize = csvContent.length
  const compressionRatio = Math.round((csvSize / originalSize) * 100)

  console.log(`✅ CSV Conversion Complete:`)
  console.log(`  📊 Records: ${data.length}`)
  console.log(`  📋 Fields: ${fieldNames.length}`)
  console.log(`  📄 JSON size: ${originalSize} chars`)
  console.log(`  📄 CSV size: ${csvSize} chars`)
  console.log(`  📉 Compression: ${compressionRatio}% (${100 - compressionRatio}% reduction)`)
  console.log(`  🎯 Estimated tokens: ${estimateTokens(csvContent)} (vs ${estimateTokens(JSON.stringify(data))} JSON)`)

  return csvContent
}

// 🔥 NEW: CSV Validation Function
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

// 🔥 UPDATED: Function tính tổng tokens và chia đều cho 4 API với CSV
const calculateTokenDistribution = (
  data: any[],
): {
  totalTokens: number
  tokensPerAPI: number
  chunksPerAPI: number[]
  distribution: any[][]
  csvSize: number
  jsonSize: number
  compressionRatio: number
} => {
  // Convert to CSV first để tính toán chính xác
  const csvContent = convertToCSV(data)
  const jsonContent = JSON.stringify(data, null, 1)

  const csvTokens = estimateTokens(csvContent)
  const jsonTokens = estimateTokens(jsonContent)
  const compressionRatio = Math.round((csvTokens / jsonTokens) * 100)

  const tokensPerAPI = Math.ceil(csvTokens / 4) // Chia đều cho 4 API đầu

  console.log(`📊 ===== CSV TOKEN DISTRIBUTION CALCULATION =====`)
  console.log(`🎯 Total records: ${data.length}`)
  console.log(`📄 JSON size: ${jsonContent.length} chars (${jsonTokens} tokens)`)
  console.log(`📄 CSV size: ${csvContent.length} chars (${csvTokens} tokens)`)
  console.log(`📉 CSV Compression: ${compressionRatio}% (${100 - compressionRatio}% token reduction)`)
  console.log(`📊 Tokens per API (4 APIs): ${tokensPerAPI}`)
  console.log(`⚡ Target Model: compound-beta`)

  // Chia data thành 4 phần dựa trên record count (vì CSV format đồng nhất hơn)
  const recordsPerAPI = Math.min(Math.ceil(data.length / 4), 15) // Tăng lên 15 records per API
  const chunks: any[][] = []
  const chunksPerAPI: number[] = []

  for (let i = 0; i < 4; i++) {
    const startIndex = i * recordsPerAPI
    const endIndex = Math.min(startIndex + recordsPerAPI, data.length)
    const chunk = data.slice(startIndex, endIndex)

    if (chunk.length > 0) {
      const chunkCSV = convertToCSV(chunk)
      const chunkTokens = estimateTokens(chunkCSV)

      console.log(`📊 API ${i + 1} chunk: ${chunk.length} records, ${chunkTokens} tokens`)
      chunks.push(chunk)
      chunksPerAPI.push(chunk.length)
    }
  }

  console.log(`📊 FINAL CSV DISTRIBUTION:`)
  chunks.forEach((chunk, index) => {
    const chunkCSV = convertToCSV(chunk)
    const chunkTokens = estimateTokens(chunkCSV)
    console.log(`  API ${index + 1}: ${chunk.length} records, ${chunkTokens} tokens`)
  })
  console.log(`  API 5: Tổng hợp và trả lời câu hỏi`)
  console.log(`===============================================`)

  return {
    totalTokens: csvTokens,
    tokensPerAPI,
    chunksPerAPI,
    distribution: chunks,
    csvSize: csvContent.length,
    jsonSize: jsonContent.length,
    compressionRatio,
  }
}

// 🔥 FIXED: Test single chunk với proper boolean cache
const testSingleChunkCSV = async (chunk: any[], keyIndex: number): Promise<boolean> => {
  const cacheKey = `test_${keyIndex}`

  // Check cache first - return boolean
  if (testResultsCache.has(cacheKey)) {
    console.log(`🔄 Using cached test result for API ${keyIndex + 1}`)
    return testResultsCache.get(cacheKey)!
  }

  try {
    const apiKey = API_KEYS[keyIndex]
    console.log(`🧪 Test CSV chunk: ${chunk.length} records for API ${keyIndex + 1}`)

    const groq = createGroqClient(apiKey)

    // 🔥 FIXED: Thử compound-beta trước
    const testCompletion = await groq.chat.completions.create({
      model: "compound-beta", // Sử dụng chính xác model user muốn
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

    // Cache boolean result
    testResultsCache.set(cacheKey, success)

    console.log(`✅ Key ${keyIndex + 1} compound-beta test: ${success ? "OK" : "FAILED"}`)
    console.log(`🔍 Response: "${response}"`)

    return success
  } catch (error) {
    console.log(`❌ Key ${keyIndex + 1} compound-beta test failed: ${error}`)

    // 🔥 FALLBACK: Thử compound-beta-mini
    try {
      console.log(`🔄 Trying compound-beta-mini fallback for API ${keyIndex + 1}`)
      const groq = createGroqClient(API_KEYS[keyIndex])

      const fallbackCompletion = await groq.chat.completions.create({
        model: "compound-beta-mini",
        messages: [
          {
            role: "user",
            content: "Test: Return 'OK'",
          },
        ],
        temperature: 0.1,
        max_tokens: 5,
      })

      const fallbackResponse = fallbackCompletion?.choices?.[0]?.message?.content
      const fallbackSuccess = !!fallbackResponse

      testResultsCache.set(cacheKey, fallbackSuccess)
      console.log(`✅ Key ${keyIndex + 1} compound-beta-mini fallback: ${fallbackSuccess ? "OK" : "FAILED"}`)

      return fallbackSuccess
    } catch (fallbackError) {
      console.log(`❌ Key ${keyIndex + 1} compound-beta-mini also failed: ${fallbackError}`)
      testResultsCache.set(cacheKey, false)
      return false
    }
  }
}

const createGroqClient = (apiKey: string): Groq => {
  return new Groq({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true,
  })
}

// 🔥 UPDATED: Helper function để phân tích với compound-beta models
const analyzeWithSingleKey = async (apiKey: string, keyIndex: number, prompt: string): Promise<string> => {
  // 🔥 FIXED: Thử compound models trước
  const modelsToTry = ["compound-beta", "compound-beta-mini", "llama-3.1-8b-instant"]

  for (const modelName of modelsToTry) {
    try {
      const promptTokens = estimateTokens(prompt)
      console.log(`🤖 ANALYSIS với API 5 (Key ${keyIndex + 1}) - Model: ${modelName}:`)
      console.log(`  🎯 Analysis INPUT tokens: ${promptTokens}`)

      const groq = createGroqClient(apiKey)
      const startTime = Date.now()

      // 🔍 DEBUG: Log model request
      console.log(`🔍 DEBUG: Requesting model "${modelName}"`)

      const completion = await groq.chat.completions.create({
        model: modelName,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      })

      const responseTime = Date.now() - startTime

      // 🔍 DEBUG: Log actual response
      console.log(`🔍 DEBUG: Response received from model request "${modelName}"`)
      console.log(`🔍 DEBUG: Completion model field:`, completion.model)

      if (!completion?.choices?.[0]?.message?.content) {
        console.log(`⚠️ No response content from ${modelName}`)
        continue // Try next model
      }

      const analysis = completion.choices[0].message.content || "Không có phân tích"
      const outputTokens = estimateTokens(analysis)

      console.log(`✅ CSV ANALYSIS SUCCESS with ${modelName}:`)
      console.log(`  🎯 OUTPUT tokens: ${outputTokens}`)
      console.log(`  ⚡ Processing time: ${responseTime}ms`)
      console.log(`  🔍 Actual model used: ${completion.model || "unknown"}`)

      return analysis
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error(`❌ Model ${modelName} failed: ${errorMsg}`)

      if (modelName === modelsToTry[modelsToTry.length - 1]) {
        // Last model failed
        return `❌ Tất cả models đều thất bại. Lỗi cuối: ${errorMsg}`
      }
      // Continue to next model
    }
  }

  return "❌ Không thể phân tích với bất kỳ model nào"
}

// 🔥 UPDATED: Optimize data chunk với compound-beta models
const optimizeDataChunk = async (
  apiKey: string,
  keyIndex: number,
  dataChunk: any[],
  chunkIndex: number,
  totalChunks: number,
  targetTokens: number,
): Promise<{ success: boolean; optimizedData: string; keyIndex: number; error?: string }> => {
  try {
    // Convert to CSV first
    const csvContent = convertToCSV(dataChunk)
    const estimatedTokens = estimateTokens(csvContent)

    console.log(`\n🔧 ===== API ${keyIndex + 1} - CSV CHUNK ${chunkIndex + 1}/${totalChunks} =====`)
    console.log(`📊 CSV TOKEN ANALYSIS:`)
    console.log(`  🎯 Target tokens for this API: ${targetTokens}`)
    console.log(`  📝 Actual records: ${dataChunk.length}`)
    console.log(`  📄 CSV characters: ${csvContent.length}`)
    console.log(`  🎯 INPUT TOKENS: ${estimatedTokens}`)

    // Validate CSV
    const csvValidation = validateCSV(csvContent)
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

    // 🔥 UPDATED: Prompt cho CSV optimization
    const optimizePrompt = `Clean this CSV data, remove empty rows, keep format:

${csvContent}

Return clean CSV only:`

    const promptTokens = estimateTokens(optimizePrompt)
    console.log(`📤 SENDING CSV REQUEST:`)
    console.log(`  🎯 Total INPUT tokens: ${promptTokens}`)
    console.log(`  ⚡ Target Model: compound-beta`)

    const startTime = Date.now()

    // 🔥 FIXED: Thử compound-beta trước
    let completion
    let actualModel = "unknown"

    try {
      console.log(`🔍 DEBUG: Requesting compound-beta for optimization`)
      completion = await groq.chat.completions.create({
        model: "compound-beta",
        messages: [{ role: "user", content: optimizePrompt }],
        temperature: 0.1,
        max_tokens: 2000,
      })
      actualModel = "compound-beta"
    } catch (error) {
      console.log(`⚠️ compound-beta failed, trying compound-beta-mini: ${error}`)
      completion = await groq.chat.completions.create({
        model: "compound-beta-mini",
        messages: [{ role: "user", content: optimizePrompt }],
        temperature: 0.1,
        max_tokens: 2000,
      })
      actualModel = "compound-beta-mini"
    }

    const responseTime = Date.now() - startTime
    console.log(`📥 CSV RESPONSE RECEIVED (${responseTime}ms) from ${actualModel}:`)
    console.log(`🔍 DEBUG: Completion model field:`, completion.model)

    if (!completion?.choices?.[0]?.message?.content) {
      throw new Error("Empty response from API")
    }

    const optimizedCSV = completion.choices[0].message.content.trim()
    const outputTokens = estimateTokens(optimizedCSV)
    const compressionRatio = Math.round((outputTokens / estimatedTokens) * 100)

    console.log(`📊 CSV OUTPUT ANALYSIS:`)
    console.log(`  📄 Response chars: ${optimizedCSV.length}`)
    console.log(`  🎯 OUTPUT TOKENS: ${outputTokens}`)
    console.log(`  📉 Compression: ${compressionRatio}%`)
    console.log(`  ⚡ Processing time: ${responseTime}ms`)
    console.log(`  🔍 Actual model used: ${completion.model || actualModel}`)

    // Validate optimized CSV
    const optimizedValidation = validateCSV(optimizedCSV)
    if (optimizedValidation.isValid) {
      console.log(`✅ CSV OPTIMIZATION SUCCESS:`)
      console.log(`  📊 Valid CSV with ${optimizedValidation.rowCount} rows`)
      console.log(`===== END CSV API ${keyIndex + 1} =====\n`)

      return {
        success: true,
        optimizedData: optimizedCSV,
        keyIndex: keyIndex,
      }
    } else {
      console.log(`❌ CSV OPTIMIZATION VALIDATION FAILED:`)
      console.log(`  🔍 Response preview: ${optimizedCSV.substring(0, 200)}...`)
      throw new Error(`Invalid optimized CSV: ${optimizedValidation.error}`)
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`❌ CSV API ${keyIndex + 1} FAILED: ${errorMsg}`)

    return {
      success: false,
      optimizedData: "",
      keyIndex: keyIndex,
      error: errorMsg,
    }
  }
}

// 🔥 UPDATED: Function chính với CSV format - GIẢM THIỂU API CALLS
export const preprocessDataWithPipeline = async (
  data: any[],
  tableName: string,
): Promise<{ success: boolean; optimizedData: string; analysis: string; keyUsage: any }> => {
  try {
    console.log(`🚀 Bắt đầu CSV Data Preprocessing Pipeline với ${data.length} records`)

    if (!API_KEYS || API_KEYS.length < 5) {
      throw new Error("Cần ít nhất 5 API keys (4 cho optimize + 1 cho analysis)")
    }

    // 🔥 DEBUG: Test available models first
    console.log(`🔍 DEBUG: Testing available models...`)
    const workingModels = await testAvailableModels()
    console.log(`✅ Working models: ${workingModels.join(", ")}`)

    // 🔥 BƯỚC 1: Tính toán CSV token distribution
    console.log(`📊 BƯỚC 1: Tính toán CSV token distribution...`)
    const tokenDistribution = calculateTokenDistribution(data)

    if (tokenDistribution.distribution.length === 0) {
      throw new Error("Không thể chia dữ liệu thành chunks")
    }

    console.log(`📊 CSV vs JSON Comparison:`)
    console.log(`  📄 JSON: ${tokenDistribution.jsonSize} chars`)
    console.log(`  📄 CSV: ${tokenDistribution.csvSize} chars`)
    console.log(
      `  📉 Compression: ${tokenDistribution.compressionRatio}% (${100 - tokenDistribution.compressionRatio}% reduction)`,
    )

    // 🔥 BƯỚC 2: Test API keys - CHỈ 1 LẦN
    console.log(`🧪 Test API keys cho CSV optimize...`)
    const keyTests = await Promise.all(API_KEYS.slice(0, 4).map((key, index) => testSingleChunkCSV([data[0]], index)))
    const workingKeys = keyTests.filter(Boolean).length
    console.log(`🔑 ${workingKeys}/4 CSV optimize APIs hoạt động`)

    if (workingKeys === 0) {
      // Fallback với raw CSV
      const rawCSV = convertToCSV(data)
      return {
        success: true,
        optimizedData: rawCSV,
        analysis: `⚠️ Không có API keys hoạt động, sử dụng raw CSV với ${data.length} records.`,
        keyUsage: { error: true, format: "CSV", fallback: true },
      }
    }

    // 🔥 BƯỚC 3: Optimize từng chunk - CHỈ 1 REQUEST PER API
    console.log(`⏳ BƯỚC 3: CSV Optimize ${tokenDistribution.distribution.length} chunks với ${workingKeys} APIs...`)

    const optimizeResults = []

    // Xử lý từng chunk với API tương ứng - KHÔNG RETRY
    for (let i = 0; i < Math.min(4, tokenDistribution.distribution.length); i++) {
      const chunk = tokenDistribution.distribution[i]
      const keyIndex = i // API 1,2,3,4

      console.log(`🔧 Xử lý CSV chunk ${i + 1} với API ${keyIndex + 1}`)

      // CHỈ 1 REQUEST - KHÔNG RETRY
      const result = await optimizeDataChunk(
        API_KEYS[keyIndex],
        keyIndex,
        chunk,
        i,
        tokenDistribution.distribution.length,
        tokenDistribution.tokensPerAPI,
      )

      optimizeResults.push(result)

      // Delay nhỏ giữa các API calls
      if (i < tokenDistribution.distribution.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }

    // Kiểm tra kết quả optimize
    const successfulOptimizes = optimizeResults.filter((r) => r && r.success)
    console.log(`📊 CSV Optimize results: ${successfulOptimizes.length}/4 APIs thành công`)

    // Nếu tất cả thất bại, sử dụng raw CSV
    if (successfulOptimizes.length === 0) {
      const rawCSV = convertToCSV(data)
      return {
        success: true,
        optimizedData: rawCSV,
        analysis: `⚠️ Optimize thất bại, sử dụng raw CSV với ${data.length} records.`,
        keyUsage: {
          totalKeys: API_KEYS.length,
          optimizeKeys: 0,
          fallback: true,
          format: "CSV",
        },
      }
    }

    // 🔥 BƯỚC 4: Gộp CSV data đã optimize
    console.log(`📊 BƯỚC 4: Gộp ${successfulOptimizes.length} CSV chunks optimize`)

    let combinedCSVData = ""
    let headers = ""
    const allRows: string[] = []
    let validChunks = 0

    successfulOptimizes.forEach((result, index) => {
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
        console.warn(`⚠️ Không thể parse CSV result từ API ${result.keyIndex + 1}:`, parseError)
      }
    })

    combinedCSVData = headers + "\n" + allRows.join("\n")
    const finalTokens = estimateTokens(combinedCSVData)

    // 🔥 BƯỚC 5: Phân tích tổng hợp - CHỈ 1 REQUEST
    console.log(`🤖 BƯỚC 5: Phân tích tổng hợp CSV với API 5`)

    const analysisPrompt = `Bạn là một AI analyst chuyên nghiệp. Dưới đây là dữ liệu từ bảng "${tableName}" trong CSV format (${data.length} records gốc, ${validChunks}/4 APIs thành công):

${combinedCSVData}

Hãy phân tích chi tiết dữ liệu CSV này:
1. 📊 Tổng quan về dữ liệu và cấu trúc CSV
2. 📈 Thống kê quan trọng từ các cột  
3. 🔍 Patterns và insights từ dữ liệu
4. 💡 Nhận xét và đánh giá chất lượng dữ liệu

Trả lời bằng tiếng Việt, chi tiết và có cấu trúc.`

    const finalAnalysis = await analyzeWithSingleKey(API_KEYS[4], 4, analysisPrompt)

    const keyUsage = {
      totalKeys: API_KEYS.length,
      optimizeKeys: successfulOptimizes.length,
      analysisKey: 1,
      successRate: `${Math.round((successfulOptimizes.length / 4) * 100)}%`,
      chunks: tokenDistribution.distribution.length,
      successfulChunks: validChunks,
      finalDataSize: combinedCSVData.length,
      finalTokens: finalTokens,
      format: "CSV",
      csvCompressionVsJson: `${tokenDistribution.compressionRatio}%`,
      workingModels: workingModels,
    }

    return {
      success: true,
      optimizedData: combinedCSVData,
      analysis: finalAnalysis,
      keyUsage: keyUsage,
    }
  } catch (error) {
    console.error("❌ CSV Data Preprocessing Pipeline failed:", error)
    return {
      success: false,
      optimizedData: "",
      analysis: `❌ Lỗi CSV preprocessing pipeline: ${error}`,
      keyUsage: { error: true, format: "CSV" },
    }
  }
}

// 🔥 UPDATED: Function trả lời câu hỏi với CSV data - CHỈ 1 REQUEST
export const answerQuestionWithOptimizedData = async (
  optimizedCSVData: string,
  tableName: string,
  question: string,
  originalRecordCount: number,
): Promise<string> => {
  try {
    console.log(`🤔 Trả lời câu hỏi với optimized CSV data (${originalRecordCount} records)`)

    const questionPrompt = `Bạn là một AI assistant thông minh. Dưới đây là TOÀN BỘ dữ liệu từ bảng "${tableName}" trong CSV format (${originalRecordCount} records):

${optimizedCSVData}

Câu hỏi: ${question}

Hướng dẫn phân tích CSV:
- Dòng đầu tiên là headers (tên cột)
- Các dòng tiếp theo là dữ liệu
- Hãy phân tích theo cột và tìm patterns
- Đưa ra số liệu cụ thể và insights

Trả lời bằng tiếng Việt:`

    // CHỈ 1 REQUEST DUY NHẤT
    return await analyzeWithSingleKey(API_KEYS[4], 4, questionPrompt)
  } catch (error) {
    console.error("❌ answerQuestionWithOptimizedData failed:", error)
    return `❌ Lỗi khi trả lời câu hỏi với CSV: ${error}`
  }
}

// Export function chính
export const analyzeDataWithParallelKeys = preprocessDataWithPipeline

// 🔥 UPDATED: Function trả lời câu hỏi - sử dụng CSV optimized data
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

// 🔥 FIXED: Test functions với proper type handling
export const testAllApiKeys = async (): Promise<{
  success: boolean
  message: string
  workingKeys: number
  totalKeys: number
  keyDetails: any[]
}> => {
  console.log(`🧪 Testing ${API_KEYS.length} API keys với compound-beta models...`)

  // CHỈ TEST 1 LẦN với proper type handling
  const testPromises = API_KEYS.map(async (apiKey, index) => {
    const cacheKey = `full_test_${index}`

    // Check detailed cache first
    if (detailedTestCache.has(cacheKey)) {
      console.log(`🔄 Using cached detailed test result for API ${index + 1}`)
      return detailedTestCache.get(cacheKey)
    }

    try {
      const groq = createGroqClient(apiKey)

      // 🔥 FIXED: Test với compound-beta
      console.log(`🧪 Testing API ${index + 1} with compound-beta`)
      const testCompletion = await groq.chat.completions.create({
        model: "compound-beta",
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
      console.log(`✅ CSV API ${index + 1}: OK with compound-beta`)
      console.log(`🔍 DEBUG: Actual model used: ${testCompletion.model}`)

      const result = {
        keyIndex: index + 1,
        status: "success" as const,
        response: response,
        preview: `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`,
        role: index < 4 ? "CSV optimize" : "CSV analysis",
        actualModel: testCompletion.model || "compound-beta",
      }

      // Cache detailed result
      detailedTestCache.set(cacheKey, result)
      // Also cache boolean result for other functions
      testResultsCache.set(`test_${index}`, true)

      return result
    } catch (error) {
      console.log(`❌ CSV API ${index + 1} compound-beta failed: ${error}`)

      // 🔥 FALLBACK: Try compound-beta-mini
      try {
        console.log(`🔄 Trying compound-beta-mini for API ${index + 1}`)
        const groq = createGroqClient(apiKey)

        const fallbackCompletion = await groq.chat.completions.create({
          model: "compound-beta-mini",
          messages: [
            {
              role: "user",
              content: "Test: Return 'OK'",
            },
          ],
          temperature: 0.1,
          max_tokens: 5,
        })

        const response = fallbackCompletion?.choices?.[0]?.message?.content || "No response"
        console.log(`✅ CSV API ${index + 1}: OK with compound-beta-mini`)
        console.log(`🔍 DEBUG: Actual model used: ${fallbackCompletion.model}`)

        const result = {
          keyIndex: index + 1,
          status: "success" as const,
          response: response,
          preview: `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`,
          role: index < 4 ? "CSV optimize" : "CSV analysis",
          actualModel: fallbackCompletion.model || "compound-beta-mini",
        }

        // Cache detailed result
        detailedTestCache.set(cacheKey, result)
        // Also cache boolean result for other functions
        testResultsCache.set(`test_${index}`, true)

        return result
      } catch (fallbackError) {
        console.log(`❌ CSV API ${index + 1} compound-beta-mini also failed: ${fallbackError}`)
        const result = {
          keyIndex: index + 1,
          status: "failed" as const,
          error: error instanceof Error ? error.message : String(error),
          preview: `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`,
          role: index < 4 ? "CSV optimize" : "CSV analysis",
        }

        // Cache detailed result
        detailedTestCache.set(cacheKey, result)
        // Also cache boolean result for other functions
        testResultsCache.set(`test_${index}`, false)

        return result
      }
    }
  })

  const results = await Promise.all(testPromises)
  const workingKeys = results.filter((r) => r.status === "success").length

  return {
    success: workingKeys > 0,
    message: `${workingKeys}/${API_KEYS.length} API keys hoạt động với compound-beta models (4 optimize + 1 analysis)`,
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
    workingModel: "compound-beta",
    format: "CSV",
  }
}

export const getAvailableModels = (): string[] => {
  return AVAILABLE_MODELS
}

export const getApiKeysInfo = () => {
  return {
    totalKeys: API_KEYS.length,
    keysPreview: API_KEYS.map(
      (key, index) =>
        `API ${index + 1}: ${key.substring(0, 10)}...${key.substring(key.length - 4)} (${index < 4 ? "CSV optimize" : "CSV analysis"})`,
    ),
    format: "CSV",
  }
}

// 🔥 FIXED: Clear cache function
export const clearApiCache = () => {
  apiCallCache.clear()
  testResultsCache.clear()
  detailedTestCache.clear()
  console.log("🔄 API cache cleared")
}

// 🔥 NEW: Export debug functions
export { testAvailableModels, debugModelCall }
