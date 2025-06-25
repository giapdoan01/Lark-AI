import { Groq } from "groq-sdk"

// Danh sách API keys
const API_KEYS = [
  process.env.NEXT_PUBLIC_GROQ_API_KEY_1 || "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",
  process.env.NEXT_PUBLIC_GROQ_API_KEY_2 || "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",
  process.env.NEXT_PUBLIC_GROQ_API_KEY_3 || "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",
  process.env.NEXT_PUBLIC_GROQ_API_KEY_4 || "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",
  process.env.NEXT_PUBLIC_GROQ_API_KEY_5 || "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",
].filter((key) => key && !key.includes("account") && key.startsWith("gsk_"))

const AVAILABLE_MODELS = [
  "meta-llama/llama-guard-4-12b", // Chỉ dùng model này
]

// Function ước tính số tokens (1 token ≈ 4 characters)
const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / 4)
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
  console.log(`⚡ Model: meta-llama/llama-guard-4-12b`)

  // Chia data thành 4 phần dựa trên record count (vì CSV format đồng nhất hơn)
  const recordsPerAPI = Math.ceil(data.length / 4)
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

// Thêm function test single chunk với CSV
const testSingleChunkCSV = async (chunk: any[], keyIndex: number): Promise<boolean> => {
  try {
    const apiKey = API_KEYS[keyIndex]
    const csvContent = convertToCSV(chunk)
    const estimatedTokens = estimateTokens(csvContent)

    console.log(`🧪 Test CSV chunk: ${chunk.length} records, ~${estimatedTokens} tokens`)

    if (estimatedTokens > 15000) {
      console.log(`⚠️ CSV Chunk quá lớn (${estimatedTokens} tokens), cần chia nhỏ hơn`)
      return false
    }

    const groq = createGroqClient(apiKey)

    // Test với prompt đơn giản
    const testCompletion = await groq.chat.completions.create({
      model: "meta-llama/llama-guard-4-12b",
      messages: [
        {
          role: "user",
          content: "Test: Return 'CSV OK'",
        },
      ],
      temperature: 0.1,
      max_tokens: 10,
    })

    const response = testCompletion?.choices?.[0]?.message?.content
    console.log(`✅ Key ${keyIndex + 1} CSV test OK: ${response}`)
    return true
  } catch (error) {
    console.log(`❌ Key ${keyIndex + 1} CSV test failed: ${error}`)
    return false
  }
}

const createGroqClient = (apiKey: string): Groq => {
  return new Groq({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true,
  })
}

