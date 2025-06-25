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

// 🔥 THÊM: Function tính tổng tokens và chia đều cho 4 API
const calculateTokenDistribution = (
  data: any[],
): {
  totalTokens: number
  tokensPerAPI: number
  chunksPerAPI: number[]
  distribution: any[][]
} => {
  const fullDataText = JSON.stringify(data, null, 1)
  const totalTokens = estimateTokens(fullDataText)
  const tokensPerAPI = Math.ceil(totalTokens / 4) // Chia đều cho 4 API đầu

  console.log(`📊 ===== TOKEN DISTRIBUTION CALCULATION =====`)
  console.log(`🎯 Total records: ${data.length}`)
  console.log(`📄 Total characters: ${fullDataText.length}`)
  console.log(`🎯 TOTAL TOKENS: ${totalTokens}`)
  console.log(`📊 Tokens per API (4 APIs): ${tokensPerAPI}`)
  console.log(`⚡ Model: meta-llama/llama-guard-4-12b`)

  // Chia data thành 4 phần dựa trên token target
  const chunks: any[][] = []
  const chunksPerAPI: number[] = []
  let currentChunk: any[] = []
  let currentTokens = 0
  let currentAPIIndex = 0

  for (const record of data) {
    const recordText = JSON.stringify(record, null, 1)
    const recordTokens = estimateTokens(recordText)

    // Nếu thêm record này sẽ vượt quá target tokens cho API hiện tại
    if (currentTokens + recordTokens > tokensPerAPI && currentChunk.length > 0 && currentAPIIndex < 3) {
      console.log(`📊 API ${currentAPIIndex + 1} chunk: ${currentChunk.length} records, ${currentTokens} tokens`)
      chunks.push([...currentChunk])
      chunksPerAPI.push(currentChunk.length)

      currentChunk = [record]
      currentTokens = recordTokens
      currentAPIIndex++
    } else {
      currentChunk.push(record)
      currentTokens += recordTokens
    }
  }

  // Thêm chunk cuối cùng
  if (currentChunk.length > 0) {
    console.log(`📊 API ${currentAPIIndex + 1} chunk: ${currentChunk.length} records, ${currentTokens} tokens`)
    chunks.push(currentChunk)
    chunksPerAPI.push(currentChunk.length)
  }

  // Nếu có ít hơn 4 chunks, chia đều records còn lại
  while (chunks.length < 4 && data.length > 4) {
    const remainingRecords = data.length - chunks.reduce((sum, chunk) => sum + chunk.length, 0)
    if (remainingRecords > 0) {
      const recordsPerChunk = Math.ceil(remainingRecords / (4 - chunks.length))
      const startIndex = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
      const newChunk = data.slice(startIndex, startIndex + recordsPerChunk)

      if (newChunk.length > 0) {
        const chunkTokens = estimateTokens(JSON.stringify(newChunk, null, 1))
        console.log(`📊 API ${chunks.length + 1} chunk (balanced): ${newChunk.length} records, ${chunkTokens} tokens`)
        chunks.push(newChunk)
        chunksPerAPI.push(newChunk.length)
      }
    } else {
      break
    }
  }

  console.log(`📊 FINAL DISTRIBUTION:`)
  chunks.forEach((chunk, index) => {
    const chunkTokens = estimateTokens(JSON.stringify(chunk, null, 1))
    console.log(`  API ${index + 1}: ${chunk.length} records, ${chunkTokens} tokens`)
  })
  console.log(`  API 5: Tổng hợp và trả lời câu hỏi`)
  console.log(`===============================================`)

  return {
    totalTokens,
    tokensPerAPI,
    chunksPerAPI,
    distribution: chunks,
  }
}

