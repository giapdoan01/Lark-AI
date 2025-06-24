import { Groq } from "groq-sdk"

// Danh sách 10 API keys từ 10 accounts khác nhau
const API_KEYS = [
  process.env.NEXT_PUBLIC_GROQ_API_KEY_1 || "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",
  process.env.NEXT_PUBLIC_GROQ_API_KEY_2 || "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",
  process.env.NEXT_PUBLIC_GROQ_API_KEY_3 || "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",
  process.env.NEXT_PUBLIC_GROQ_API_KEY_4 || "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",
  process.env.NEXT_PUBLIC_GROQ_API_KEY_5 || "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",
].filter(
  (key) =>
    key &&
    !key.includes("account") && // Lọc bỏ placeholder keys
    key.startsWith("gsk_"), // Chỉ lấy keys hợp lệ
)

const AVAILABLE_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "llama3-70b-8192",
  "llama3-8b-8192",
  "mixtral-8x7b-32768",
  "gemma-7b-it",
]

// Function tạo Groq client với key cụ thể
const createGroqClient = (apiKey: string): Groq => {
  return new Groq({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true,
  })
}

// Sửa function sendRequestWithKey để có retry logic tốt hơn
const sendRequestWithKey = async (
  apiKey: string,
  keyIndex: number,
  messages: any[],
  chunkInfo: string,
): Promise<{ success: boolean; result: string; keyIndex: number; error?: string }> => {
  try {
    console.log(`🔑 Key ${keyIndex + 1}/${API_KEYS.length}: ${chunkInfo}`)

    const groq = createGroqClient(apiKey)

    // Thử từng model với timeout
    for (const model of AVAILABLE_MODELS) {
      try {
        console.log(`🤖 Key ${keyIndex + 1} thử model: ${model}`)

        const chatCompletion = (await Promise.race([
          groq.chat.completions.create({
            model: model,
            messages: messages,
            temperature: 0.7,
            max_tokens: 6000, // Giảm max_tokens để tránh lỗi
            top_p: 1,
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout after 30s")), 30000)),
        ])) as any

        const response = chatCompletion.choices[0].message.content || "Không có phản hồi"
        console.log(`✅ Key ${keyIndex + 1} với model ${model}: Thành công`)

        return {
          success: true,
          result: response,
          keyIndex: keyIndex,
        }
      } catch (modelError) {
        const errorMsg = modelError instanceof Error ? modelError.message : String(modelError)
        console.log(`❌ Key ${keyIndex + 1} với model ${model}: ${errorMsg}`)

        // Nếu là rate limit, không thử model khác nữa
        if (errorMsg.includes("rate_limit")) {
          break
        }
        continue
      }
    }

    throw new Error("Tất cả models đều thất bại cho key này")
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`❌ Key ${keyIndex + 1} thất bại hoàn toàn: ${errorMsg}`)
    return {
      success: false,
      result: "",
      keyIndex: keyIndex,
      error: errorMsg,
    }
  }
}

// Function chính: Phân tích dữ liệu song song với multiple keys
export const analyzeDataWithParallelKeys = async (
  data: any[],
  tableName: string,
): Promise<{ success: boolean; analysis: string; keyUsage: any }> => {
  try {
    console.log(`🚀 Bắt đầu phân tích song song ${data.length} records với ${API_KEYS.length} API keys`)

    if (API_KEYS.length === 0) {
      throw new Error("Không có API keys hợp lệ")
    }

    // Chia dữ liệu thành chunks theo số lượng API keys
    const chunkSize = Math.ceil(data.length / API_KEYS.length)
    const chunks = []

    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize))
    }

    console.log(`📊 Chia ${data.length} records thành ${chunks.length} chunks (${chunkSize} records/chunk)`)

    // Tạo promises cho từng chunk với key riêng biệt
    const analysisPromises = chunks.map((chunk, index) => {
      const apiKey = API_KEYS[index % API_KEYS.length] // Đảm bảo không vượt quá số keys
      const chunkData = JSON.stringify(chunk, null, 1)

      const messages = [
        {
          role: "system",
          content: `Bạn là một AI assistant chuyên phân tích dữ liệu. Dưới đây là phần ${index + 1}/${chunks.length} của dữ liệu từ bảng "${tableName}":

${chunkData}

Đây là ${chunk.length} bản ghi (từ ${index * chunkSize + 1} đến ${Math.min((index + 1) * chunkSize, data.length)}) trong tổng số ${data.length} bản ghi.`,
        },
        {
          role: "user",
          content: `Hãy phân tích phần dữ liệu này một cách chi tiết, bao gồm:
1. Tóm tắt nội dung chính của ${chunk.length} records này
2. Các thống kê quan trọng (nếu có)
3. Những điểm đáng chú ý
4. Xu hướng hoặc pattern (nếu phát hiện được)

Trả lời bằng tiếng Việt, ngắn gọn nhưng đầy đủ thông tin.`,
        },
      ]

      return sendRequestWithKey(
        apiKey,
        index,
        messages,
        `Chunk ${index + 1}/${chunks.length} (${chunk.length} records)`,
      )
    })

    // Chờ tất cả requests hoàn thành
    console.log(`⏳ Đang gửi ${analysisPromises.length} requests song song...`)
    const results = await Promise.all(analysisPromises)

    // Phân tích kết quả
    const successfulResults = results.filter((r) => r.success)
    const failedResults = results.filter((r) => !r.success)

    console.log(`📊 Kết quả: ${successfulResults.length}/${results.length} requests thành công`)

    if (successfulResults.length === 0) {
      throw new Error("Tất cả requests đều thất bại")
    }

    // Gộp kết quả từ các chunks
    let combinedAnalysis = `🤖 **PHÂN TÍCH TỔNG HỢP DỮ LIỆU BẢNG "${tableName.toUpperCase()}"**\n\n`
    combinedAnalysis += `📊 **Tổng quan:** ${data.length} bản ghi được phân tích bằng ${successfulResults.length}/${API_KEYS.length} API keys\n\n`

    successfulResults.forEach((result, index) => {
      const chunkStart = result.keyIndex * chunkSize + 1
      const chunkEnd = Math.min((result.keyIndex + 1) * chunkSize, data.length)

      combinedAnalysis += `**📋 PHẦN ${result.keyIndex + 1} (Records ${chunkStart}-${chunkEnd}):**\n`
      combinedAnalysis += `${result.result}\n\n`
    })

    // Thêm thông tin về failed requests nếu có
    if (failedResults.length > 0) {
      combinedAnalysis += `⚠️ **LƯU Ý:** ${failedResults.length} phần dữ liệu không thể phân tích do lỗi API keys.\n\n`
    }

    // Tạo tóm tắt cuối
    combinedAnalysis += `✅ **KẾT LUẬN:** Đã hoàn thành phân tích song song với ${successfulResults.length} API keys. Dữ liệu đã sẵn sàng để trả lời câu hỏi chi tiết.`

    const keyUsage = {
      totalKeys: API_KEYS.length,
      usedKeys: successfulResults.length,
      failedKeys: failedResults.length,
      successRate: `${Math.round((successfulResults.length / results.length) * 100)}%`,
      chunks: chunks.length,
      recordsPerChunk: chunkSize,
    }

    return {
      success: true,
      analysis: combinedAnalysis,
      keyUsage: keyUsage,
    }
  } catch (error) {
    console.error("❌ analyzeDataWithParallelKeys failed:", error)
    return {
      success: false,
      analysis: `❌ Lỗi phân tích song song: ${error}`,
      keyUsage: { error: true },
    }
  }
}

