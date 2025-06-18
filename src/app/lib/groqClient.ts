import { Groq } from "groq-sdk"

// Danh sách các API keys (thêm nhiều keys vào đây)
const API_KEYS = [
  process.env.NEXT_PUBLIC_GROQ_API_KEY_1 || "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",
  process.env.NEXT_PUBLIC_GROQ_API_KEY_2 || "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",
  process.env.NEXT_PUBLIC_GROQ_API_KEY_3 || "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",
  process.env.NEXT_PUBLIC_GROQ_API_KEY_4 || "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",
  process.env.NEXT_PUBLIC_GROQ_API_KEY_5 || "ygsk_QrymOUGpWhGISmUzmJM4WGdyb3FY9kePDDtFoUCCA6gLBZllrAeD",
].filter(
  (key) =>
    key &&
    key !== "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" &&
    key !== "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" &&
    key !== "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" &&
    key !== "ygsk_QrymOUGpWhGISmUzmJM4WGdyb3FY9kePDDtFoUCCA6gLBZllrAeD",
) // Lọc bỏ keys trống

// Danh sách các model khả dụng (theo thứ tự ưu tiên)
const AVAILABLE_MODELS = [
  "llama-3.3-70b-versatile", // Model có context length lớn nhất
  "llama-3.1-8b-instant",
  "llama3-70b-8192",
  "llama3-8b-8192",
  "mixtral-8x7b-32768",
  "gemma-7b-it",
]

// Biến để track key rotation
let currentKeyIndex = 0
let requestCount = 0

// Function để lấy API key tiếp theo
const getNextApiKey = (): string => {
  const key = API_KEYS[currentKeyIndex]
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length
  requestCount++

  console.log(`🔑 Using API key ${currentKeyIndex + 1}/${API_KEYS.length} (Request #${requestCount})`)
  return key
}

// Function tạo Groq client với key cụ thể
const createGroqClient = (apiKey: string): Groq => {
  return new Groq({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true,
  })
}

// Function thử các model khác nhau với key rotation
const tryWithDifferentModels = async (
  messages: any[],
  currentModelIndex = 0,
  retryWithNewKey = false,
): Promise<string> => {
  if (currentModelIndex >= AVAILABLE_MODELS.length) {
    throw new Error("Tất cả các model đều không khả dụng")
  }

  const model = AVAILABLE_MODELS[currentModelIndex]
  const apiKey = getNextApiKey()
  const groq = createGroqClient(apiKey)

  console.log(`🤖 Thử model: ${model} với API key ${currentKeyIndex}/${API_KEYS.length}`)

  try {
    const chatCompletion = await groq.chat.completions.create({
      model: model,
      messages: messages,
      temperature: 0.7,
      max_tokens: 12000, // Tăng max_tokens như bạn yêu cầu
      top_p: 1,
    })

    const response = chatCompletion.choices[0].message.content
    console.log(`✅ Model ${model} với key ${currentKeyIndex}/${API_KEYS.length} hoạt động thành công`)
    return response || "Không có câu trả lời từ AI."
  } catch (error) {
    console.log(`❌ Model ${model} với key ${currentKeyIndex}/${API_KEYS.length} thất bại:`, error)

    // Nếu lỗi rate limit và còn keys khác, thử key khác
    if (error instanceof Error && error.message.includes("rate_limit") && API_KEYS.length > 1 && !retryWithNewKey) {
      console.log(`🔄 Rate limit với key hiện tại, thử key khác...`)
      return await tryWithDifferentModels(messages, currentModelIndex, true)
    }

    // Nếu model bị decommission hoặc không khả dụng, thử model tiếp theo
    if (
      error instanceof Error &&
      (error.message.includes("decommissioned") ||
        error.message.includes("not found") ||
        error.message.includes("invalid_request_error"))
    ) {
      console.log(`🔄 Thử model tiếp theo...`)
      return await tryWithDifferentModels(messages, currentModelIndex + 1)
    }

    // Nếu là lỗi khác, throw ngay
    throw error
  }
}

// Function tối ưu dữ liệu cho AI - giữ nguyên tất cả dữ liệu
const optimizeDataForAI = (data: any[]): string => {
  // Loại bỏ các field null/empty để giảm kích thước nhưng giữ nguyên cấu trúc
  const optimizedData = data.map((record) => {
    const optimizedFields: Record<string, any> = {}

    // Chỉ giữ lại fields có giá trị
    for (const [key, value] of Object.entries(record.fields)) {
      if (value !== null && value !== undefined && value !== "") {
        optimizedFields[key] = value
      }
    }

    return {
      recordId: record.recordId,
      fields: optimizedFields,
    }
  })

  return JSON.stringify(optimizedData, null, 1) // Dùng indent = 1 để tiết kiệm space
}