// Thêm function test single chunk trước khi chạy pipeline
const testSingleChunk = async (chunk: any[], keyIndex: number): Promise<boolean> => {
  try {
    const apiKey = API_KEYS[keyIndex]
    const chunkText = JSON.stringify(chunk, null, 1)
    const estimatedTokens = estimateTokens(chunkText)

    console.log(`🧪 Test chunk: ${chunk.length} records, ~${estimatedTokens} tokens`)

    if (estimatedTokens > 15000) {
      console.log(`⚠️ Chunk quá lớn (${estimatedTokens} tokens), cần chia nhỏ hơn`)
      return false
    }

    const groq = createGroqClient(apiKey)

    // Test với prompt đơn giản
    const testCompletion = await groq.chat.completions.create({
      model: "meta-llama/llama-guard-4-12b",
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
    console.log(`✅ Key ${keyIndex + 1} test OK: ${response}`)
    return true
  } catch (error) {
    console.log(`❌ Key ${keyIndex + 1} test failed: ${error}`)
    return false
  }
}

// Thêm function test optimize đơn giản
const testOptimizeSimple = async (keyIndex: number): Promise<boolean> => {
  try {
    const apiKey = API_KEYS[keyIndex]
    const groq = createGroqClient(apiKey)

    console.log(`🧪 Test optimize với key ${keyIndex + 1}...`)

    // Test với data đơn giản
    const testData = [{ id: 1, name: "test", value: null }]
    const testPrompt = `Optimize JSON: ${JSON.stringify(testData)}. Return optimized JSON only:`

    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-guard-4-12b",
      messages: [{ role: "user", content: testPrompt }],
      temperature: 0.1,
      max_tokens: 100,
    })

    const result = completion?.choices?.[0]?.message?.content
    console.log(`✅ Key ${keyIndex + 1} optimize test result:`, result?.substring(0, 100))

    // Thử parse JSON
    if (result) {
      JSON.parse(result.trim())
      return true
    }
    return false
  } catch (error) {
    console.log(`❌ Key ${keyIndex + 1} optimize test failed:`, error)
    return false
  }
}

const createGroqClient = (apiKey: string): Groq => {
  return new Groq({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true,
  })
}

// Helper function để phân tích với 1 key - di chuyển lên trước
const analyzeWithSingleKey = async (apiKey: string, keyIndex: number, prompt: string): Promise<string> => {
  try {
    const promptTokens = estimateTokens(prompt)
    console.log(`🤖 FINAL ANALYSIS với API 5 (Key ${keyIndex + 1}):`)
    console.log(`  🎯 Analysis INPUT tokens: ${promptTokens}`)
    console.log(`  ⚡ Model: meta-llama/llama-guard-4-12b`)

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

    console.log(`✅ ANALYSIS COMPLETE:`)
    console.log(`  🎯 OUTPUT tokens: ${outputTokens}`)
    console.log(`  ⚡ Processing time: ${responseTime}ms`)
    console.log(`  📊 Token efficiency: ${Math.round((outputTokens / promptTokens) * 100)}%`)

    return analysis
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`❌ Analysis failed with meta-llama/llama-guard-4-12b: ${errorMsg}`)
    return `❌ Không thể phân tích với meta-llama/llama-guard-4-12b: ${errorMsg}`
  }
}

