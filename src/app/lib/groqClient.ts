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
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "llama3-70b-8192",
  "llama3-8b-8192",
  "mixtral-8x7b-32768",
  "gemma-7b-it",
]

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
            model: model,
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.7,
            max_tokens: 8000,
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout 45s")), 45000)),
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
    console.log(
      `🔧 Key ${keyIndex + 1}: Đang optimize chunk ${chunkIndex + 1}/${totalChunks} (${dataChunk.length} records)`,
    )

    const groq = createGroqClient(apiKey)
    const rawData = JSON.stringify(dataChunk, null, 2)

    // Prompt để optimize dữ liệu - KHÔNG phân tích, chỉ tối ưu format
    const optimizePrompt = `Bạn là một data processor chuyên nghiệp. Nhiệm vụ của bạn là OPTIMIZE dữ liệu sau để giảm token nhưng GIỮ NGUYÊN TOÀN BỘ THÔNG TIN:

DỮ LIỆU GỐC (Chunk ${chunkIndex + 1}/${totalChunks}):
${rawData}

YÊU CẦU:
1. ✅ GIỮ NGUYÊN tất cả thông tin quan trọng
2. ✅ Loại bỏ null/empty values không cần thiết  
3. ✅ Rút gọn format JSON (compact)
4. ✅ Giữ nguyên recordId và tất cả fields có giá trị
5. ❌ KHÔNG phân tích, KHÔNG tóm tắt, KHÔNG giải thích
6. ❌ KHÔNG thay đổi ý nghĩa dữ liệu

CHỈ TRẢ VỀ DỮ LIỆU ĐÃ OPTIMIZE (JSON format), không có text thêm:`

    // Thử các models
    for (const model of AVAILABLE_MODELS) {
      try {
        const completion = (await Promise.race([
          groq.chat.completions.create({
            model: model,
            messages: [
              {
                role: "user",
                content: optimizePrompt,
              },
            ],
            temperature: 0.1, // Thấp để đảm bảo consistency
            max_tokens: 4000,
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout 30s")), 30000)),
        ])) as any

        // Thêm null checks
        if (!completion?.choices?.[0]?.message?.content) {
          console.log(`⚠️ Key ${keyIndex + 1} model ${model}: Không nhận được response`)
          continue
        }

        const optimizedData = completion.choices[0].message.content.trim() || ""

        // Validate JSON để đảm bảo output hợp lệ
        try {
          JSON.parse(optimizedData)
          console.log(`✅ Key ${keyIndex + 1} optimize thành công với model ${model}`)

          return {
            success: true,
            optimizedData: optimizedData,
            keyIndex: keyIndex,
          }
        } catch (jsonError) {
          console.log(`⚠️ Key ${keyIndex + 1} model ${model}: Invalid JSON output`)
          continue
        }
      } catch (modelError) {
        const errorMsg = modelError instanceof Error ? modelError.message : String(modelError)
        console.log(`❌ Key ${keyIndex + 1} model ${model}: ${errorMsg}`)

        if (errorMsg.includes("rate_limit")) {
          break // Không thử model khác nếu rate limit
        }
        continue
      }
    }

    throw new Error("Tất cả models thất bại cho key này")
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

    // BƯỚC 1: Chia dữ liệu thành chunks
    const chunkSize = Math.ceil(data.length / Math.max(API_KEYS.length - 1, 1)) // Giữ lại 1 key cho phân tích cuối
    const chunks = []

    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize))
    }

    console.log(`📊 BƯỚC 1: Chia ${data.length} records thành ${chunks.length} chunks`)

    // BƯỚC 2: Optimize từng chunk song song
    const optimizePromises = chunks.map((chunk, index) => {
      const keyIndex = index % (API_KEYS.length - 1) // Giữ lại key cuối cho phân tích
      const apiKey = API_KEYS[keyIndex]

      return optimizeDataChunk(apiKey, keyIndex, chunk, index, chunks.length)
    })

    console.log(`⏳ BƯỚC 2: Đang optimize ${chunks.length} chunks song song...`)
    const optimizeResults = await Promise.all(optimizePromises)

    // Kiểm tra kết quả optimize
    const successfulOptimizes = optimizeResults.filter((r) => r && r.success)
    const failedOptimizes = optimizeResults.filter((r) => r && !r.success)

    console.log(`📊 Optimize results: ${successfulOptimizes.length}/${optimizeResults.length} thành công`)

    if (!successfulOptimizes || successfulOptimizes.length === 0) {
      throw new Error("Tất cả optimize requests đều thất bại")
    }

    // BƯỚC 3: Gộp dữ liệu đã optimize
    let combinedOptimizedData = "["
    successfulOptimizes.forEach((result, index) => {
      // Parse và merge JSON arrays
      try {
        const parsedData = JSON.parse(result.optimizedData)
        const dataArray = Array.isArray(parsedData) ? parsedData : [parsedData]

        if (index > 0) combinedOptimizedData += ","
        combinedOptimizedData += JSON.stringify(dataArray).slice(1, -1) // Remove [ ]
      } catch (parseError) {
        console.warn(`⚠️ Không thể parse optimize result từ key ${result.keyIndex + 1}`)
      }
    })
    combinedOptimizedData += "]"

    console.log(`📊 BƯỚC 3: Đã gộp dữ liệu optimize (${combinedOptimizedData.length} characters)`)

    // BƯỚC 4: Phân tích tổng hợp với key cuối cùng
    const finalKeyIndex = API_KEYS.length - 1
    const finalApiKey = API_KEYS[finalKeyIndex]

    if (!finalApiKey) {
      throw new Error("Không có API key cho phân tích cuối")
    }

    console.log(`🤖 BƯỚC 4: Phân tích tổng hợp với key ${finalKeyIndex + 1}`)

    const analysisPrompt = `Bạn là một AI analyst chuyên nghiệp. Dưới đây là TOÀN BỘ dữ liệu từ bảng "${tableName}" đã được optimize (${data.length} records):

${combinedOptimizedData}

Đây là dữ liệu HOÀN CHỈNH từ ${data.length} bản ghi, đã được optimize để giảm token nhưng vẫn giữ nguyên toàn bộ thông tin.

Hãy phân tích chi tiết:
1. 📊 Tổng quan về ${data.length} records
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
      recordsPerChunk: chunkSize,
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
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "user",
            content: "Test: 1+1=?",
          },
        ],
        temperature: 0.1,
        max_tokens: 10,
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
