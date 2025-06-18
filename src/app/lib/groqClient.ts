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

// Function để tạo summary thông minh của dữ liệu
const createDataSummary = (data: any[]): string => {
  if (data.length === 0) return "Không có dữ liệu"

  // Lấy thông tin cơ bản
  const totalRecords = data.length
  const firstRecord = data[0]
  const fieldNames = Object.keys(firstRecord.fields || {})

  // Phân tích từng field
  const fieldAnalysis: Record<string, any> = {}

  fieldNames.forEach((fieldName) => {
    const values = data
      .map((record) => record.fields[fieldName])
      .filter((v) => v !== null && v !== undefined && v !== "")
    const uniqueValues = [...new Set(values)]

    fieldAnalysis[fieldName] = {
      totalValues: values.length,
      uniqueValues: uniqueValues.length,
      sampleValues: uniqueValues.slice(0, 5), // Lấy 5 giá trị mẫu
      isEmpty: values.length === 0,
    }
  })

  // Tạo summary
  let summary = `=== TỔNG QUAN DỮ LIỆU ===
Tổng số bản ghi: ${totalRecords}
Số trường dữ liệu: ${fieldNames.length}

=== PHÂN TÍCH CÁC TRƯỜNG ===
`

  fieldNames.forEach((fieldName) => {
    const analysis = fieldAnalysis[fieldName]
    summary += `
📊 ${fieldName}:
   - Có dữ liệu: ${analysis.totalValues}/${totalRecords} bản ghi
   - Giá trị duy nhất: ${analysis.uniqueValues}
   - Mẫu: ${JSON.stringify(analysis.sampleValues)}
`
  })

  // Thêm một số records mẫu đầy đủ
  summary += `\n=== MẪU DỮ LIỆU CHI TIẾT ===\n`
  const sampleSize = Math.min(10, totalRecords)
  for (let i = 0; i < sampleSize; i++) {
    summary += `\nBản ghi ${i + 1}:\n${JSON.stringify(data[i], null, 2)}\n`
  }

  if (totalRecords > sampleSize) {
    summary += `\n... và ${totalRecords - sampleSize} bản ghi khác với cấu trúc tương tự\n`
  }

  return summary
}

// Function để chia dữ liệu thành chunks thông minh
const createIntelligentChunks = (data: any[], maxChunkSize = 15): any[][] => {
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
      max_tokens: 3000, // Tăng max_tokens
      top_p: 1,
    })

    const response = chatCompletion.choices[0].message.content
    console.log(`✅ Model ${model} hoạt động thành công`)
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

    // Parse dữ liệu từ context để xử lý thông minh
    let processedContext = context
    let dataArray: any[] = []

    // Tìm và extract dữ liệu JSON từ context
    const dataMatch = context.match(
      /Dưới đây là.*?dữ liệu từ bảng[^:]*:\s*([\s\S]*?)\s*(?:Tổng cộng có|Hãy phân tích)/i,
    )

    if (dataMatch) {
      try {
        const rawData = dataMatch[1]
        dataArray = JSON.parse(rawData)
        console.log(`📊 Phát hiện ${dataArray.length} records trong context`)

        // Nếu dữ liệu lớn, tạo summary thông minh
        if (context.length > 20000 || dataArray.length > 20) {
          console.log("🧠 Tạo summary thông minh cho dữ liệu lớn...")

          const intelligentSummary = createDataSummary(dataArray)

          // Thay thế context với summary thông minh
          processedContext = context.replace(
            rawData,
            `${intelligentSummary}\n\n⚠️ Đây là tóm tắt thông minh của ${dataArray.length} bản ghi. AI có thể phân tích và trả lời dựa trên thông tin này.`,
          )

          console.log("✅ Đã tạo summary thông minh, context length:", processedContext.length)
        }
      } catch (parseError) {
        console.log("⚠️ Không thể parse dữ liệu JSON, sử dụng context gốc")
      }
    }

    // Nếu context vẫn quá lớn, cắt bớt
    if (processedContext.length > 25000) {
      console.log("⚠️ Context vẫn quá lớn, cắt bớt...")
      processedContext = processedContext.substring(0, 22000) + "\n\n... (Dữ liệu đã được rút gọn do quá lớn)"
    }

    const messages = [
      {
        role: "system" as const,
        content: processedContext,
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

// Function phân tích dữ liệu theo chunks
export const askAIWithChunks = async (data: any[], tableName: string, question: string): Promise<string> => {
  try {
    console.log(`🧠 Phân tích dữ liệu theo chunks: ${data.length} records`)

    if (data.length <= 20) {
      // Nếu dữ liệu nhỏ, xử lý bình thường
      const context = `Bạn là một AI assistant thông minh. Dưới đây là TOÀN BỘ dữ liệu từ bảng "${tableName}":

${JSON.stringify(data, null, 2)}

Tổng cộng có ${data.length} records trong bảng.`

      return await askAI(context, question)
    }

    // Nếu dữ liệu lớn, sử dụng summary thông minh
    const intelligentSummary = createDataSummary(data)

    const context = `Bạn là một AI assistant thông minh chuyên phân tích dữ liệu. Dưới đây là tóm tắt thông minh của TOÀN BỘ dữ liệu từ bảng "${tableName}":

${intelligentSummary}

Hãy phân tích dữ liệu này và trả lời câu hỏi của người dùng một cách chính xác và hữu ích. Trả lời bằng tiếng Việt.

LưU Ý: Bạn đã nhận được thông tin tóm tắt của ${data.length} bản ghi đầy đủ, bao gồm phân tích từng trường dữ liệu và các mẫu dữ liệu chi tiết.`

    return await askAI(context, question)
  } catch (error) {
    console.error("❌ askAIWithChunks failed:", error)
    return `❌ Lỗi khi phân tích dữ liệu: ${error}`
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
