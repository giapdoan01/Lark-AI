import { Groq } from "groq-sdk"

// Danh sách API keys
const API_KEYS = [
  process.env.NEXT_PUBLIC_GROQ_API_KEY_1 || "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",
  process.env.NEXT_PUBLIC_GROQ_API_KEY_2 || "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",
  process.env.NEXT_PUBLIC_GROQ_API_KEY_3 || "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",
  process.env.NEXT_PUBLIC_GROQ_API_KEY_4 || "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",
  process.env.NEXT_PUBLIC_GROQ_API_KEY_5 || "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",
].filter((key) => key && !key.includes("account") && key.startsWith("gsk_"))

const AVAILABLE_MODELS = ["meta-llama/llama-guard-4-12b"]

// Ước tính số tokens (1 token ≈ 4 ký tự)
const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / 4)
}

// Chia dữ liệu CSV thành chunks
const calculateTokenDistribution = (
  data: string,
): {
  totalTokens: number
  tokensPerAPI: number
  chunksPerAPI: number[]
  distribution: string[]
} => {
  const totalTokens = estimateTokens(data)
  const tokensPerAPI = Math.ceil(totalTokens / 4)

  console.log(`📊 ===== TOKEN DISTRIBUTION CALCULATION =====`)
  console.log(`🎯 Total characters: ${data.length}`)
  console.log(`🎯 Total records: ${data.split("\n").length - 1}`)
  console.log(`🎯 TOTAL TOKENS: ${totalTokens}`)
  console.log(`📊 Tokens per API (4 APIs): ${tokensPerAPI}`)
  console.log(`⚡ Model: ${AVAILABLE_MODELS[0]}`)

  const lines = data.split("\n").filter((line) => line.trim())
  const chunks: string[] = []
  const chunksPerAPI: number[] = []
  let currentChunk: string[] = [lines[0]] // Giữ header
  let currentTokens = estimateTokens(lines[0])
  let currentAPIIndex = 0

  for (let i = 1; i < lines.length; i++) {
    const lineTokens = estimateTokens(lines[i])
    if (currentTokens + lineTokens > tokensPerAPI && currentChunk.length > 1 && currentAPIIndex < 3) {
      console.log(`📊 API ${currentAPIIndex + 1} chunk: ${currentChunk.length - 1} records, ${currentTokens} tokens`)
      chunks.push(currentChunk.join("\n"))
      chunksPerAPI.push(currentChunk.length - 1)
      currentChunk = [lines[0]]
      currentTokens = estimateTokens(lines[0])
      currentAPIIndex++
    }
    currentChunk.push(lines[i])
    currentTokens += lineTokens
  }

  if (currentChunk.length > 1) {
    console.log(`📊 API ${currentAPIIndex + 1} chunk: ${currentChunk.length - 1} records, ${currentTokens} tokens`)
    chunks.push(currentChunk.join("\n"))
    chunksPerAPI.push(currentChunk.length - 1)
  }

  while (chunks.length < 4 && lines.length > 5) {
    const remainingRecords = lines.length - 1 - chunks.reduce((sum, chunk) => sum + chunk.split("\n").length - 1, 0)
    if (remainingRecords > 0) {
      const recordsPerChunk = Math.ceil(remainingRecords / (4 - chunks.length))
      const startIndex = chunks.reduce((sum, chunk) => sum + chunk.split("\n").length - 1, 0) + 1
      const newChunk = [lines[0], ...lines.slice(startIndex, startIndex + recordsPerChunk)]
      if (newChunk.length > 1) {
        const chunkTokens = estimateTokens(newChunk.join("\n"))
        console.log(`📊 API ${chunks.length + 1} chunk (balanced): ${newChunk.length - 1} records, ${chunkTokens} tokens`)
        chunks.push(newChunk.join("\n"))
        chunksPerAPI.push(newChunk.length - 1)
      }
    } else {
      break
    }
  }

  console.log(`📊 FINAL DISTRIBUTION:`)
  chunks.forEach((chunk, index) => {
    const chunkTokens = estimateTokens(chunk)
    console.log(`  API ${index + 1}: ${chunk.split("\n").length - 1} records, ${chunkTokens} tokens`)
  })
  console.log(`  API 5: Tổng hợp và trả lời câu hỏi`)
  console.log(`===============================================`)

  return {
    totalTokens,
    tokensPerAPI,
    chunksPerAPI,
    distribution: chunks,
  }
}