// Thêm detailed error logging trong optimizeDataChunk
const optimizeDataChunk = async (
  apiKey: string,
  keyIndex: number,
  dataChunk: any[],
  chunkIndex: number,
  totalChunks: number,
  targetTokens: number,
): Promise<{ success: boolean; optimizedData: string; keyIndex: number; error?: string }> => {
  try {
    const chunkText = JSON.stringify(dataChunk, null, 2)
    const estimatedTokens = estimateTokens(chunkText)

    // 🔥 THÊM: Log chi tiết tokens ngay từ đầu
    console.log(`\n🔧 ===== API ${keyIndex + 1} - CHUNK ${chunkIndex + 1}/${totalChunks} =====`)
    console.log(`📊 TOKEN ANALYSIS:`)
    console.log(`  🎯 Target tokens for this API: ${targetTokens}`)
    console.log(`  📝 Actual records: ${dataChunk.length}`)
    console.log(`  📄 Characters: ${chunkText.length}`)
    console.log(`  🎯 INPUT TOKENS: ${estimatedTokens}`)
    console.log(`  📈 Token/record: ${Math.round(estimatedTokens / dataChunk.length)}`)
    console.log(`  📊 Target vs Actual: ${Math.round((estimatedTokens / targetTokens) * 100)}%`)

    // Kiểm tra chunk size trước khi gửi
    if (estimatedTokens > 15000) {
      console.log(`❌ CHUNK QUÁ LỚN: ${estimatedTokens} tokens > 15000 limit`)
      return {
        success: false,
        optimizedData: "",
        keyIndex: keyIndex,
        error: `Chunk quá lớn: ${estimatedTokens} tokens > 15000 limit`,
      }
    }

    const groq = createGroqClient(apiKey)

    // Prompt ngắn gọn hơn
    const optimizePrompt = `Optimize JSON - remove nulls, compact format:
${chunkText}
Return JSON only:`

    const promptTokens = estimateTokens(optimizePrompt)
    console.log(`📤 SENDING REQUEST:`)
    console.log(`  🎯 Total INPUT tokens: ${promptTokens} (prompt + data)`)
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
      console.log(`📥 RESPONSE RECEIVED (${responseTime}ms):`)

      if (!completion?.choices?.[0]?.message?.content) {
        throw new Error("Empty response from API")
      }

      const optimizedData = completion.choices[0].message.content.trim()
      const outputTokens = estimateTokens(optimizedData)
      const compressionRatio = Math.round((outputTokens / estimatedTokens) * 100)
      const tokensSaved = estimatedTokens - outputTokens

      console.log(`📊 OUTPUT ANALYSIS:`)
      console.log(`  📄 Response chars: ${optimizedData.length}`)
      console.log(`  🎯 OUTPUT TOKENS: ${outputTokens}`)
      console.log(`  📉 Compression: ${compressionRatio}% (${tokensSaved} tokens saved)`)
      console.log(`  ⚡ Processing time: ${responseTime}ms`)
      console.log(`  🎯 Efficiency: ${Math.round((outputTokens / targetTokens) * 100)}% of target`)

      // Validate JSON
      try {
        const parsed = JSON.parse(optimizedData)
        const itemCount = Array.isArray(parsed) ? parsed.length : 1
        console.log(`✅ VALIDATION SUCCESS:`)
        console.log(`  📊 Valid JSON with ${itemCount} items`)
        console.log(`  🎯 TOKEN FLOW: ${estimatedTokens} → ${outputTokens} (${compressionRatio}%)`)
        console.log(`===== END API ${keyIndex + 1} =====\n`)

        return {
          success: true,
          optimizedData: optimizedData,
          keyIndex: keyIndex,
        }
      } catch (jsonError) {
        console.log(`❌ JSON VALIDATION FAILED:`)
        console.log(`  🔍 Response preview: ${optimizedData.substring(0, 200)}...`)
        throw new Error(`Invalid JSON: ${jsonError}`)
      }
    } catch (apiError) {
      const errorMsg = apiError instanceof Error ? apiError.message : String(apiError)
      console.log(`❌ API ERROR:`)
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
    console.error(`❌ API ${keyIndex + 1} FAILED: ${errorMsg}`)

    return {
      success: false,
      optimizedData: "",
      keyIndex: keyIndex,
      error: errorMsg,
    }
  }
}

// Function debug optimize process chi tiết
const debugOptimizeProcess = async (chunk: any[], keyIndex: number): Promise<void> => {
  try {
    const chunkText = JSON.stringify(chunk, null, 1)
    const estimatedTokens = estimateTokens(chunkText)

    console.log(`🔍 DEBUG API ${keyIndex + 1}:`)
    console.log(`  - Records: ${chunk.length}`)
    console.log(`  - Characters: ${chunkText.length}`)
    console.log(`  - Estimated tokens: ${estimatedTokens}`)
    console.log(`  - Sample record:`, JSON.stringify(chunk[0], null, 1).substring(0, 200) + "...")

    // Test API key trước
    const apiKey = API_KEYS[keyIndex]
    const groq = createGroqClient(apiKey)

    console.log(`🧪 Testing API ${keyIndex + 1} với simple request...`)
    const testResult = await groq.chat.completions.create({
      model: "meta-llama/llama-guard-4-12b",
      messages: [{ role: "user", content: "Say 'test ok'" }],
      temperature: 0.1,
      max_tokens: 10,
    })

    console.log(`✅ API ${keyIndex + 1} test result:`, testResult?.choices?.[0]?.message?.content)
  } catch (error) {
    console.error(`❌ DEBUG failed for API ${keyIndex + 1}:`, error)
  }
}