// Function chia dữ liệu thành chunks và gửi riêng biệt với key rotation
export const askAIWithFullData = async (data: any[], tableName: string, question: string): Promise<string> => {
  try {
    console.log(`🤖 Xử lý ${data.length} records với full data approach và ${API_KEYS.length} API keys`)

    // Thử gửi toàn bộ dữ liệu đã tối ưu trước
    const optimizedDataString = optimizeDataForAI(data)
    console.log(`📊 Optimized data length: ${optimizedDataString.length} characters`)

    // Nếu dữ liệu vẫn nhỏ, gửi toàn bộ
    if (optimizedDataString.length < 40000) {
      // Tăng threshold do có nhiều keys
      console.log("📤 Gửi toàn bộ dữ liệu optimized...")

      const context = `Bạn là một AI assistant thông minh. Dưới đây là TOÀN BỘ ${data.length} records từ bảng "${tableName}" trong Lark Base:

${optimizedDataString}

Đây là tất cả ${data.length} bản ghi đầy đủ, không bị cắt bớt hay tóm tắt.

Hãy phân tích dữ liệu này và trả lời câu hỏi của người dùng một cách chính xác. Trả lời bằng tiếng Việt.`

      return await askAI(context, question)
    }

    // Nếu dữ liệu lớn, chia thành chunks
    const chunkSize = 20 // Tăng chunk size do có nhiều keys
    const chunks = []
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize))
    }

    console.log(`📊 Chia dữ liệu thành ${chunks.length} chunks với ${API_KEYS.length} API keys`)

    // Gửi từng chunk và tổng hợp kết quả (mỗi chunk dùng key khác nhau)
    let combinedAnalysis = `Tôi đã phân tích toàn bộ ${data.length} bản ghi được chia thành ${chunks.length} phần với ${API_KEYS.length} API keys:\n\n`

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const chunkDataString = JSON.stringify(
        chunk.map((record) => ({
          recordId: record.recordId,
          fields: record.fields,
        })),
        null,
        1,
      )

      console.log(`📤 Xử lý chunk ${i + 1}/${chunks.length} (${chunk.length} records) với key rotation`)

      const chunkContext = `Bạn là một AI assistant thông minh. Dưới đây là phần ${i + 1}/${chunks.length} của dữ liệu từ bảng "${tableName}":

${chunkDataString}

Đây là ${chunk.length} bản ghi (từ ${i * chunkSize + 1} đến ${Math.min((i + 1) * chunkSize, data.length)}) trong tổng số ${data.length} bản ghi.

Hãy phân tích phần dữ liệu này và trả về kết quả ngắn gọn. Trả lời bằng tiếng Việt.`

      try {
        const chunkResult = await askAI(chunkContext, `Phân tích phần ${i + 1}: ${question}`)
        combinedAnalysis += `**Phần ${i + 1} (Records ${i * chunkSize + 1}-${Math.min((i + 1) * chunkSize, data.length)}):**\n${chunkResult}\n\n`
      } catch (error) {
        console.error(`❌ Lỗi xử lý chunk ${i + 1}:`, error)
        combinedAnalysis += `**Phần ${i + 1}:** Lỗi xử lý - ${error}\n\n`
      }

      // Delay ngắn hơn do có nhiều keys
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    // Gửi câu hỏi tổng hợp cuối cùng
    const finalContext = `Bạn là một AI assistant thông minh. Tôi đã phân tích toàn bộ ${data.length} bản ghi từ bảng "${tableName}" theo từng phần với ${API_KEYS.length} API keys. Dưới đây là kết quả phân tích:

${combinedAnalysis}

Dựa trên tất cả thông tin trên, hãy đưa ra câu trả lời tổng hợp và đầy đủ cho câu hỏi. Trả lời bằng tiếng Việt.`

    return await askAI(finalContext, question)
  } catch (error) {
    console.error("❌ askAIWithFullData failed:", error)
    return `❌ Lỗi khi phân tích dữ liệu: ${error}`
  }
}

