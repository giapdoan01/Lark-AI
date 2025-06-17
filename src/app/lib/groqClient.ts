import { Groq } from "groq-sdk"

const groq = new Groq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY || "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",
  dangerouslyAllowBrowser: true,
})

// Function để rút gọn dữ liệu nếu quá lớn
const truncateData = (data: any[], maxLength = 3000): string => {
  const jsonString = JSON.stringify(data, null, 2)

  if (jsonString.length <= maxLength) {
    return jsonString
  }

  // Nếu dữ liệu quá lớn, chỉ lấy một vài records đầu tiên
  const truncatedData = data.slice(0, Math.min(3, data.length))
  const truncatedString = JSON.stringify(truncatedData, null, 2)

  return `${truncatedString}\n\n... (Đã rút gọn từ ${data.length} records để tránh quá tải. Chỉ hiển thị ${truncatedData.length} records đầu tiên)`
}

export const askAI = async (context: string, question: string): Promise<string> => {
  try {
    console.log("🤖 Bắt đầu gọi Groq API...")
    console.log("📝 Context length:", context.length)
    console.log("❓ Question:", question)

    // Kiểm tra độ dài context
    if (context.length > 8000) {
      console.log("⚠️ Context quá dài, đang rút gọn...")
      // Tách dữ liệu từ context
      const dataMatch = context.match(/Dưới đây là dữ liệu từ bảng[^:]*:\s*([\s\S]*?)\s*Hãy phân tích/)
      if (dataMatch) {
        try {
          const rawData = dataMatch[1]
          const parsedData = JSON.parse(rawData)
          const truncatedData = truncateData(parsedData)
          context = context.replace(rawData, truncatedData)
          console.log("✅ Đã rút gọn context, độ dài mới:", context.length)
        } catch (parseError) {
          console.log("⚠️ Không thể parse dữ liệu để rút gọn")
        }
      }
    }

    const chatCompletion = await groq.chat.completions.create({
      model: "llama-3.1-70b-versatile",
      messages: [
        {
          role: "system",
          content: context,
        },
        {
          role: "user",
          content: question,
        },
      ],
      temperature: 0.7,
      max_tokens: 1024,
      top_p: 1,
    })

    const response = chatCompletion.choices[0].message.content
    console.log("✅ Groq API response received")

    return response || "Không có câu trả lời từ AI."
  } catch (error) {
    console.error("❌ Chi tiết lỗi Groq API:", error)

    // Xử lý các loại lỗi cụ thể
    if (error instanceof Error) {
      if (error.message.includes("rate_limit")) {
        return "⏰ API đã đạt giới hạn tốc độ. Vui lòng thử lại sau vài giây."
      } else if (error.message.includes("invalid_api_key")) {
        return "🔑 API key không hợp lệ. Vui lòng kiểm tra cấu hình."
      } else if (error.message.includes("context_length")) {
        return "📏 Dữ liệu quá lớn để xử lý. Hãy thử với ít dữ liệu hơn hoặc câu hỏi ngắn gọn hơn."
      } else if (error.message.includes("network") || error.message.includes("fetch")) {
        return "🌐 Lỗi kết nối mạng. Vui lòng kiểm tra internet và thử lại."
      }

      return `❌ Lỗi AI: ${error.message}`
    }

    return "❌ Đã xảy ra lỗi không xác định khi gọi AI. Vui lòng thử lại."
  }
}

// Function test API
export const testGroqAPI = async (): Promise<{ success: boolean; message: string }> => {
  try {
    console.log("🧪 Testing Groq API...")

    const testCompletion = await groq.chat.completions.create({
      model: "llama-3.1-70b-versatile",
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
    console.log("✅ Test response:", response)

    return {
      success: true,
      message: `API hoạt động bình thường. Test response: ${response}`,
    }
  } catch (error) {
    console.error("❌ Test API failed:", error)
    return {
      success: false,
      message: `API test thất bại: ${error}`,
    }
  }
}