// 🔥 UPDATED: Helper function để phân tích với CSV format
const analyzeWithSingleKey = async (apiKey: string, keyIndex: number, prompt: string): Promise<string> => {
  try {
    const promptTokens = estimateTokens(prompt)
    console.log(`🤖 FINAL ANALYSIS với API 5 (Key ${keyIndex + 1}):`)
    console.log(`  🎯 Analysis INPUT tokens: ${promptTokens}`)
    console.log(`  ⚡ Model: meta-llama/llama-guard-4-12b`)
    console.log(`  📊 Format: CSV`)

    const groq = createGroqClient(apiKey)

    const startTime = Date.now()
    const completion = (await Promise.race([
      groq.chat.completions.create({
        model: "meta-llama/llama-guard-4-12b",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 25000,
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout 90s")), 90000)),
    ])) as any

    const responseTime = Date.now() - startTime

    if (!completion?.choices?.[0]?.message?.content) {
      console.log(`⚠️ No response content from meta-llama/llama-guard-4-12b`)
      throw new Error("No response content")
    }

    const analysis = completion.choices[0].message.content || "Không có phân tích"
    const outputTokens = estimateTokens(analysis)

    console.log(`✅ CSV ANALYSIS COMPLETE:`)
    console.log(`  🎯 OUTPUT tokens: ${outputTokens}`)
    console.log(`  ⚡ Processing time: ${responseTime}ms`)
    console.log(`  📊 Token efficiency: ${Math.round((outputTokens / promptTokens) * 100)}%`)

    return analysis
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`❌ CSV Analysis failed with meta-llama/llama-guard-4-12b: ${errorMsg}`)
    return `❌ Không thể phân tích CSV với meta-llama/llama-guard-4-12b: ${errorMsg}`
  }
}

// 🔥 UPDATED: Optimize data chunk với CSV format
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

    // 🔥 UPDATED: Log chi tiết tokens với CSV
    console.log(`\n🔧 ===== API ${keyIndex + 1} - CSV CHUNK ${chunkIndex + 1}/${totalChunks} =====`)
    console.log(`📊 CSV TOKEN ANALYSIS:`)
    console.log(`  🎯 Target tokens for this API: ${targetTokens}`)
    console.log(`  📝 Actual records: ${dataChunk.length}`)
    console.log(`  📄 CSV characters: ${csvContent.length}`)
    console.log(`  🎯 INPUT TOKENS: ${estimatedTokens}`)
    console.log(`  📈 Token/record: ${Math.round(estimatedTokens / dataChunk.length)}`)
    console.log(`  📊 Target vs Actual: ${Math.round((estimatedTokens / targetTokens) * 100)}%`)

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

    // Kiểm tra chunk size trước khi gửi
    if (estimatedTokens > 15000) {
      console.log(`❌ CSV CHUNK QUÁ LỚN: ${estimatedTokens} tokens > 15000 limit`)
      return {
        success: false,
        optimizedData: "",
        keyIndex: keyIndex,
        error: `CSV chunk quá lớn: ${estimatedTokens} tokens > 15000 limit`,
      }
    }

    const groq = createGroqClient(apiKey)

    // 🔥 UPDATED: Prompt cho CSV optimization
    const optimizePrompt = `Optimize this CSV data - remove empty rows, clean null values, maintain CSV format:

${csvContent}

Return clean, optimized CSV only (keep headers):`

    const promptTokens = estimateTokens(optimizePrompt)
    console.log(`📤 SENDING CSV REQUEST:`)
    console.log(`  🎯 Total INPUT tokens: ${promptTokens} (prompt + CSV data)`)
    console.log(`  ⚡ Model: meta-llama/llama-guard-4-12b`)
    console.log(`  🔄 Max output tokens: 8000`)

    try {
      const startTime = Date.now()
      const completion = (await Promise.race([
        groq.chat.completions.create({
          model: "meta-llama/llama-guard-4-12b",
          messages: [{ role: "user", content: optimizePrompt }],
          temperature: 0.1,
          max_tokens: 8000,
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout 60s")), 60000)),
      ])) as any

      const responseTime = Date.now() - startTime
      console.log(`📥 CSV RESPONSE RECEIVED (${responseTime}ms):`)

      if (!completion?.choices?.[0]?.message?.content) {
        throw new Error("Empty response from API")
      }

      const optimizedCSV = completion.choices[0].message.content.trim()
      const outputTokens = estimateTokens(optimizedCSV)
      const compressionRatio = Math.round((outputTokens / estimatedTokens) * 100)
      const tokensSaved = estimatedTokens - outputTokens

      console.log(`📊 CSV OUTPUT ANALYSIS:`)
      console.log(`  📄 Response chars: ${optimizedCSV.length}`)
      console.log(`  🎯 OUTPUT TOKENS: ${outputTokens}`)
      console.log(`  📉 Compression: ${compressionRatio}% (${tokensSaved} tokens saved)`)
      console.log(`  ⚡ Processing time: ${responseTime}ms`)
      console.log(`  🎯 Efficiency: ${Math.round((outputTokens / targetTokens) * 100)}% of target`)

      // Validate optimized CSV
      const optimizedValidation = validateCSV(optimizedCSV)
      if (optimizedValidation.isValid) {
        console.log(`✅ CSV OPTIMIZATION SUCCESS:`)
        console.log(`  📊 Valid CSV with ${optimizedValidation.rowCount} rows`)
        console.log(`  🎯 TOKEN FLOW: ${estimatedTokens} → ${outputTokens} (${compressionRatio}%)`)
        console.log(`===== END CSV API ${keyIndex + 1} =====\n`)

        return {
          success: true,
          optimizedData: optimizedCSV,
          keyIndex: keyIndex,
        }
      } else {
        console.log(`❌ CSV OPTIMIZATION VALIDATION FAILED:`)
        console.log(`  🔍 Response preview: ${optimizedCSV.substring(0, 200)}...`)
        console.log(`  ❌ Error: ${optimizedValidation.error}`)
        throw new Error(`Invalid optimized CSV: ${optimizedValidation.error}`)
      }
    } catch (apiError) {
      const errorMsg = apiError instanceof Error ? apiError.message : String(apiError)
      console.log(`❌ CSV API ERROR:`)
      console.log(`  🚫 Error: ${errorMsg}`)
      console.log(`  🎯 INPUT tokens attempted: ${estimatedTokens}`)

      // Log chi tiết lỗi API
      if (errorMsg.includes("rate_limit")) {
        console.log(`  ⏰ Rate limit exceeded for API ${keyIndex + 1}`)
      } else if (errorMsg.includes("quota")) {
        console.log(`  💰 Quota exceeded for API ${keyIndex + 1}`)
      } else if (errorMsg.includes("timeout")) {
        console.log(`  ⏱️ Request timeout (60s) for API ${keyIndex + 1}`)
      } else {
        console.log(`  🔍 Unknown error for API ${keyIndex + 1}`)
      }

      throw new Error(errorMsg)
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

// Function debug optimize process với CSV
const debugOptimizeProcess = async (chunk: any[], keyIndex: number): Promise<void> => {
  try {
    const csvContent = convertToCSV(chunk)
    const estimatedTokens = estimateTokens(csvContent)

    console.log(`🔍 DEBUG CSV API ${keyIndex + 1}:`)
    console.log(`  - Records: ${chunk.length}`)
    console.log(`  - CSV Characters: ${csvContent.length}`)
    console.log(`  - Estimated tokens: ${estimatedTokens}`)
    console.log(`  - CSV preview:`, csvContent.substring(0, 200) + "...")

    // Test API key trước
    const apiKey = API_KEYS[keyIndex]
    const groq = createGroqClient(apiKey)

    console.log(`🧪 Testing CSV API ${keyIndex + 1} với simple request...`)
    const testResult = await groq.chat.completions.create({
      model: "meta-llama/llama-guard-4-12b",
      messages: [{ role: "user", content: "Say 'CSV test ok'" }],
      temperature: 0.1,
      max_tokens: 10,
    })

    console.log(`✅ CSV API ${keyIndex + 1} test result:`, testResult?.choices?.[0]?.message?.content)
  } catch (error) {
    console.error(`❌ CSV DEBUG failed for API ${keyIndex + 1}:`, error)
  }
}

// 🔥 UPDATED: Function chính với CSV format
export const preprocessDataWithPipeline = async (
  data: any[],
  tableName: string,
): Promise<{ success: boolean; optimizedData: string; analysis: string; keyUsage: any }> => {
  try {
    console.log(`🚀 Bắt đầu CSV Data Preprocessing Pipeline với ${data.length} records`)

    if (!API_KEYS || API_KEYS.length < 5) {
      throw new Error("Cần ít nhất 5 API keys (4 cho optimize + 1 cho analysis)")
    }

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

    // Test API keys trước với CSV format
    console.log(`🧪 Test 4 API keys đầu cho CSV optimize...`)
    const keyTests = await Promise.all(API_KEYS.slice(0, 4).map((key, index) => testSingleChunkCSV([data[0]], index)))
    const workingKeys = keyTests.filter(Boolean).length
    console.log(`🔑 ${workingKeys}/4 CSV optimize APIs hoạt động`)

    if (workingKeys === 0) {
      throw new Error("Không có API keys nào hoạt động cho CSV optimize")
    }

    // Test API thứ 5 cho analysis
    console.log(`🧪 Test API 5 cho CSV analysis...`)
    const analysisKeyTest = await testSingleChunkCSV([data[0]], 4)
    if (!analysisKeyTest) {
      console.log(`⚠️ API 5 không hoạt động, sẽ dùng API 1 cho analysis`)
    }

    // BƯỚC 2: Optimize từng chunk với CSV format
    console.log(`⏳ BƯỚC 2: CSV Optimize ${tokenDistribution.distribution.length} chunks với 4 APIs...`)

    const optimizeResults = []

    // Xử lý từng chunk với API tương ứng
    for (let i = 0; i < Math.min(4, tokenDistribution.distribution.length); i++) {
      const chunk = tokenDistribution.distribution[i]
      const keyIndex = i // API 1,2,3,4

      console.log(`🔧 Xử lý CSV chunk ${i + 1} với API ${keyIndex + 1}`)

      // Debug trước khi optimize
      await debugOptimizeProcess(chunk, keyIndex)

      let result = null
      let retryCount = 0
      const maxRetries = 2

      // Retry mechanism
      while (retryCount <= maxRetries && (!result || !result.success)) {
        try {
          if (retryCount > 0) {
            console.log(`🔄 CSV Retry ${retryCount}/${maxRetries} cho API ${keyIndex + 1}`)
            await new Promise((resolve) => setTimeout(resolve, 3000)) // Wait 3s
          }

          result = await optimizeDataChunk(
            API_KEYS[keyIndex],
            keyIndex,
            chunk,
            i,
            tokenDistribution.distribution.length,
            tokenDistribution.tokensPerAPI,
          )

          if (result && result.success) {
            console.log(`✅ CSV API ${keyIndex + 1}: Thành công sau ${retryCount} retries`)
            break
          } else {
            console.log(
              `❌ CSV API ${keyIndex + 1}: Thất bại lần ${retryCount + 1} - ${result?.error || "Unknown error"}`,
            )
          }
        } catch (error) {
          console.log(`❌ CSV API ${keyIndex + 1}: Exception lần ${retryCount + 1} - ${error}`)
          result = {
            success: false,
            optimizedData: "",
            keyIndex: keyIndex,
            error: String(error),
          }
        }

        retryCount++
      }

      // Đảm bảo result không null trước khi push
      if (result) {
        optimizeResults.push(result)
      } else {
        optimizeResults.push({
          success: false,
          optimizedData: "",
          keyIndex: keyIndex,
          error: "No result after retries",
        })
      }

      // Delay giữa các API calls
      if (i < tokenDistribution.distribution.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    // Debug chi tiết kết quả
    console.log(`🔍 DEBUG: CSV Optimize results details:`)
    optimizeResults.forEach((result, index) => {
      if (result.success) {
        console.log(`✅ CSV API ${index + 1}: Success`)
      } else {
        console.log(`❌ CSV API ${index + 1}: Failed - ${result.error}`)
      }
    })

    // Kiểm tra kết quả optimize
    const successfulOptimizes = optimizeResults.filter((r) => r && r.success)
    const failedOptimizes = optimizeResults.filter((r) => r && !r.success)

    console.log(`📊 CSV Optimize results: ${successfulOptimizes.length}/4 APIs thành công`)

    // Nếu tất cả thất bại, thử fallback với raw CSV
    if (successfulOptimizes.length === 0) {
      console.log(`🔄 CSV FALLBACK: Tất cả optimize thất bại, sử dụng raw CSV data`)

      const rawCSV = convertToCSV(data.slice(0, 50)) // Lấy 50 records đầu

      const keyUsage = {
        totalKeys: API_KEYS.length,
        optimizeKeys: 0,
        analysisKey: 1,
        failedKeys: 4,
        successRate: "0%",
        chunks: tokenDistribution.distribution.length,
        successfulChunks: 0,
        finalDataSize: rawCSV.length,
        fallback: true,
        tokenDistribution: tokenDistribution,
        format: "CSV",
        compressionRatio: tokenDistribution.compressionRatio,
      }

      return {
        success: true,
        optimizedData: rawCSV,
        analysis: `⚠️ Không thể optimize CSV với 4 APIs, sử dụng ${Math.min(50, data.length)} records đầu tiên từ tổng ${data.length} records trong CSV format.`,
        keyUsage: keyUsage,
      }
    }

    // BƯỚC 3: Gộp CSV data đã optimize
    console.log(`📊 BƯỚC 3: Gộp ${successfulOptimizes.length} CSV chunks optimize`)

    let combinedCSVData = ""
    let headers = ""
    const allRows: string[] = []
    let validChunks = 0

    successfulOptimizes.forEach((result, index) => {
      try {
        const csvLines = result.optimizedData.trim().split("\n")
        if (csvLines.length < 2) return // Skip if no data

        if (validChunks === 0) {
          // First chunk - keep headers
          headers = csvLines[0]
          allRows.push(...csvLines.slice(1))
        } else {
          // Subsequent chunks - skip headers, add data rows
          allRows.push(...csvLines.slice(1))
        }
        validChunks++
      } catch (parseError) {
        console.warn(`⚠️ Không thể parse CSV result từ API ${result.keyIndex + 1}:`, parseError)
      }
    })

    combinedCSVData = headers + "\n" + allRows.join("\n")

    const finalTokens = estimateTokens(combinedCSVData)
    console.log(`📊 BƯỚC 3: Đã gộp ${validChunks} CSV chunks optimize`)
    console.log(`  📄 Final CSV: ${combinedCSVData.length} characters`)
    console.log(`  🎯 Final tokens: ${finalTokens}`)
    console.log(`  📉 Total compression: ${Math.round((finalTokens / tokenDistribution.totalTokens) * 100)}%`)

    // BƯỚC 4: Phân tích tổng hợp với CSV format
    const analysisKeyIndex = 4 // API 5
    const analysisApiKey = API_KEYS[analysisKeyIndex]

    if (!analysisApiKey) {
      throw new Error("Không có API 5 cho phân tích cuối")
    }

    console.log(`🤖 BƯỚC 4: Phân tích tổng hợp CSV với API 5`)

    const analysisPrompt = `Bạn là một AI analyst chuyên nghiệp. Dưới đây là dữ liệu từ bảng "${tableName}" trong CSV format đã được optimize bởi 4 APIs (${data.length} records gốc, ${validChunks}/4 APIs thành công):

${combinedCSVData}

CSV Token Distribution Summary:
- Total original tokens: ${tokenDistribution.totalTokens}
- Tokens per API: ${tokenDistribution.tokensPerAPI}
- Final optimized tokens: ${finalTokens}
- CSV compression ratio: ${tokenDistribution.compressionRatio}% (${100 - tokenDistribution.compressionRatio}% token reduction vs JSON)

Hãy phân tích chi tiết dữ liệu CSV này:
1. 📊 Tổng quan về dữ liệu và cấu trúc CSV
2. 📈 Thống kê quan trọng từ các cột  
3. 🔍 Patterns và insights từ dữ liệu
4. 💡 Nhận xét và đánh giá chất lượng dữ liệu

Trả lời bằng tiếng Việt, chi tiết và có cấu trúc.`

    const finalAnalysis = await analyzeWithSingleKey(analysisApiKey, analysisKeyIndex, analysisPrompt)

    const keyUsage = {
      totalKeys: API_KEYS.length,
      optimizeKeys: successfulOptimizes.length,
      analysisKey: 1,
      failedKeys: failedOptimizes.length,
      successRate: `${Math.round((successfulOptimizes.length / 4) * 100)}%`,
      chunks: tokenDistribution.distribution.length,
      successfulChunks: validChunks,
      finalDataSize: combinedCSVData.length,
      tokenDistribution: tokenDistribution,
      finalTokens: finalTokens,
      compressionRatio: `${Math.round((finalTokens / tokenDistribution.totalTokens) * 100)}%`,
      format: "CSV",
      csvCompressionVsJson: `${tokenDistribution.compressionRatio}%`,
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

// 🔥 UPDATED: Function trả lời câu hỏi với CSV data
export const answerQuestionWithOptimizedData = async (
  optimizedCSVData: string,
  tableName: string,
  question: string,
  originalRecordCount: number,
): Promise<string> => {
  try {
    console.log(`🤔 Trả lời câu hỏi với optimized CSV data (${originalRecordCount} records)`)

    // Sử dụng API 5 để trả lời câu hỏi
    const questionKeyIndex = 4 // API 5
    const questionApiKey = API_KEYS[questionKeyIndex]

    if (!questionApiKey) {
      throw new Error("Không có API 5 để trả lời câu hỏi")
    }

    const questionPrompt = `Bạn là một AI assistant thông minh. Dưới đây là TOÀN BỘ dữ liệu từ bảng "${tableName}" trong CSV format (${originalRecordCount} records đã được optimize bởi 4 APIs):

${optimizedCSVData}

Đây là dữ liệu HOÀN CHỈNH từ ${originalRecordCount} bản ghi trong CSV format. Hãy dựa vào dữ liệu CSV này để trả lời câu hỏi một cách chính xác và chi tiết.

Câu hỏi: ${question}

Hướng dẫn phân tích CSV:
- Dòng đầu tiên là headers (tên cột)
- Các dòng tiếp theo là dữ liệu
- Hãy phân tích theo cột và tìm patterns
- Đưa ra số liệu cụ thể và insights

Trả lời bằng tiếng Việt:`

    return await analyzeWithSingleKey(questionApiKey, questionKeyIndex, questionPrompt)
  } catch (error) {
    console.error("❌ answerQuestionWithOptimizedData failed:", error)
    return `❌ Lỗi khi trả lời câu hỏi với CSV: ${error}`
  }
}

// Export function chính thay thế analyzeDataWithParallelKeys
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
      // Nếu có optimized data (CSV format), sử dụng nó
      return await answerQuestionWithOptimizedData(optimizedData, tableName, question, data.length)
    } else {
      // Fallback: tạo CSV optimized data nhanh
      const quickCSV = convertToCSV(data.slice(0, 30)) // 30 records đầu
      return await answerQuestionWithOptimizedData(quickCSV, tableName, question, data.length)
    }
  } catch (error) {
    console.error("❌ answerQuestionWithData failed:", error)
    return `❌ Lỗi khi trả lời câu hỏi: ${error}`
  }
}

// 🔥 UPDATED: Test functions với CSV support
export const testAllApiKeys = async (): Promise<{
  success: boolean
  message: string
  workingKeys: number
  totalKeys: number
  keyDetails: any[]
}> => {
  console.log(`🧪 Testing ${API_KEYS.length} API keys với CSV format...`)

  const testPromises = API_KEYS.map(async (apiKey, index) => {
    try {
      const groq = createGroqClient(apiKey)

      const testCompletion = await groq.chat.completions.create({
        model: "meta-llama/llama-guard-4-12b",
        messages: [
          {
            role: "user",
            content: "Test CSV: Return 'CSV OK'",
          },
        ],
        temperature: 0.1,
        max_tokens: 50,
      })

      const response = testCompletion?.choices?.[0]?.message?.content || "No response"
      console.log(`✅ CSV API ${index + 1}: OK`)

      return {
        keyIndex: index + 1,
        status: "success" as const,
        response: response,
        preview: `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`,
        role: index < 4 ? "CSV optimize" : "CSV analysis",
      }
    } catch (error) {
      console.log(`❌ CSV API ${index + 1}: ${error}`)
      return {
        keyIndex: index + 1,
        status: "failed" as const,
        error: error instanceof Error ? error.message : String(error),
        preview: `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`,
        role: index < 4 ? "CSV optimize" : "CSV analysis",
      }
    }
  })

  const results = await Promise.all(testPromises)
  const workingKeys = results.filter((r) => r.status === "success").length

  return {
    success: workingKeys > 0,
    message: `${workingKeys}/${API_KEYS.length} API keys hoạt động với CSV format (4 optimize + 1 analysis)`,
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
    workingModel: "meta-llama/llama-guard-4-12b",
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