export const askAI = async (context: string, question: string): Promise<string> => {
  try {
    console.log("🤖 Bắt đầu gọi Groq API...")
    console.log("📝 Context length:", context.length)
    console.log("❓ Question:", question)
    console.log(`🔑 Available API keys: ${API_KEYS.length}`)

    const messages = [
      {
        role: "system" as const,
        content: context,
      },
      {
        role: "user" as const,
        content: question,
      },
    ]

    // Thử với các model khác nhau và key rotation
    const response = await tryWithDifferentModels(messages)
    console.log("✅ Groq API response received")

    return response
  } catch (error) {
    console.error("❌ Chi tiết lỗi Groq API:", error)

    // Xử lý các loại lỗi cụ thể
    if (error instanceof Error) {
      if (error.message.includes("rate_limit")) {
        return `⏰ Tất cả ${API_KEYS.length} API keys đều đạt giới hạn tốc độ. Vui lòng thử lại sau vài giây.`
      } else if (error.message.includes("invalid_api_key")) {
        return "🔑 Một hoặc nhiều API keys không hợp lệ. Vui lòng kiểm tra cấu hình."
      } else if (error.message.includes("context_length")) {
        return "📏 Dữ liệu quá lớn để xử lý. Hãy thử với câu hỏi cụ thể hơn hoặc chia nhỏ dữ liệu."
      } else if (error.message.includes("network") || error.message.includes("fetch")) {
        return "🌐 Lỗi kết nối mạng. Vui lòng kiểm tra internet và thử lại."
      } else if (error.message.includes("Tất cả các model đều không khả dụng")) {
        return "🤖 Tất cả các AI model hiện tại đều không khả dụng. Vui lòng thử lại sau."
      }

      return `❌ Lỗi AI: ${error.message}`
    }

    return "❌ Đã xảy ra lỗi không xác định khi gọi AI. Vui lòng thử lại."
  }
}

// Function test mode - gửi toàn bộ dữ liệu raw với key rotation
export const askAIWithRawData = async (data: any[], tableName: string, question: string): Promise<string> => {
  try {
    console.log(`🧪 TEST MODE: Gửi toàn bộ ${data.length} records raw data với ${API_KEYS.length} keys`)

    const rawDataString = JSON.stringify(data, null, 2)
    console.log(`📊 Raw data length: ${rawDataString.length} characters`)

    const context = `Bạn là một AI assistant thông minh. Dưới đây là TOÀN BỘ ${data.length} records từ bảng "${tableName}" trong Lark Base (RAW DATA):

${rawDataString}

QUAN TRỌNG: Đây là tất cả ${data.length} bản ghi đầy đủ, không bị tóm tắt hay cắt bớt. Bạn có thể truy cập và phân tích tất cả dữ liệu này.

Hãy phân tích dữ liệu này và trả lời câu hỏi. Trả lời bằng tiếng Việt.`

    return await askAI(context, question)
  } catch (error) {
    console.error("❌ askAIWithRawData failed:", error)
    return `❌ Lỗi khi gửi raw data: ${error}`
  }
}

// Function test API với key rotation
export const testGroqAPI = async (): Promise<{
  success: boolean
  message: string
  workingModel?: string
  workingKeys?: number
}> => {
  console.log(`🧪 Testing Groq API với ${API_KEYS.length} API keys và ${AVAILABLE_MODELS.length} models...`)

  let workingKeys = 0
  let workingModel = ""

  for (const model of AVAILABLE_MODELS) {
    for (let keyIndex = 0; keyIndex < API_KEYS.length; keyIndex++) {
      try {
        const apiKey = API_KEYS[keyIndex]
        const groq = createGroqClient(apiKey)

        console.log(`🧪 Testing model: ${model} với key ${keyIndex + 1}/${API_KEYS.length}`)

        const testCompletion = await groq.chat.completions.create({
          model: model,
          messages: [
            {
              role: "user",
              content: "Xin chào! Hãy trả lời bằng tiếng Việt: 1+1 bằng bao nhiêu?",
            },
          ],
          temperature: 0.1,
          max_tokens: 50,
        })

        const response = testCompletion.choices[0].message.content
        console.log(`✅ Model ${model} với key ${keyIndex + 1} hoạt động! Response:`, response)

        workingKeys++
        if (!workingModel) workingModel = model
      } catch (error) {
        console.log(`❌ Model ${model} với key ${keyIndex + 1} failed:`, error)
        continue
      }
    }
  }

  if (workingKeys > 0) {
    return {
      success: true,
      message: `${workingKeys}/${API_KEYS.length} API keys hoạt động với model ${workingModel}`,
      workingModel: workingModel,
      workingKeys: workingKeys,
    }
  }

  return {
    success: false,
    message: `Tất cả ${API_KEYS.length} API keys đều không khả dụng. Vui lòng kiểm tra keys hoặc thử lại sau.`,
    workingKeys: 0,
  }
}

// Function để lấy thông tin về API keys
export const getApiKeysInfo = () => {
  return {
    totalKeys: API_KEYS.length,
    currentKeyIndex: currentKeyIndex,
    requestCount: requestCount,
    keysPreview: API_KEYS.map(
      (key, index) => `Key ${index + 1}: ${key.substring(0, 10)}...${key.substring(key.length - 4)}`,
    ),
  }
}

// Function để reset key rotation
export const resetKeyRotation = () => {
  currentKeyIndex = 0
  requestCount = 0
  console.log("🔄 Key rotation reset")
}

// Function để lấy danh sách model khả dụng
export const getAvailableModels = (): string[] => {
  return AVAILABLE_MODELS
}