// Sửa function answerQuestionWithData để có fallback mechanism tốt hơn
export const answerQuestionWithData = async (
  data: any[],
  tableName: string,
  question: string,
  previousAnalysis?: string,
): Promise<string> => {
  try {
    console.log(`🤔 Trả lời câu hỏi với ${data.length} records`)

    if (API_KEYS.length === 0) {
      throw new Error("Không có API keys hợp lệ")
    }

    // Thử tất cả keys thay vì chỉ 1 key ngẫu nhiên
    const errors: string[] = []

    for (let keyIndex = 0; keyIndex < API_KEYS.length; keyIndex++) {
      try {
        const selectedKey = API_KEYS[keyIndex]
        console.log(`🔑 Thử key ${keyIndex + 1}/${API_KEYS.length} để trả lời câu hỏi`)

        // Tạo context với dữ liệu tối ưu để tránh context length quá lớn
        const optimizedData = data.slice(0, 50) // Chỉ lấy 50 records đầu để tránh quá lớn

        let context = `Bạn là một AI assistant thông minh. Dưới đây là dữ liệu từ bảng "${tableName}" (${data.length} records, hiển thị ${optimizedData.length} records đầu):

${JSON.stringify(optimizedData, null, 1)}`

        if (previousAnalysis) {
          // Rút gọn previous analysis để tránh context quá dài
          const shortAnalysis =
            previousAnalysis.length > 2000
              ? previousAnalysis.substring(0, 2000) + "...\n[Phân tích đã được rút gọn]"
              : previousAnalysis
          context += `\n\nPhân tích trước đó:\n${shortAnalysis}`
        }

        context += `\n\nLưu ý: Bảng có tổng cộng ${data.length} records. Hãy dựa vào dữ liệu mẫu và phân tích trước đó để trả lời câu hỏi một cách chính xác. Trả lời bằng tiếng Việt.`

        const messages = [
          {
            role: "system",
            content: context,
          },
          {
            role: "user",
            content: question,
          },
        ]

        const result = await sendRequestWithKey(selectedKey, keyIndex, messages, "Trả lời câu hỏi")

        if (result.success) {
          console.log(`✅ Key ${keyIndex + 1} trả lời thành công`)
          return result.result
        } else {
          errors.push(`Key ${keyIndex + 1}: ${result.error}`)
          console.log(`❌ Key ${keyIndex + 1} thất bại: ${result.error}`)
          continue
        }
      } catch (keyError) {
        const errorMsg = keyError instanceof Error ? keyError.message : String(keyError)
        errors.push(`Key ${keyIndex + 1}: ${errorMsg}`)
        console.log(`❌ Key ${keyIndex + 1} exception: ${errorMsg}`)
        continue
      }
    }

    // Nếu tất cả keys đều thất bại
    throw new Error(`Tất cả ${API_KEYS.length} API keys đều thất bại:\n${errors.join("\n")}`)
  } catch (error) {
    console.error("❌ answerQuestionWithData failed:", error)

    // Trả về thông tin chi tiết về lỗi
    if (error instanceof Error && error.message.includes("Tất cả")) {
      return `❌ **Tất cả API keys đều thất bại:**

${error.message}

**Khắc phục:**
1. 🔑 Kiểm tra API keys có hợp lệ không
2. ⏰ Chờ vài phút nếu bị rate limit
3. 🔄 Thử test API keys trước
4. 📝 Đặt câu hỏi ngắn gọn hơn`
    }

    return `❌ Lỗi khi trả lời câu hỏi: ${error}`
  }
}

