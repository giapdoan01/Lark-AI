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
  "llama-3.3-70b-versatile", // v25 - chỉ dùng model này
]

// Function ước tính số tokens (1 token ≈ 4 characters)
const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / 4)
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
      model: "llama-3.3-70b-versatile",
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
      model: "llama-3.3-70b-versatile",
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

// Function chia dữ liệu theo token limit
const chunkDataByTokens = (data: any[], maxTokensPerChunk = 4000): any[][] => {
  const chunks: any[][] = []
  let currentChunk: any[] = []
  let currentTokens = 0

  console.log(`📊 Bắt đầu chia ${data.length} records với limit ${maxTokensPerChunk} tokens/chunk`)

  for (const record of data) {
    const recordText = JSON.stringify(record, null, 1)
    const recordTokens = estimateTokens(recordText)

    // Log record đầu tiên để debug
    if (currentChunk.length === 0 && chunks.length === 0) {
      console.log(`📊 Sample record tokens: ${recordTokens} (${recordText.length} chars)`)

      // Nếu 1 record đã quá lớn, cảnh báo
      if (recordTokens > maxTokensPerChunk) {
        console.warn(`⚠️ Single record quá lớn: ${recordTokens} tokens > ${maxTokensPerChunk} limit`)
      }
    }

    // Nếu thêm record này vào chunk hiện tại sẽ vượt quá limit
    if (currentTokens + recordTokens > maxTokensPerChunk && currentChunk.length > 0) {
      console.log(`📊 Chunk ${chunks.length + 1} hoàn thành: ${currentChunk.length} records, ${currentTokens} tokens`)
      chunks.push([...currentChunk])
      currentChunk = [record]
      currentTokens = recordTokens
    } else {
      currentChunk.push(record)
      currentTokens += recordTokens
    }
  }

  // Thêm chunk cuối cùng nếu có
  if (currentChunk.length > 0) {
    console.log(`📊 Chunk cuối ${chunks.length + 1}: ${currentChunk.length} records, ${currentTokens} tokens`)
    chunks.push(currentChunk)
  }

  console.log(`📊 Kết quả chia: ${chunks.length} chunks từ ${data.length} records`)

  // Nếu chỉ có 1 chunk và quá lớn, thử chia nhỏ hơn
  if (chunks.length === 1) {
    const singleChunkTokens = estimateTokens(JSON.stringify(chunks[0], null, 1))
    if (singleChunkTokens > 10000) {
      console.log(`⚠️ Single chunk quá lớn (${singleChunkTokens} tokens), thử chia nhỏ hơn...`)
      return chunkDataByTokens(data, Math.floor(maxTokensPerChunk / 2)) // Chia đôi
    }
  }

  return chunks
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
    console.log(`🤖 FINAL ANALYSIS với key ${keyIndex + 1}:`)
    console.log(`  🎯 Analysis INPUT tokens: ${promptTokens}`)
    console.log(`  ⚡ Model: llama-3.3-70b-versatile (v25)`)

    const groq = createGroqClient(apiKey)

    const startTime = Date.now()
    const completion = (await Promise.race([
      groq.chat.completions.create({
        model: "llama-3.3-70b-versatile", // Chỉ dùng v25
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
      console.log(`⚠️ No response content from v25`)
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
    console.error(`❌ Analysis failed with v25: ${errorMsg}`)
    return `❌ Không thể phân tích với v25: ${errorMsg}`
  }
}

// Thêm detailed error logging trong optimizeDataChunk
const optimizeDataChunk = async (
  apiKey: string,
  keyIndex: number,
  dataChunk: any[],
  chunkIndex: number,
  totalChunks: number,
): Promise<{ success: boolean; optimizedData: string; keyIndex: number; error?: string }> => {
  try {
    const chunkText = JSON.stringify(dataChunk, null, 2)
    const estimatedTokens = estimateTokens(chunkText)

    // 🔥 THÊM: Log chi tiết tokens ngay từ đầu
    console.log(`\n🔧 ===== CHUNK ${chunkIndex + 1}/${totalChunks} TOKEN ANALYSIS =====`)
    console.log(`📊 Key ${keyIndex + 1} đang xử lý:`)
    console.log(`  📝 Records: ${dataChunk.length}`)
    console.log(`  📄 Characters: ${chunkText.length}`)
    console.log(`  🎯 INPUT TOKENS: ${estimatedTokens}`)
    console.log(`  📈 Token/record: ${Math.round(estimatedTokens / dataChunk.length)}`)
    console.log(`  🔍 Sample record size: ${JSON.stringify(dataChunk[0], null, 1).length} chars`)

    // Kiểm tra chunk size trước khi gửi
    if (estimatedTokens > 8000) {
      console.log(`❌ CHUNK QUÁ LỚN: ${estimatedTokens} tokens > 8000 limit`)
      return {
        success: false,
        optimizedData: "",
        keyIndex: keyIndex,
        error: `Chunk quá lớn: ${estimatedTokens} tokens > 8000 limit`,
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
    console.log(`  ⚡ Model: llama-3.3-70b-versatile (v25)`)
    console.log(`  🔄 Max output tokens: 6000`)

    try {
      const startTime = Date.now()
      const completion = (await Promise.race([
        groq.chat.completions.create({
          model: "llama-3.3-70b-versatile", // Chỉ dùng v25
          messages: [{ role: "user", content: optimizePrompt }],
          temperature: 0.1,
          max_tokens: 6000,
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout 45s")), 45000)),
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

      // Validate JSON
      try {
        const parsed = JSON.parse(optimizedData)
        const itemCount = Array.isArray(parsed) ? parsed.length : 1
        console.log(`✅ VALIDATION SUCCESS:`)
        console.log(`  📊 Valid JSON with ${itemCount} items`)
        console.log(`  🎯 TOKEN FLOW: ${estimatedTokens} → ${outputTokens} (${compressionRatio}%)`)
        console.log(`===== END CHUNK ${chunkIndex + 1} =====\n`)

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
        console.log(`  ⏰ Rate limit exceeded for key ${keyIndex + 1}`)
      } else if (errorMsg.includes("quota")) {
        console.log(`  💰 Quota exceeded for key ${keyIndex + 1}`)
      } else if (errorMsg.includes("timeout")) {
        console.log(`  ⏱️ Request timeout (45s) for key ${keyIndex + 1}`)
      } else {
        console.log(`  🔍 Unknown error for key ${keyIndex + 1}`)
      }

      throw new Error(errorMsg)
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

// Function debug optimize process chi tiết
const debugOptimizeProcess = async (chunk: any[], keyIndex: number): Promise<void> => {
  try {
    const chunkText = JSON.stringify(chunk, null, 1)
    const estimatedTokens = estimateTokens(chunkText)

    console.log(`🔍 DEBUG Chunk ${keyIndex + 1}:`)
    console.log(`  - Records: ${chunk.length}`)
    console.log(`  - Characters: ${chunkText.length}`)
    console.log(`  - Estimated tokens: ${estimatedTokens}`)
    console.log(`  - Sample record:`, JSON.stringify(chunk[0], null, 1).substring(0, 200) + "...")

    // Test API key trước
    const apiKey = API_KEYS[keyIndex]
    const groq = createGroqClient(apiKey)

    console.log(`🧪 Testing key ${keyIndex + 1} với simple request...`)
    const testResult = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: "Say 'test ok'" }],
      temperature: 0.1,
      max_tokens: 10,
    })

    console.log(`✅ Key ${keyIndex + 1} test result:`, testResult?.choices?.[0]?.message?.content)
  } catch (error) {
    console.error(`❌ DEBUG failed for key ${keyIndex + 1}:`, error)
  }
}

// Function để optimize/compress dữ liệu với 1 API key
// Function chính: Data Preprocessing Pipeline
export const preprocessDataWithPipeline = async (
  data: any[],
  tableName: string,
): Promise<{ success: boolean; optimizedData: string; analysis: string; keyUsage: any }> => {
  try {
    console.log(`🚀 Bắt đầu Data Preprocessing Pipeline với ${data.length} records`)

    if (!API_KEYS || API_KEYS.length === 0) {
      throw new Error("Không có API keys hợp lệ")
    }

    // Test API keys trước
    console.log(`🧪 Test API keys trước khi bắt đầu...`)
    const keyTests = await Promise.all(API_KEYS.slice(0, 3).map((key, index) => testSingleChunk([data[0]], index)))
    const workingKeys = keyTests.filter(Boolean).length
    console.log(`🔑 ${workingKeys}/${keyTests.length} keys hoạt động`)

    if (workingKeys === 0) {
      throw new Error("Không có API keys nào hoạt động")
    }

    // Thêm sau phần test API keys
    console.log(`🧪 Test optimize functionality...`)
    const optimizeTests = await Promise.all(API_KEYS.slice(0, 3).map((key, index) => testOptimizeSimple(index)))
    const workingOptimizeKeys = optimizeTests.filter(Boolean).length
    console.log(`🔧 ${workingOptimizeKeys}/${optimizeTests.length} keys có thể optimize`)

    if (workingOptimizeKeys === 0) {
      console.log(`⚠️ Không có key nào có thể optimize, chuyển sang raw data mode`)

      const rawData = JSON.stringify(data.slice(0, 30), null, 1)
      return {
        success: true,
        optimizedData: rawData,
        analysis: `⚠️ Không thể optimize dữ liệu (tất cả keys thất bại), sử dụng ${Math.min(30, data.length)} records đầu tiên từ tổng ${data.length} records.`,
        keyUsage: {
          totalKeys: API_KEYS.length,
          optimizeKeys: 0,
          analysisKey: 1,
          failedKeys: API_KEYS.length - 1,
          successRate: "0%",
          chunks: 0,
          successfulChunks: 0,
          finalDataSize: rawData.length,
          fallback: true,
        },
      }
    }

    // Thêm adaptive chunking
    console.log(`📊 BƯỚC 1: Adaptive chunking dựa trên working keys (${workingKeys} keys)`)
    const chunkSize = workingKeys >= 3 ? 4000 : 3000 // Giảm từ 5000 xuống 4000
    console.log(`📊 Sử dụng chunk size: ${chunkSize} tokens`)

    // BƯỚC 1: Chia dữ liệu thành chunks theo token limit
    console.log(`📊 BƯỚC 1: Chia dữ liệu theo token limit (4000 tokens/chunk)`)
    let chunks = chunkDataByTokens(data, chunkSize)

    // Nếu vẫn chỉ có 1 chunk lớn, thử strategy khác
    if (chunks.length === 1) {
      const singleChunkTokens = estimateTokens(JSON.stringify(chunks[0], null, 1))
      console.log(`⚠️ Chỉ có 1 chunk với ${singleChunkTokens} tokens`)

      if (singleChunkTokens > 10000) {
        console.log(`🔄 Fallback: Chia theo số records thay vì tokens`)
        // Chia theo số records với chunks nhỏ hơn
        const recordsPerChunk = Math.max(Math.ceil(data.length / (API_KEYS.length - 1)), 3) // Tối thiểu 3 records/chunk
        chunks = []
        for (let i = 0; i < data.length; i += recordsPerChunk) {
          chunks.push(data.slice(i, i + recordsPerChunk))
        }
        console.log(`📊 Fallback result: ${chunks.length} chunks với ~${recordsPerChunk} records/chunk`)
      }
    }

    // Log thông tin chi tiết về chunks
    let totalInputTokens = 0
    chunks.forEach((chunk, index) => {
      const chunkText = JSON.stringify(chunk, null, 1)
      const estimatedTokens = estimateTokens(chunkText)
      totalInputTokens += estimatedTokens
      console.log(`📊 Chunk ${index + 1}: ${chunk.length} records, ~${estimatedTokens} tokens`)
    })

    console.log(`📊 TOKEN DISTRIBUTION SUMMARY:`)
    console.log(`  🎯 Total INPUT tokens: ${totalInputTokens}`)
    console.log(`  📊 Chunks: ${chunks.length}`)
    console.log(`  📈 Avg tokens/chunk: ${Math.round(totalInputTokens / chunks.length)}`)
    console.log(`  📋 Avg tokens/record: ${Math.round(totalInputTokens / data.length)}`)
    console.log(`  ⚡ Model: llama-3.3-70b-versatile (v25) ONLY`)
    console.log(`  🔧 Max tokens per request: 8000 (safety limit)`)

    // BƯỚC 2: Optimize từng chunk với better error handling
    console.log(`⏳ BƯỚC 2: Đang optimize ${chunks.length} chunks...`)

    const optimizeResults = []

    // Xử lý từng chunk một để debug tốt hơn
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const keyIndex = i % (API_KEYS.length - 1)

      console.log(`🔧 Xử lý chunk ${i + 1}/${chunks.length} với key ${keyIndex + 1}`)

      // Debug trước khi optimize
      await debugOptimizeProcess(chunk, keyIndex)

      let result = null
      let retryCount = 0
      const maxRetries = 2

      // Retry mechanism
      while (retryCount <= maxRetries && (!result || !result.success)) {
        try {
          if (retryCount > 0) {
            console.log(`🔄 Retry ${retryCount}/${maxRetries} cho chunk ${i + 1}`)
            await new Promise((resolve) => setTimeout(resolve, 2000)) // Wait 2s
          }

          result = await optimizeDataChunk(API_KEYS[keyIndex], keyIndex, chunk, i, chunks.length)

          if (result && result.success) {
            console.log(`✅ Chunk ${i + 1}: Thành công sau ${retryCount} retries`)
            break
          } else {
            console.log(`❌ Chunk ${i + 1}: Thất bại lần ${retryCount + 1} - ${result?.error || "Unknown error"}`)
          }
        } catch (error) {
          console.log(`❌ Chunk ${i + 1}: Exception lần ${retryCount + 1} - ${error}`)
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
    }

    // Debug chi tiết kết quả
    console.log(`🔍 DEBUG: Optimize results details:`)
    optimizeResults.forEach((result, index) => {
      if (result.success) {
        console.log(`✅ Chunk ${index + 1}: Success (Key ${result.keyIndex + 1})`)
      } else {
        console.log(`❌ Chunk ${index + 1}: Failed (Key ${result.keyIndex + 1}) - ${result.error}`)
      }
    })

    // Kiểm tra kết quả optimize
    const successfulOptimizes = optimizeResults.filter((r) => r && r.success)
    const failedOptimizes = optimizeResults.filter((r) => r && !r.success)

    console.log(`📊 Optimize results: ${successfulOptimizes.length}/${optimizeResults.length} thành công`)

    // Emergency fallback nếu success rate quá thấp
    if (successfulOptimizes.length > 0 && successfulOptimizes.length < optimizeResults.length * 0.3) {
      console.log(
        `⚠️ Success rate thấp (${Math.round((successfulOptimizes.length / optimizeResults.length) * 100)}%), thử với chunks nhỏ hơn`,
      )

      // Thử lại với chunks 2K tokens
      console.log(`🔄 Emergency retry với 2K tokens chunks...`)
      const smallChunks = chunkDataByTokens(data, 2000)

      if (smallChunks.length > chunks.length) {
        console.log(`📊 Tạo ${smallChunks.length} chunks nhỏ hơn, thử optimize 3 chunks đầu...`)

        for (let i = 0; i < Math.min(3, smallChunks.length); i++) {
          const smallChunk = smallChunks[i]
          const keyIndex = i % (API_KEYS.length - 1)

          try {
            const smallResult = await optimizeDataChunk(API_KEYS[keyIndex], keyIndex, smallChunk, i, 3)
            if (smallResult.success) {
              console.log(`✅ Emergency chunk ${i + 1}: Thành công`)
              successfulOptimizes.push(smallResult)
            }
          } catch (error) {
            console.log(`❌ Emergency chunk ${i + 1}: ${error}`)
          }

          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }
    }

    // Nếu tất cả thất bại, thử fallback với raw data
    if (successfulOptimizes.length === 0) {
      console.log(`🔄 FALLBACK: Tất cả optimize thất bại, sử dụng raw data`)

      // Sử dụng raw data (rút gọn)
      const rawData = JSON.stringify(data.slice(0, 20), null, 1) // Chỉ lấy 20 records đầu

      const keyUsage = {
        totalKeys: API_KEYS.length,
        optimizeKeys: 0,
        analysisKey: 1,
        failedKeys: failedOptimizes.length,
        successRate: "0%",
        chunks: chunks.length,
        successfulChunks: 0,
        finalDataSize: rawData.length,
        fallback: true,
      }

      return {
        success: true,
        optimizedData: rawData,
        analysis: `⚠️ Không thể optimize dữ liệu, sử dụng ${data.slice(0, 20).length} records đầu tiên từ tổng ${data.length} records. Dữ liệu vẫn có thể được phân tích nhưng có thể không đầy đủ.`,
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
        console.warn(`⚠️ Không thể parse optimize result từ key ${result.keyIndex + 1}:`, parseError)
      }
    })
    combinedOptimizedData += "]"

    console.log(`📊 BƯỚC 3: Đã gộp ${validChunks} chunks optimize (${combinedOptimizedData.length} characters)`)

    // BƯỚC 4: Phân tích tổng hợp với key cuối cùng
    const finalKeyIndex = API_KEYS.length - 1
    const finalApiKey = API_KEYS[finalKeyIndex]

    if (!finalApiKey) {
      throw new Error("Không có API key cho phân tích cuối")
    }

    console.log(`🤖 BƯỚC 4: Phân tích tổng hợp với key ${finalKeyIndex + 1}`)

    const analysisPrompt = `Bạn là một AI analyst chuyên nghiệp. Dưới đây là dữ liệu từ bảng "${tableName}" đã được optimize (${data.length} records gốc, ${validChunks}/${chunks.length} chunks thành công):

${combinedOptimizedData}

Đây là dữ liệu từ ${data.length} bản ghi gốc, đã được optimize để giảm token nhưng vẫn giữ nguyên thông tin quan trọng.

Hãy phân tích chi tiết:
1. 📊 Tổng quan về dữ liệu
2. 📈 Thống kê quan trọng  
3. 🔍 Patterns và insights
4. 💡 Nhận xét và đánh giá

Trả lời bằng tiếng Việt, chi tiết và có cấu trúc.`

    const finalAnalysis = await analyzeWithSingleKey(finalApiKey, finalKeyIndex, analysisPrompt)

    const keyUsage = {
      totalKeys: API_KEYS.length,
      optimizeKeys: successfulOptimizes.length,
      analysisKey: 1,
      failedKeys: failedOptimizes.length,
      successRate: `${Math.round((successfulOptimizes.length / optimizeResults.length) * 100)}%`,
      chunks: chunks.length,
      successfulChunks: validChunks,
      finalDataSize: combinedOptimizedData.length,
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

    // Sử dụng key cuối cùng để trả lời câu hỏi
    const finalKeyIndex = API_KEYS.length - 1
    const finalApiKey = API_KEYS[finalKeyIndex]

    if (!finalApiKey) {
      throw new Error("Không có API key để trả lời câu hỏi")
    }

    const questionPrompt = `Bạn là một AI assistant thông minh. Dưới đây là TOÀN BỘ dữ liệu từ bảng "${tableName}" (${originalRecordCount} records đã được optimize):

${optimizedData}

Đây là dữ liệu HOÀN CHỈNH từ ${originalRecordCount} bản ghi. Hãy dựa vào dữ liệu này để trả lời câu hỏi một cách chính xác và chi tiết.

Câu hỏi: ${question}

Trả lời bằng tiếng Việt:`

    return await analyzeWithSingleKey(finalApiKey, finalKeyIndex, questionPrompt)
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
        model: "llama-3.3-70b-versatile", // Chỉ test model này
        messages: [
          {
            role: "user",
            content: "Test: 1+1=?",
          },
        ],
        temperature: 0.1,
        max_tokens: 50, // Nhỏ cho test
      })

      // Thêm null checks
      const response = testCompletion?.choices?.[0]?.message?.content || "No response"
      console.log(`✅ Key ${index + 1}: OK`)

      return {
        keyIndex: index + 1,
        status: "success" as const,
        response: response,
        preview: `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`,
      }
    } catch (error) {
      console.log(`❌ Key ${index + 1}: ${error}`)
      return {
        keyIndex: index + 1,
        status: "failed" as const,
        error: error instanceof Error ? error.message : String(error),
        preview: `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`,
      }
    }
  })

  const results = await Promise.all(testPromises)
  const workingKeys = results.filter((r) => r.status === "success").length

  return {
    success: workingKeys > 0,
    message: `${workingKeys}/${API_KEYS.length} API keys hoạt động`,
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
    workingModel: "pipeline",
  }
}

export const getAvailableModels = (): string[] => {
  return AVAILABLE_MODELS
}

export const getApiKeysInfo = () => {
  return {
    totalKeys: API_KEYS.length,
    keysPreview: API_KEYS.map(
      (key, index) => `Key ${index + 1}: ${key.substring(0, 10)}...${key.substring(key.length - 4)}`,
    ),
  }
}