// Function chính: Data Preprocessing Pipeline với token distribution
export const preprocessDataWithPipeline = async (
  data: any[],
  tableName: string,
): Promise<{ success: boolean; optimizedData: string; analysis: string; keyUsage: any }> => {
  try {
    console.log(`🚀 Bắt đầu Data Preprocessing Pipeline với ${data.length} records`)

    if (!API_KEYS || API_KEYS.length < 5) {
      throw new Error("Cần ít nhất 5 API keys (4 cho optimize + 1 cho analysis)")
    }

    // 🔥 BƯỚC 1: Tính toán token distribution
    console.log(`📊 BƯỚC 1: Tính toán token distribution...`)
    const tokenDistribution = calculateTokenDistribution(data)

    if (tokenDistribution.distribution.length === 0) {
      throw new Error("Không thể chia dữ liệu thành chunks")
    }

    // Test API keys trước (chỉ test 4 API đầu cho optimize)
    console.log(`🧪 Test 4 API keys đầu cho optimize...`)
    const keyTests = await Promise.all(API_KEYS.slice(0, 4).map((key, index) => testSingleChunk([data[0]], index)))
    const workingKeys = keyTests.filter(Boolean).length
    console.log(`🔑 ${workingKeys}/4 optimize APIs hoạt động`)

    if (workingKeys === 0) {
      throw new Error("Không có API keys nào hoạt động cho optimize")
    }

    // Test API thứ 5 cho analysis
    console.log(`🧪 Test API 5 cho analysis...`)
    const analysisKeyTest = await testSingleChunk([data[0]], 4)
    if (!analysisKeyTest) {
      console.log(`⚠️ API 5 không hoạt động, sẽ dùng API 1 cho analysis`)
    }

    // BƯỚC 2: Optimize từng chunk với 4 API đầu
    console.log(`⏳ BƯỚC 2: Optimize ${tokenDistribution.distribution.length} chunks với 4 APIs...`)

    const optimizeResults = []

    // Xử lý từng chunk với API tương ứng
    for (let i = 0; i < Math.min(4, tokenDistribution.distribution.length); i++) {
      const chunk = tokenDistribution.distribution[i]
      const keyIndex = i // API 1,2,3,4

      console.log(`🔧 Xử lý chunk ${i + 1} với API ${keyIndex + 1}`)

      // Debug trước khi optimize
      await debugOptimizeProcess(chunk, keyIndex)

      let result = null
      let retryCount = 0
      const maxRetries = 2

      // Retry mechanism
      while (retryCount <= maxRetries && (!result || !result.success)) {
        try {
          if (retryCount > 0) {
            console.log(`🔄 Retry ${retryCount}/${maxRetries} cho API ${keyIndex + 1}`)
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
            console.log(`✅ API ${keyIndex + 1}: Thành công sau ${retryCount} retries`)
            break
          } else {
            console.log(`❌ API ${keyIndex + 1}: Thất bại lần ${retryCount + 1} - ${result?.error || "Unknown error"}`)
          }
        } catch (error) {
          console.log(`❌ API ${keyIndex + 1}: Exception lần ${retryCount + 1} - ${error}`)
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
    console.log(`🔍 DEBUG: Optimize results details:`)
    optimizeResults.forEach((result, index) => {
      if (result.success) {
        console.log(`✅ API ${index + 1}: Success`)
      } else {
        console.log(`❌ API ${index + 1}: Failed - ${result.error}`)
      }
    })

    // Kiểm tra kết quả optimize
    const successfulOptimizes = optimizeResults.filter((r) => r && r.success)
    const failedOptimizes = optimizeResults.filter((r) => r && !r.success)

    console.log(`📊 Optimize results: ${successfulOptimizes.length}/4 APIs thành công`)

    // Nếu tất cả thất bại, thử fallback với raw data
    if (successfulOptimizes.length === 0) {
      console.log(`🔄 FALLBACK: Tất cả optimize thất bại, sử dụng raw data`)

      const rawData = JSON.stringify(data.slice(0, 50), null, 1) // Lấy 50 records đầu

      const keyUsage = {
        totalKeys: API_KEYS.length,
        optimizeKeys: 0,
        analysisKey: 1,
        failedKeys: 4,
        successRate: "0%",
        chunks: tokenDistribution.distribution.length,
        successfulChunks: 0,
        finalDataSize: rawData.length,
        fallback: true,
        tokenDistribution: tokenDistribution,
      }

      return {
        success: true,
        optimizedData: rawData,
        analysis: `⚠️ Không thể optimize dữ liệu với 4 APIs, sử dụng ${Math.min(50, data.length)} records đầu tiên từ tổng ${data.length} records.`,
        keyUsage: keyUsage,
      }
    }

    // BƯỚC 3: Gộp dữ liệu đã optimize
    let combinedOptimizedData = "["
    let validChunks = 0

    successfulOptimizes.forEach((result, index) => {
      // Parse và merge JSON arrays
      try {
        const parsedData = JSON.parse(result.optimizedData)
        const dataArray = Array.isArray(parsedData) ? parsedData : [parsedData]

        if (validChunks > 0) combinedOptimizedData += ","
        combinedOptimizedData += JSON.stringify(dataArray).slice(1, -1) // Remove [ ]
        validChunks++
      } catch (parseError) {
        console.warn(`⚠️ Không thể parse optimize result từ API ${result.keyIndex + 1}:`, parseError)
      }
    })
    combinedOptimizedData += "]"

    const finalTokens = estimateTokens(combinedOptimizedData)
    console.log(`📊 BƯỚC 3: Đã gộp ${validChunks} chunks optimize`)
    console.log(`  📄 Final data: ${combinedOptimizedData.length} characters`)
    console.log(`  🎯 Final tokens: ${finalTokens}`)
    console.log(`  📉 Total compression: ${Math.round((finalTokens / tokenDistribution.totalTokens) * 100)}%`)

    // BƯỚC 4: Phân tích tổng hợp với API 5
    const analysisKeyIndex = 4 // API 5
    const analysisApiKey = API_KEYS[analysisKeyIndex]

    if (!analysisApiKey) {
      throw new Error("Không có API 5 cho phân tích cuối")
    }

    console.log(`🤖 BƯỚC 4: Phân tích tổng hợp với API 5`)

    const analysisPrompt = `Bạn là một AI analyst chuyên nghiệp. Dưới đây là dữ liệu từ bảng "${tableName}" đã được optimize bởi 4 APIs (${data.length} records gốc, ${validChunks}/4 APIs thành công):

${combinedOptimizedData}

Token Distribution Summary:
- Total original tokens: ${tokenDistribution.totalTokens}
- Tokens per API: ${tokenDistribution.tokensPerAPI}
- Final optimized tokens: ${finalTokens}
- Compression ratio: ${Math.round((finalTokens / tokenDistribution.totalTokens) * 100)}%

Hãy phân tích chi tiết:
1. 📊 Tổng quan về dữ liệu
2. 📈 Thống kê quan trọng  
3. 🔍 Patterns và insights
4. 💡 Nhận xét và đánh giá

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
      finalDataSize: combinedOptimizedData.length,
      tokenDistribution: tokenDistribution,
      finalTokens: finalTokens,
      compressionRatio: `${Math.round((finalTokens / tokenDistribution.totalTokens) * 100)}%`,
    }

    return {
      success: true,
      optimizedData: combinedOptimizedData,
      analysis: finalAnalysis,
      keyUsage: keyUsage,
    }
  } catch (error) {
    console.error("❌ Data Preprocessing Pipeline failed:", error)
    return {
      success: false,
      optimizedData: "",
      analysis: `❌ Lỗi preprocessing pipeline: ${error}`,
      keyUsage: { error: true },
    }
  }
}

// Function trả lời câu hỏi với dữ liệu đã optimize
export const answerQuestionWithOptimizedData = async (
  optimizedData: string,
  tableName: string,
  question: string,
  originalRecordCount: number,
): Promise<string> => {
  try {
    console.log(`🤔 Trả lời câu hỏi với optimized data (${originalRecordCount} records)`)

    // Sử dụng API 5 để trả lời câu hỏi
    const questionKeyIndex = 4 // API 5
    const questionApiKey = API_KEYS[questionKeyIndex]

    if (!questionApiKey) {
      throw new Error("Không có API 5 để trả lời câu hỏi")
    }

    const questionPrompt = `Bạn là một AI assistant thông minh. Dưới đây là TOÀN BỘ dữ liệu từ bảng "${tableName}" (${originalRecordCount} records đã được optimize bởi 4 APIs):

${optimizedData}

Đây là dữ liệu HOÀN CHỈNH từ ${originalRecordCount} bản ghi. Hãy dựa vào dữ liệu này để trả lời câu hỏi một cách chính xác và chi tiết.

Câu hỏi: ${question}

Trả lời bằng tiếng Việt:`

    return await analyzeWithSingleKey(questionApiKey, questionKeyIndex, questionPrompt)
  } catch (error) {
    console.error("❌ answerQuestionWithOptimizedData failed:", error)
    return `❌ Lỗi khi trả lời câu hỏi: ${error}`
  }
}

// Export function chính thay thế analyzeDataWithParallelKeys
export const analyzeDataWithParallelKeys = preprocessDataWithPipeline

// Function trả lời câu hỏi - sử dụng optimized data
export const answerQuestionWithData = async (
  data: any[],
  tableName: string,
  question: string,
  previousAnalysis?: string,
  optimizedData?: string,
): Promise<string> => {
  try {
    if (optimizedData && optimizedData.length > 0) {
      // Nếu có optimized data, sử dụng nó
      return await answerQuestionWithOptimizedData(optimizedData, tableName, question, data.length)
    } else {
      // Fallback: tạo optimized data nhanh
      const quickOptimized = JSON.stringify(data.slice(0, 30), null, 1) // 30 records đầu
      return await answerQuestionWithOptimizedData(quickOptimized, tableName, question, data.length)
    }
  } catch (error) {
    console.error("❌ answerQuestionWithData failed:", error)
    return `❌ Lỗi khi trả lời câu hỏi: ${error}`
  }
}

// Test functions
export const testAllApiKeys = async (): Promise<{
  success: boolean
  message: string
  workingKeys: number
  totalKeys: number
  keyDetails: any[]
}> => {
  console.log(`🧪 Testing ${API_KEYS.length} API keys...`)

  const testPromises = API_KEYS.map(async (apiKey, index) => {
    try {
      const groq = createGroqClient(apiKey)

      const testCompletion = await groq.chat.completions.create({
        model: "meta-llama/llama-guard-4-12b",
        messages: [
          {
            role: "user",
            content: "Test: 1+1=?",
          },
        ],
        temperature: 0.1,
        max_tokens: 50,
      })

      const response = testCompletion?.choices?.[0]?.message?.content || "No response"
      console.log(`✅ API ${index + 1}: OK`)

      return {
        keyIndex: index + 1,
        status: "success" as const,
        response: response,
        preview: `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`,
        role: index < 4 ? "optimize" : "analysis",
      }
    } catch (error) {
      console.log(`❌ API ${index + 1}: ${error}`)
      return {
        keyIndex: index + 1,
        status: "failed" as const,
        error: error instanceof Error ? error.message : String(error),
        preview: `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`,
        role: index < 4 ? "optimize" : "analysis",
      }
    }
  })

  const results = await Promise.all(testPromises)
  const workingKeys = results.filter((r) => r.status === "success").length

  return {
    success: workingKeys > 0,
    message: `${workingKeys}/${API_KEYS.length} API keys hoạt động (4 optimize + 1 analysis)`,
    workingKeys: workingKeys,
    totalKeys: API_KEYS.length,
    keyDetails: results,
  }
}

// Backward compatibility
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
        `API ${index + 1}: ${key.substring(0, 10)}...${key.substring(key.length - 4)} (${index < 4 ? "optimize" : "analysis"})`,
    ),
  }
}