// Function test tất cả API keys
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
        model: "llama-3.1-8b-instant", // Model nhanh để test
        messages: [
          {
            role: "user",
            content: "Test: 1+1=?",
          },
        ],
        temperature: 0.1,
        max_tokens: 10,
      })

      const response = testCompletion.choices[0].message.content
      console.log(`✅ Key ${index + 1}: OK`)

      return {
        keyIndex: index + 1,
        status: "success",
        response: response,
        preview: `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`,
      }
    } catch (error) {
      console.log(`❌ Key ${index + 1}: ${error}`)
      return {
        keyIndex: index + 1,
        status: "failed",
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

// Thêm function để test 1 key cụ thể
const testSingleKey = async (apiKey: string, keyIndex: number): Promise<{ success: boolean; error?: string }> => {
  try {
    const groq = createGroqClient(apiKey)

    const testCompletion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "user",
          content: "Test: Xin chào",
        },
      ],
      temperature: 0.1,
      max_tokens: 20,
    })

    const response = testCompletion.choices[0].message.content
    console.log(`✅ Key ${keyIndex + 1} test OK: ${response}`)
    return { success: true }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.log(`❌ Key ${keyIndex + 1} test failed: ${errorMsg}`)
    return { success: false, error: errorMsg }
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
    workingModel: "multiple",
  }
}

export const getAvailableModels = (): string[] => {
  return AVAILABLE_MODELS
}

// Function để lấy thông tin về API keys
export const getApiKeysInfo = () => {
  return {
    totalKeys: API_KEYS.length,
    keysPreview: API_KEYS.map(
      (key, index) => `Key ${index + 1}: ${key.substring(0, 10)}...${key.substring(key.length - 4)}`,
    ),
  }
}
