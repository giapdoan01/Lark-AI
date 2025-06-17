import { Groq } from "groq-sdk"

const groq = new Groq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY || "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",
  dangerouslyAllowBrowser: true,
})

export const askAI = async (context: string, question: string): Promise<string> => {
  try {
    const chatCompletion = await groq.chat.completions.create({
      model: "llama-3.1-70b-versatile", // Sử dụng model ổn định hơn
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

    return chatCompletion.choices[0].message.content || "Không có câu trả lời từ AI."
  } catch (error) {
    console.error("❌ Lỗi Groq API:", error)
    throw new Error("Không thể kết nối với AI. Vui lòng kiểm tra API key.")
  }
}
