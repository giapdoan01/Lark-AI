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
  "llama-3.3-70b-versatile", // Chỉ dùng model này
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

    if (estimatedTokens > 30000) {
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

// Function chia dữ liệu theo token limit
const chunkDataByTokens = (data: any[], maxTokensPerChunk = 10000): any[][] => {
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
    if (singleChunkTokens > 15000) {
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
    console.log(`🤖 Phân tích với key ${keyIndex + 1}`)

    const groq = createGroqClient(apiKey)

    for (const model of AVAILABLE_MODELS) {
      try {
        const completion = (await Promise.race([
          groq.chat.completions.create({
            model: "llama-3.3-70b-versatile", // Chỉ dùng model này
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.7,
            max_tokens: 25000, // Tăng lên 25000
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout 90s")), 90000)), // Tăng timeout
        ])) as any

        // Thêm null checks
        if (!completion?.choices?.[0]?.message?.content) {
          console.log(`⚠️ Model ${model}: Không nhận được response`)
          continue
        }

        const analysis = completion.choices[0].message.content || "Không có phân tích"
        console.log(`✅ Phân tích thành công với model ${model}`)

        return analysis
      } catch (modelError) {
        const errorMsg = modelError instanceof Error ? modelError.message : String(modelError)
        console.log(`❌ Model ${model}: ${errorMsg}`)
        continue
      }
    }

    throw new Error("Tất cả models thất bại cho phân tích cuối")
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`❌ Phân tích cuối thất bại: ${errorMsg}`)
    return `❌ Không thể phân tích: ${errorMsg}`
  }
}

// Function để optimize/compress dữ liệu với 1 API key
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

    console.log(
      `🔧 Key ${keyIndex + 1}: Optimize chunk ${chunkIndex + 1}/${totalChunks} (${dataChunk.length} records, ~${estimatedTokens} tokens)`,
    )

    const groq = createGroqClient(apiKey)

    // Prompt ngắn gọn hơn để tiết kiệm tokens
    const optimizePrompt = `Optimize JSON data - remove nulls, compact format, keep all meaningful data:

${chunkText}

Return optimized JSON only:`

    // Chỉ thử model duy nhất
    try {
      console.log(`🤖 Key ${keyIndex + 1}: Gửi request với ${estimateTokens(optimizePrompt)} tokens`)

      const completion = (await Promise.race([
        groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "user",
              content: optimizePrompt,
            },
          ],
          temperature: 0.1,
          max_tokens: 15000, // Giảm xuống để an toàn
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout 60s")), 60000)),
      ])) as any

      // Thêm null checks
      if (!completion?.choices?.[0]?.message?.content) {
        throw new Error("Không nhận được response từ API")
      }

      const optimizedData = completion.choices[0].message.content.trim() || ""

      // Validate JSON
      try {
        JSON.parse(optimizedData)
        console.log(`✅ Key ${keyIndex + 1}: Optimize thành công (${optimizedData.length} chars)`)

        return {
          success: true,
          optimizedData: optimizedData,
          keyIndex: keyIndex,
        }
      } catch (jsonError) {
        throw new Error(`Invalid JSON output: ${jsonError}`)
      }
    } catch (modelError) {
      const errorMsg = modelError instanceof Error ? modelError.message : String(modelError)
      console.error(`❌ Key ${keyIndex + 1}: ${errorMsg}`)
      throw new Error(errorMsg)
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`❌ Key ${keyIndex + 1} optimize thất bại: ${errorMsg}`)

    return {
      success: false,
      optimizedData: "",
      keyIndex: keyIndex,
      error: errorMsg,
    }
  }
}

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

    // BƯỚC 1: Chia dữ liệu thành chunks theo token limit
    console.log(`📊 BƯỚC 1: Chia dữ liệu theo token limit (10000 tokens/chunk)`)
    let chunks = chunkDataByTokens(data, 10000)

    // Nếu vẫn chỉ có 1 chunk lớn, thử strategy khác
    if (chunks.length === 1) {
      const singleChunkTokens = estimateTokens(JSON.stringify(chunks[0], null, 1))
      console.log(`⚠️ Chỉ có 1 chunk với ${singleChunkTokens} tokens`)

      if (singleChunkTokens > 20000) {
        console.log(`🔄 Fallback: Chia theo số records thay vì tokens`)
        // Chia theo số records
        const recordsPerChunk = Math.ceil(data.length / Math.max(API_KEYS.length - 1, 2))
        chunks = []
        for (let i = 0; i < data.length; i += recordsPerChunk) {
          chunks.push(data.slice(i, i + recordsPerChunk))
        }
        console.log(`📊 Fallback result: ${chunks.length} chunks với ${recordsPerChunk} records/chunk`)
      }
    }

    // Log thông tin chi tiết về chunks
    chunks.forEach((chunk, index) => {
      const chunkText = JSON.stringify(chunk, null, 1)
      const estimatedTokens = estimateTokens(chunkText)
      console.log(`📊 Chunk ${index + 1}: ${chunk.length} records, ~${estimatedTokens} tokens`)
    })

    // BƯỚC 2: Optimize từng chunk với better error handling
    console.log(`⏳ BƯỚC 2: Đang optimize ${chunks.length} chunks...`)

    const optimizeResults = []

    // Xử lý từng chunk một để debug tốt hơn
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const keyIndex = i % (API_KEYS.length - 1)

      console.log(`🔧 Xử lý chunk ${i + 1}/${chunks.length} với key ${keyIndex + 1}`)

      try {
        const result = await optimizeDataChunk(API_KEYS[keyIndex], keyIndex, chunk, i, chunks.length)
        optimizeResults.push(result)

        if (result.success) {
          console.log(`✅ Chunk ${i + 1}: Thành công`)
        } else {
          console.log(`❌ Chunk ${i + 1}: Thất bại - ${result.error}`)
        }
      } catch (error) {
        console.log(`❌ Chunk ${i + 1}: Exception - ${error}`)
        optimizeResults.push({
          success: false,
          optimizedData: "",
          keyIndex: keyIndex,
          error: String(error),
        })
      }

      // Delay giữa các requests
      if (i < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
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