// Test single chunk
const testSingleChunk = async (chunk: string, keyIndex: number): Promise<boolean> => {
  try {
    const apiKey = API_KEYS[keyIndex]
    const estimatedTokens = estimateTokens(chunk)

    console.log(`🧪 Test chunk: ${chunk.split("\n").length - 1} records, ~${estimatedTokens} tokens`)

    if (estimatedTokens > 15000) {
      console.log(`⚠️ Chunk quá lớn (${estimatedTokens} tokens)`)
      return false
    }

    const groq = createGroqClient(apiKey)
    const testCompletion = await groq.chat.completions.create({
      model: AVAILABLE_MODELS[0],
      messages: [{ role: "user", content: "Test: Return 'OK'" }],
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

// Tạo Groq client
const createGroqClient = (apiKey: string): Groq => {
  return new Groq({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true,
  })
}

// Phân tích với single key
const analyzeWithSingleKey = async (apiKey: string, keyIndex: number, prompt: string): Promise<string> => {
  try {
    const promptTokens = estimateTokens(prompt)
    console.log(`🤖 FINAL ANALYSIS với API 5 (Key ${keyIndex + 1}):`)
    console.log(`  🎯 Analysis INPUT tokens: ${promptTokens}`)
    console.log(`  ⚡ Model: ${AVAILABLE_MODELS[0]}`)

    const groq = createGroqClient(apiKey)
    const startTime = Date.now()
    const completion = await Promise.race([
      groq.chat.completions.create({
        model: AVAILABLE_MODELS[0],
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 25000,
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout 90s")), 90000)),
    ]) as any

    const responseTime = Date.now() - startTime
    const analysis = completion.choices[0].message.content || "Không có phân tích"
    const outputTokens = estimateTokens(analysis)

    console.log(`✅ ANALYSIS COMPLETE:`)
    console.log(`  🎯 OUTPUT tokens: ${outputTokens}`)
    console.log(`  ⚡ Processing time: ${responseTime}ms`)

    return analysis
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`❌ Analysis failed: ${errorMsg}`)
    return `❌ Không thể phân tích: ${errorMsg}`
  }
}

// Tối ưu hóa chunk CSV
const optimizeDataChunk = async (
  apiKey: string,
  keyIndex: number,
  dataChunk: string,
  chunkIndex: number,
  totalChunks: number,
  targetTokens: number,
): Promise<{ success: boolean; optimizedData: string; keyIndex: number; error?: string }> => {
  try {
    const estimatedTokens = estimateTokens(dataChunk)
    console.log(`\n🔧 ===== API ${keyIndex + 1} - CHUNK ${chunkIndex + 1}/${totalChunks} =====`)
    console.log(`📊 TOKEN ANALYSIS:`)
    console.log(`  🎯 Target tokens: ${targetTokens}`)
    console.log(`  📝 Records: ${dataChunk.split("\n").length - 1}`)
    console.log(`  📄 Characters: ${dataChunk.length}`)
    console.log(`  🎯 INPUT TOKENS: ${estimatedTokens}`)

    if (estimatedTokens > 15000) {
      console.log(`❌ CHUNK QUÁ LỚN: ${estimatedTokens} tokens > 15000 limit`)
      return {
        success: false,
        optimizedData: "",
        keyIndex: keyIndex,
        error: `Chunk quá lớn: ${estimatedTokens} tokens > 15000 limit`,
      }
    }

    const groq = createGroqClient(apiKey)
    const optimizePrompt = `Optimize CSV - remove columns with all null/empty values, compact values:
${dataChunk}
Return optimized CSV only:`

    const promptTokens = estimateTokens(optimizePrompt)
    console.log(`📤 SENDING REQUEST:`)
    console.log(`  🎯 Total INPUT tokens: ${promptTokens}`)
    console.log(`  ⚡ Model: ${AVAILABLE_MODELS[0]}`)

    const startTime = Date.now()
    const completion = await Promise.race([
      groq.chat.completions.create({
        model: AVAILABLE_MODELS[0],
        messages: [{ role: "user", content: optimizePrompt }],
        temperature: 0.1,
        max_tokens: 8000,
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout 60s")), 60000)),
    ]) as any

    const responseTime = Date.now() - startTime
    const optimizedData = completion.choices[0].message.content.trim()
    const outputTokens = estimateTokens(optimizedData)

    console.log(`📊 OUTPUT ANALYSIS:`)
    console.log(`  📄 Response chars: ${optimizedData.length}`)
    console.log(`  🎯 OUTPUT TOKENS: ${outputTokens}`)
    console.log(`  📉 Compression: ${Math.round((outputTokens / estimatedTokens) * 100)}%`)

    // Validate CSV
    const lines = optimizedData.split("\n")
    if (lines.length < 2) {
      throw new Error("Invalid CSV: Too few lines")
    }
    const headerLength = lines[0].split(",").length
    const invalidLines = lines.slice(1).filter((line) => line.split(",").length !== headerLength)
    if (invalidLines.length > 0) {
      throw new Error(`Invalid CSV: Mismatched column count in ${invalidLines.length} lines`)
    }

    console.log(`✅ VALIDATION SUCCESS:`)
    console.log(`  📊 Valid CSV with ${lines.length - 1} records`)
    console.log(`===== END API ${keyIndex + 1} =====\n`)

    return {
      success: true,
      optimizedData: optimizedData,
      keyIndex: keyIndex,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`❌ API ${keyIndex + 1} FAILED: ${errorMsg}`)
    return {
      success: false,
      optimizedData: "",
      keyIndex: keyIndex,
      error: errorMsg,
    }
  }
}

// Debug chunk CSV
const debugOptimizeProcess = async (chunk: string, keyIndex: number): Promise<void> => {
  try {
    const estimatedTokens = estimateTokens(chunk)
    console.log(`🔍 DEBUG API ${keyIndex + 1}:`)
    console.log(`  - Records: ${chunk.split("\n").length - 1}`)
    console.log(`  - Characters: ${chunk.length}`)
    console.log(`  - Estimated tokens: ${estimatedTokens}`)
    console.log(`  - Sample: ${chunk.split("\n")[0]}\n${chunk.split("\n")[1] || ""}...`)

    const apiKey = API_KEYS[keyIndex]
    const groq = createGroqClient(apiKey)
    const testResult = await groq.chat.completions.create({
      model: AVAILABLE_MODELS[0],
      messages: [{ role: "user", content: "Say 'test ok'" }],
      temperature: 0.1,
      max_tokens: 10,
    })

    console.log(`✅ API ${keyIndex + 1} test result:`, testResult?.choices?.[0]?.message?.content)
  } catch (error) {
    console.error(`❌ DEBUG failed for API ${keyIndex + 1}:`, error)
  }
}

// Pipeline chính
export const preprocessDataWithPipeline = async (
  data: string,
  tableName: string,
): Promise<{ success: boolean; optimizedData: string; analysis: string; keyUsage: any }> => {
  try {
    console.log(`🚀 Bắt đầu Data Preprocessing Pipeline với ${data.split("\n").length - 1} records`)

    if (!API_KEYS || API_KEYS.length < 5) {
      throw new Error("Cần ít nhất 5 API keys (4 cho optimize + 1 cho analysis)")
    }

    // Bước 1: Tính toán token distribution
    console.log(`📊 BƯỚC 1: Tính toán token distribution...`)
    const tokenDistribution = calculateTokenDistribution(data)

    if (tokenDistribution.distribution.length === 0) {
      throw new Error("Không thể chia dữ liệu thành chunks")
    }

    // Test API keys
    console.log(`🧪 Test 4 API keys đầu...`)
    const keyTests = await Promise.all(
      API_KEYS.slice(0, 4).map((key, index) => testSingleChunk(data.split("\n").slice(0, 2).join("\n"), index)),
    )
    const workingKeys = keyTests.filter(Boolean).length
    console.log(`🔑 ${workingKeys}/4 optimize APIs hoạt động`)

    if (workingKeys === 0) {
      throw new Error("Không có API keys nào hoạt động cho optimize")
    }

    const analysisKeyTest = await testSingleChunk(data.split("\n").slice(0, 2).join("\n"), 4)
    if (!analysisKeyTest) {
      console.log(`⚠️ API 5 không hoạt động, sẽ dùng API 1 cho analysis`)
    }

    // Bước 2: Optimize chunks
    console.log(`⏳ BƯỚC 2: Optimize ${tokenDistribution.distribution.length} chunks...`)
    const optimizeResults = []

    for (let i = 0; i < Math.min(4, tokenDistribution.distribution.length); i++) {
      const chunk = tokenDistribution.distribution[i]
      const keyIndex = i

      console.log(`🔧 Xử lý chunk ${i + 1} với API ${keyIndex + 1}`)
      await debugOptimizeProcess(chunk, keyIndex)

      let result = null
      let retryCount = 0
      const maxRetries = 2

      while (retryCount <= maxRetries && (!result || !result.success)) {
        if (retryCount > 0) {
          console.log(`🔄 Retry ${retryCount}/${maxRetries} cho API ${keyIndex + 1}`)
          await new Promise((resolve) => setTimeout(resolve, 3000))
        }

        result = await optimizeDataChunk(
          API_KEYS[keyIndex],
          keyIndex,
          chunk,
          i,
          tokenDistribution.distribution.length,
          tokenDistribution.tokensPerAPI,
        )

        if (result && result.success) {
          console.log(`✅ API ${keyIndex + 1}: Thành công sau ${retryCount} retries`)
          break
        } else {
          console.log(`❌ API ${keyIndex + 1}: Thất bại lần ${retryCount + 1} - ${result?.error || "Unknown error"}`)
        }

        retryCount++
      }

      optimizeResults.push(result || {
        success: false,
        optimizedData: "",
        keyIndex: keyIndex,
        error: "No result after retries",
      })

      if (i < tokenDistribution.distribution.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    const successfulOptimizes = optimizeResults.filter((r) => r && r.success)
    console.log(`📊 Optimize results: ${successfulOptimizes.length}/4 APIs thành công`)

    if (successfulOptimizes.length === 0) {
      console.log(`🔄 FALLBACK: Tất cả optimize thất bại, sử dụng raw CSV`)
      const rawData = data.split("\n").slice(0, 51).join("\n") // Lấy 50 records đầu

      return {
        success: true,
        optimizedData: rawData,
        analysis: `⚠️ Không thể optimize dữ liệu, sử dụng 50 records đầu tiên từ tổng ${data.split("\n").length - 1} records`,
        keyUsage: {
          totalKeys: API_KEYS.length,
          optimizeKeys: 0,
          analysisKey: 1,
          failedKeys: 4,
          successRate: "0%",
          chunks: 1,
          successfulChunks: 0,
          finalDataSize: rawData.length,
          fallback: true,
          tokenDistribution,
        },
      }
    }

    // Bước 3: Gộp dữ liệu
    let combinedOptimizedData = successfulOptimizes[0].optimizedData.split("\n")[0] + "\n" // Lấy header từ chunk đầu
    let validChunks = 0

    for (const result of successfulOptimizes) {
      const lines = result.optimizedData.split("\n")
      if (lines.length > 1) {
        combinedOptimizedData += lines.slice(1).join("\n") + "\n"
        validChunks++
      }
    }

    const finalTokens = estimateTokens(combinedOptimizedData)
    console.log(`📊 BƯỚC 3: Đã gộp ${validChunks} chunks`)
    console.log(`  📘 Final data: ${combinedOptimizedData.length} chars`)
    console.log(`  🎯 Final tokens: ${finalTokens}`)
    console.log(`  📉 Compression: ${Math.round((finalTokens / tokenDistribution.totalTokens) * 100)}%`)

    // Bước 4: Phân tích tổng hợp
    const analysisKeyIndex = 4
    const analysisApiKey = API_KEYS[analysisKeyIndex]

    if (!analysisApiKey) {
      throw new Error("Không có API 5 cho phân tích")
    }

    console.log(`🤖 BƯỚC 4: Phân tích tổng hợp với API 5`)

    const analysisPrompt = `Bạn là một AI analyst chuyên nghiệp. Dưới đây là dữ liệu từ bảng "${tableName}" ở định dạng CSV đã được optimize bởi ${successfulOptimizes.length}/4 APIs (${data.split("\n").length - 1} records gốc):

${combinedOptimizedData}

TokenDistribution Summary:
- Total original tokens: ${tokenDistribution.totalTokens}
- Tokens per API: ${tokenDistribution.tokensPerAPI}
- Final optimized tokens: ${finalTokens}
- Compression ratio: ${Math.round((finalTokens / tokenDistribution.totalTokens) * 100)}%

Hãy phân tích chi tiết:
1. 📊 Tổng quan về dữ liệu
2. 📈 Thống kê quan trọng
3. 🔍 Patterns và insights
4. 💡 Nhận xét và đánh giá

Trả lời bằng tiếng Việt, chi tiết và có cấu trúc.`

    const finalAnalysis = await analyzeWithSingleKey(analysisApiKey, analysisKeyIndex, analysisPrompt)

    const keyUsage = {
      totalKeys: API_KEYS.length,
      optimizeKeys: successfulOptimizes.length,
      analysisKey: 1,
      failedKeys: optimizeResults.length - successfulOptimizes.length,
      successRate: `${Math.round((successfulOptimizes.length / 4) * 100)}%`,
      chunks: tokenDistribution.distribution.length,
      successfulChunks: validChunks,
      finalDataSize: combinedOptimizedData.length,
      tokenDistribution,
      finalTokens,
      compressionRatio: `${Math.round((finalTokens / tokenDistribution.totalTokens) * 100)}%`,
    }

    return {
      success: true,
      optimizedData: combinedOptimizedData,
      analysis: finalAnalysis,
      keyUsage,
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

// Trả lời câu hỏi với dữ liệu CSV
export const answerQuestionWithOptimizedData = async (
  optimizedData: string,
  tableName: string,
  question: string,
  originalRecordCount: number,
): Promise<string> => {
  try {
    console.log(`🤔 Trả lời câu hỏi với optimized CSV (${originalRecordCount} records)`)

    const questionKeyIndex = 4
    const questionApiKey = API_KEYS[questionKeyIndex]

    if (!questionApiKey) {
      throw new Error("Không có API 5 để trả lời câu hỏi")
    }

    const questionPrompt = `Bạn là một AI assistant thông minh. Dưới đây là TOÀN BỘ dữ liệu từ bảng "${tableName}" (${originalRecordCount} records) ở định dạng CSV đã được optimize:

${optimizedData}

Đây là dữ liệu HOÀN CHỈNH từ ${originalRecordCount} bản ghi. Hãy trả lời câu hỏi một cách chính xác và chi tiết.

Câu hỏi: ${question}

Trả lời bằng tiếng Việt:`

    return await analyzeWithSingleKey(questionApiKey, questionKeyIndex, questionPrompt)
  } catch (error) {
    console.error("❌ answerQuestionWithOptimizedData failed:", error)
    return `❌ Lỗi khi trả lời câu hỏi: ${error}`
  }
}

// Test tất cả API keys
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
      const response = await groq.chat.completions.create({
        model: AVAILABLE_MODELS[0],
        messages: [{ role: "user", content: "Test: 1+1=?" }],
        temperature: 0.1,
        max_tokens: 50,
      })

      console.log(`✅ API ${index + 1}: OK`)
      return {
        keyIndex: index + 1,
        status: "success" as const,
        response: response?.choices?.[0]?.message?.content || "No response",
        preview: `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`,
        role: index < 4 ? "optimize" : "analysis",
      }
    } catch (error) {
      console.log(`❌ API ${index + 1}: ${error}`)
      return {
        keyIndex: index + 1,
        status: "failed" as const,
        error: error instanceof Error ? error.message : String(error),
        preview: `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`,
        role: index < 4 ? "optimize" : "analysis",
      }
    }
  })

  const results = await Promise.all(testPromises)
  const workingKeys = results.filter((r) => r.status === "success").length

  return {
    success: workingKeys > 0,
    message: `${workingKeys}/${API_KEYS.length} API keys hoạt động`,
    workingKeys,
    totalKeys: API_KEYS.length,
    keyDetails: results,
  }
}

// Các hàm khác
export const getAvailableModels = (): string[] => {
  return AVAILABLE_MODELS
}

export const getApiKeysInfo = () => ({
  totalKeys: API_KEYS.length,
  keysPreview: API_KEYS.map(
    (key, index) =>
      `API ${index + 1}: ${key.substring(0, 10)}...${key.substring(key.length - 4)} (${index < 4 ? "optimize" : "analysis"})`,
  ),
})

// Backward compatibility
export const answerQuestionWithData = async (
  data: string,
  tableName: string,
  question: string,
  previousAnalysis?: string,
  optimizedData?: string,
): Promise<string> => {
  try {
    if (optimizedData && optimizedData.length > 0) {
      return await answerQuestionWithOptimizedData(optimizedData, tableName, question, data.split("\n").length - 1)
    } else {
      const quickOptimized = data.split("\n").slice(0, 31).join("\n") // 30 records đầu
      return await answerQuestionWithOptimizedData(quickOptimized, tableName, question, data.split("\n").length - 1)
    }
  } catch (error) {
    console.error("❌ answerQuestionWithData failed:", error)
    return `❌ Lỗi khi trả lời câu hỏi: ${error}`
  }
}

export const testGroqAPI = async () => {
  const result = await testAllApiKeys()
  return {
    success: result.success,
    message: result.message,
    workingModel: AVAILABLE_MODELS[0],
  }
}
