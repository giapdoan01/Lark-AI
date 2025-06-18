import { Groq } from "groq-sdk"

const groq = new Groq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY || "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",
  dangerouslyAllowBrowser: true,
})

// Danh sách các model khả dụng (theo thứ tự ưu tiên)
const AVAILABLE_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "llama3-70b-8192",
  "llama3-8b-8192",
  "mixtral-8x7b-32768",
  "gemma-7b-it",
]

// Function để chia nhỏ dữ liệu nếu quá lớn
const chunkData = (data: any[], maxChunkSize = 10): any[][] => {
  const chunks = []
  for (let i = 0; i < data.length; i += maxChunkSize) {
    chunks.push(data.slice(i, i + maxChunkSize))
  }
  return chunks
}

// Function thử các model khác nhau
const tryWithDifferentModels = async (messages: any[], currentModelIndex = 0): Promise<string> => {
  if (currentModelIndex >= AVAILABLE_MODELS.length) {
    throw new Error("Tất cả các model đều không khả dụng")
  }

  const model = AVAILABLE_MODELS[currentModelIndex]
  console.log(`🤖 Thử model: ${model}`)

  try {
    const chatCompletion = await groq.chat.completions.create({
      model: model,
      messages: messages,
      temperature: 0.7,
      max_tokens: 2048, // Tăng max_tokens để có câu trả lời dài hơn
      top_p: 1,
    })

    const response = chatCompletion.choices[0].message.content
    console.log(`✅ Model ${model} hoạt động th��nh công`)
    return response || "Không có câu trả lời từ AI."
  } catch (error) {
    console.log(`❌ Model ${model} thất bại:`, error)

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

    // Nếu là lỗi khác (rate limit, network, etc.), throw ngay
    throw error
  }
}

export const askAI = async (context: string, question: string): Promise<string> => {
  try {
    console.log("🤖 Bắt đầu gọi Groq API...")
    console.log("📝 Context length:", context.length)
    console.log("❓ Question:", question)

    // Nếu context quá lớn, chia nhỏ và xử lý
    if (context.length > 15000) {
      console.log("⚠️ Context rất lớn, đang xử lý theo chunks...")

      // Trích xuất dữ liệu từ context
      const dataMatch = context.match(
        /Dưới đây là.*?dữ liệu từ bảng[^:]*:\s*([\s\S]*?)\s*(?:Tổng cộng có|Hãy phân tích)/,
      )

      if (dataMatch) {
        try {
          const rawData = dataMatch[1]
          const parsedData = JSON.parse(rawData)

          // Chia dữ liệu thành chunks nhỏ hơn
          const chunks = chunkData(parsedData, 20)
          console.log(`📊 Chia dữ liệu thành ${chunks.length} chunks`)

          // Xử lý chunk đầu tiên với context đầy đủ
          const firstChunkContext = context.replace(
            rawData,
            JSON.stringify(chunks[0], null, 2) + `\n\n(Đây là chunk 1/${chunks.length} của dữ liệu)`,
          )

          const messages = [
            {
              role: "system" as const,
              content: firstChunkContext,
            },
            {
              role: "user" as const,
              content: question,
            },
          ]

          return await tryWithDifferentModels(messages)
        } catch (parseError) {
          console.log("⚠️ Không thể parse dữ liệu, sử dụng context gốc rút gọn")
        }
      }

      // Fallback: rút gọn context
      const truncatedContext = context.substring(0, 12000) + "\n\n... (Dữ liệu đã được rút gọn do quá lớn)"
      context = truncatedContext
    }

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

    // Thử với các model khác nhau
    const response = await tryWithDifferentModels(messages)
    console.log("✅ Groq API response received")

    return response
  } catch (error) {
    console.error("❌ Chi tiết lỗi Groq API:", error)

    // Xử lý các loại lỗi cụ thể
    if (error instanceof Error) {
      if (error.message.includes("rate_limit")) {
        return "⏰ API đã đạt giới hạn tốc độ. Vui lòng thử lại sau vài giây."
      } else if (error.message.includes("invalid_api_key")) {
        return "🔑 API key không hợp lệ. Vui lòng kiểm tra cấu hình."
      } else if (error.message.includes("context_length")) {
        return "📏 Dữ liệu quá lớn để xử lý. Hãy thử với câu hỏi cụ thể hơn."
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

// Function test API với model mới
export const testGroqAPI = async (): Promise<{ success: boolean; message: string; workingModel?: string }> => {
  console.log("🧪 Testing Groq API với các model khả dụng...")

  for (const model of AVAILABLE_MODELS) {
    try {
      console.log(`🧪 Testing model: ${model}`)

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
      console.log(`✅ Model ${model} hoạt động! Response:`, response)

      return {
        success: true,
        message: `Model ${model} hoạt động bình thường. Test response: ${response}`,
        workingModel: model,
      }
    } catch (error) {
      console.log(`❌ Model ${model} failed:`, error)
      continue
    }
  }

  return {
    success: false,
    message: "Tất cả các model đều không khả dụng. Vui lòng kiểm tra API key hoặc thử lại sau.",
  }
}

// Function để lấy danh sách model khả dụng
export const getAvailableModels = (): string[] => {
  return AVAILABLE_MODELS
}
