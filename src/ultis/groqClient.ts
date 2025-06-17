import { Groq } from 'groq-sdk'

const groq = new Groq({
  apiKey: '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',
  dangerouslyAllowBrowser: true,
})

export const askAI = async (context: string, question: string): Promise<string> => {
  const chatCompletion = await groq.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: [
      { role: 'system', content: context },
      { role: 'user', content: question }
    ],
    temperature: 0.7,
    max_tokens: 1024,
    top_p: 1,
  })

  return chatCompletion.choices[0].message.content || 'Không có câu trả lời.'
}
