import { Groq } from "groq-sdk"

// Danh sách API keys
const API_KEYS = [
  process.env.NEXT_PUBLIC_GROQ_API_KEY_1 || "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",
  process.env.NEXT_PUBLIC_GROQ_API_KEY_2 || "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",
  process.env.NEXT_PUBLIC_GROQ_API_KEY_3 || "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",
  process.env.NEXT_PUBLIC_GROQ_API_KEY_4 || "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",
  process.env.NEXT_PUBLIC_GROQ_API_KEY_5 || "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",
].filter((key) => key && !key.includes("account") && key.startsWith("gsk_"))

const SINGLE_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"

// Cache đơn giản
const testResultsCache = new Map<string, boolean>()

// Function ước tính số tokens
const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / 4)
}

// 🔥 NEW: Raw JSON preparation với data integrity protection
const prepareRawJSONData = (
  data: Array<{ recordId: string; fields: Record<string, unknown> }>,
): {
  jsonData: string
  integrityReport: string
  stats: any
} => {
  console.log(`📊 ===== RAW JSON PREPARATION (NO CSV CONVERSION) =====`)
  console.log(`📊 Preparing ${data.length} records as raw JSON...`)

  // 🔍 STEP 1: Analyze data structure
  const allFieldNames = new Set<string>()
  const fieldStats: Record<
    string,
    { totalValues: number; emptyValues: number; uniqueTypes: Set<string>; samples: unknown[] }
  > = {}

  data.forEach((record, recordIndex) => {
    Object.entries(record.fields).forEach(([fieldName, fieldValue]) => {
      allFieldNames.add(fieldName)

      if (!fieldStats[fieldName]) {
        fieldStats[fieldName] = {
          totalValues: 0,
          emptyValues: 0,
          uniqueTypes: new Set(),
          samples: [],
        }
      }

      fieldStats[fieldName].totalValues++
      fieldStats[fieldName].uniqueTypes.add(typeof fieldValue)

      if (fieldValue === null || fieldValue === undefined || fieldValue === "") {
        fieldStats[fieldName].emptyValues++
      } else {
        // Collect samples for analysis (first 3 non-empty values)
        if (fieldStats[fieldName].samples.length < 3) {
          fieldStats[fieldName].samples.push(fieldValue)
        }
      }

      // Log first few samples for debugging
      if (recordIndex < 3) {
        console.log(`🔍 Record ${recordIndex + 1}, Field "${fieldName}":`, fieldValue)
      }
    })
  })

  const fieldNames = Array.from(allFieldNames).sort()
  console.log(`📋 Found ${fieldNames.length} unique fields:`, fieldNames)

  // 🔍 STEP 2: Create comprehensive field analysis
  console.log(`📊 Field Analysis:`)
  fieldNames.forEach((fieldName) => {
    const stats = fieldStats[fieldName]
    const fillRate = (((stats.totalValues - stats.emptyValues) / stats.totalValues) * 100).toFixed(1)
    const types = Array.from(stats.uniqueTypes).join(", ")
    console.log(`  "${fieldName}": ${stats.totalValues} values, ${fillRate}% filled, types: ${types}`)

    // Log sample values for debugging
    if (stats.samples.length > 0) {
      console.log(
        `    Samples:`,
        stats.samples.map((s) =>
          typeof s === "object" ? JSON.stringify(s).substring(0, 50) + "..." : String(s).substring(0, 50),
        ),
      )
    }
  })

  // 🔍 STEP 3: Prepare clean JSON structure
  const cleanedData = data.map((record, index) => ({
    STT: index + 1,
    recordId: record.recordId,
    fields: record.fields,
  }))

  // 🔍 STEP 4: Generate JSON string
  const jsonData = JSON.stringify(cleanedData, null, 2)

  // 🔍 STEP 5: Calculate statistics
  const totalPossibleValues = data.length * fieldNames.length
  const totalActualValues = Object.values(fieldStats).reduce(
    (sum, stat) => sum + (stat.totalValues - stat.emptyValues),
    0,
  )
  const dataIntegrityRate = ((totalActualValues / totalPossibleValues) * 100).toFixed(1)

  const jsonSize = jsonData.length
  const estimatedTokens = estimateTokens(jsonData)

  // 🔍 STEP 6: Create integrity report
  const integrityReport = `
📊 RAW JSON DATA INTEGRITY REPORT:
  ✅ Total records: ${data.length}
  ✅ Total fields: ${fieldNames.length}
  ✅ Total possible values: ${totalPossibleValues}
  ✅ Actual values with data: ${totalActualValues}
  ✅ Data integrity rate: ${dataIntegrityRate}%
  ✅ JSON size: ${jsonSize} characters
  ✅ Estimated tokens: ${estimatedTokens}
  
📋 Field Quality Summary:
${fieldNames
  .map((fieldName) => {
    const stats = fieldStats[fieldName]
    const fillRate = (((stats.totalValues - stats.emptyValues) / stats.totalValues) * 100).toFixed(1)
    return `  • "${fieldName}": ${fillRate}% filled (${stats.totalValues - stats.emptyValues}/${stats.totalValues})`
  })
  .join("\n")}

🔍 Data Structure: Raw JSON preserves ALL original field structures
🔍 No conversion loss: 100% original Lark Base data maintained
  `

  console.log(`✅ ===== RAW JSON PREPARATION COMPLETE =====`)
  console.log(`📊 Records: ${data.length}`)
  console.log(`📋 Fields: ${fieldNames.length}`)
  console.log(`📄 JSON size: ${jsonSize} characters`)
  console.log(`🎯 Estimated tokens: ${estimatedTokens}`)
  console.log(`🔍 Data integrity rate: ${dataIntegrityRate}%`)
  console.log(`✅ NO CONVERSION LOSS - Raw JSON maintains 100% original data`)
  console.log(`===============================================`)

  return {
    jsonData,
    integrityReport,
    stats: {
      totalRecords: data.length,
      totalFields: fieldNames.length,
      totalPossibleValues,
      totalActualValues,
      dataIntegrityRate: Number.parseFloat(dataIntegrityRate),
      jsonSize,
      estimatedTokens,
      fieldStats,
    },
  }
}

// 🔥 NEW: Validate raw JSON data integrity
const validateRawJSONIntegrity = (
  originalData: Array<{ recordId: string; fields: Record<string, unknown> }>,
  jsonData: string,
): { isValid: boolean; report: string; issues: string[] } => {
  const issues: string[] = []

  try {
    // Parse JSON to validate structure
    const parsedData = JSON.parse(jsonData)

    // Check if it's an array
    if (!Array.isArray(parsedData)) {
      issues.push("JSON data is not an array")
      return { isValid: false, report: "Invalid JSON structure", issues }
    }

    // Check record count
    if (parsedData.length !== originalData.length) {
      issues.push(`Record count mismatch: Expected ${originalData.length}, got ${parsedData.length}`)
    }

    // Check each record structure
    let validRecords = 0
    let recordsWithFields = 0

    parsedData.forEach((record: any, index: number) => {
      if (record && typeof record === "object") {
        validRecords++

        if (record.fields && typeof record.fields === "object") {
          recordsWithFields++

          // Check if record has the expected structure
          if (!record.STT || !record.recordId) {
            issues.push(`Record ${index + 1} missing STT or recordId`)
          }
        } else {
          issues.push(`Record ${index + 1} missing or invalid fields object`)
        }
      } else {
        issues.push(`Record ${index + 1} is not a valid object`)
      }
    })

    // Calculate data quality metrics
    const recordValidityRate = ((validRecords / parsedData.length) * 100).toFixed(1)
    const fieldsValidityRate = ((recordsWithFields / parsedData.length) * 100).toFixed(1)

    const report = `
📊 Raw JSON Integrity Validation:
  ✅ Total records: ${parsedData.length}/${originalData.length}
  ✅ Valid record objects: ${validRecords} (${recordValidityRate}%)
  ✅ Records with fields: ${recordsWithFields} (${fieldsValidityRate}%)
  ✅ JSON structure: ${Array.isArray(parsedData) ? "Valid array" : "Invalid"}
  ${issues.length === 0 ? "✅ All validation checks passed!" : `⚠️ ${issues.length} issues detected`}
    `

    return {
      isValid: issues.length === 0,
      report: report,
      issues: issues,
    }
  } catch (error) {
    const errorMsg = `JSON validation error: ${error}`
    return {
      isValid: false,
      report: errorMsg,
      issues: [errorMsg],
    }
  }
}

// 🔥 NEW: Random API selection
const selectRandomWorkingAPI = async (): Promise<{ apiKey: string; apiIndex: number; details: any } | null> => {
  console.log(`🎲 Selecting random working API from ${API_KEYS.length} available keys...`)

  const apiTestResults = []
  for (let i = 0; i < API_KEYS.length; i++) {
    console.log(`🧪 Testing API ${i + 1}...`)
    const testResult = await testSingleAPI(i)
    apiTestResults.push({ ...testResult, index: i })

    if (testResult.success) {
      console.log(`✅ API ${i + 1} working`)
    } else {
      console.log(`❌ API ${i + 1} failed: ${testResult.details.error}`)
    }
  }

  const workingAPIs = apiTestResults.filter((result) => result.success)
  console.log(`🔑 Found ${workingAPIs.length}/${API_KEYS.length} working APIs`)

  if (workingAPIs.length === 0) {
    console.log(`❌ No working APIs found`)
    return null
  }

  const randomIndex = Math.floor(Math.random() * workingAPIs.length)
  const selectedAPI = workingAPIs[randomIndex]
  const apiKey = API_KEYS[selectedAPI.index]

  console.log(
    `🎯 Randomly selected API ${selectedAPI.index + 1} (${randomIndex + 1}/${workingAPIs.length} working APIs)`,
  )
  console.log(`🔑 Selected API preview: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`)

  return {
    apiKey: apiKey,
    apiIndex: selectedAPI.index,
    details: selectedAPI.details,
  }
}

// Test single API key với Llama 4 Scout
const testSingleAPI = async (keyIndex: number): Promise<{ success: boolean; details: any }> => {
  const cacheKey = `test_${keyIndex}_${SINGLE_MODEL}`

  if (testResultsCache.has(cacheKey)) {
    console.log(`🔄 Using cached test result for API ${keyIndex + 1}`)
    return {
      success: testResultsCache.get(cacheKey)!,
      details: { cached: true, keyIndex: keyIndex + 1 },
    }
  }

  try {
    const apiKey = API_KEYS[keyIndex]
    console.log(`🧪 Testing API ${keyIndex + 1} with ${SINGLE_MODEL}`)

    const groq = createGroqClient(apiKey)
    const startTime = Date.now()

    const testCompletion = await groq.chat.completions.create({
      model: SINGLE_MODEL,
      messages: [
        {
          role: "user",
          content: "Test: Return 'OK'",
        },
      ],
      temperature: 0.1,
      max_tokens: 10,
    })

    const responseTime = Date.now() - startTime
    const response = testCompletion?.choices?.[0]?.message?.content
    const success = !!response

    // Cache result
    testResultsCache.set(cacheKey, success)

    const details = {
      keyIndex: keyIndex + 1,
      status: success ? "success" : "failed",
      response: response,
      responseTime: responseTime,
      preview: `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`,
      model: SINGLE_MODEL,
      error: success ? null : "No response content",
    }

    console.log(
      `${success ? "✅" : "❌"} API ${keyIndex + 1} ${SINGLE_MODEL}: ${success ? "OK" : "FAILED"} (${responseTime}ms)`,
    )
    if (success) {
      console.log(`🔍 Response: "${response}"`)
    }

    return { success, details }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.log(`❌ API ${keyIndex + 1} ${SINGLE_MODEL} failed: ${errorMsg}`)

    testResultsCache.set(cacheKey, false)

    const details = {
      keyIndex: keyIndex + 1,
      status: "failed",
      error: errorMsg,
      preview: `${API_KEYS[keyIndex].substring(0, 10)}...${API_KEYS[keyIndex].substring(API_KEYS[keyIndex].length - 4)}`,
      model: SINGLE_MODEL,
      response: null,
      responseTime: 0,
    }

    return { success: false, details }
  }
}

const createGroqClient = (apiKey: string): Groq => {
  return new Groq({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true,
  })
}

// 🔥 NEW: Raw JSON analysis với Llama 4 Scout
const analyzeRawJSONWithRandomAPI = async (
  jsonData: string,
  tableName: string,
  recordCount: number,
  integrityReport: string,
): Promise<{ success: boolean; analysis: string; apiDetails: any; error?: string }> => {
  try {
    console.log(`\n🚀 ===== RAW JSON ANALYSIS với ${SINGLE_MODEL} =====`)
    console.log(`📊 INPUT: ${recordCount} records`)
    console.log(`📄 JSON size: ${jsonData.length} characters`)
    console.log(`🎯 Estimated tokens: ${estimateTokens(jsonData)}`)

    const selectedAPI = await selectRandomWorkingAPI()

    if (!selectedAPI) {
      return {
        success: false,
        analysis: "❌ Không có API nào hoạt động",
        apiDetails: { error: "No working APIs" },
        error: "No working APIs available",
      }
    }

    console.log(`🎯 Using API ${selectedAPI.apiIndex + 1} for raw JSON analysis`)

    const groq = createGroqClient(selectedAPI.apiKey)

    // 🔥 NEW: Raw JSON analysis prompt
    const analysisPrompt = `Phân tích toàn bộ dữ liệu RAW JSON từ bảng "${tableName}" (${recordCount} records):

${integrityReport}

Dữ liệu JSON (giữ nguyên cấu trúc gốc từ Lark Base):
${jsonData}

Thực hiện phân tích toàn diện dựa trên RAW JSON data:

1. **Tổng quan dữ liệu:**
   - Đếm chính xác số records thực tế trong JSON
   - Liệt kê tất cả fields có trong dữ liệu
   - Đánh giá chất lượng và completeness của từng field

2. **Thống kê chi tiết từ JSON:**
   - Phân tích giá trị trong từng field (text, options, users, attachments, etc.)
   - Thống kê phân bố và frequency
   - Identify patterns và relationships

3. **Data Structure Analysis:**
   - Phân tích cấu trúc Lark Base fields (text objects, option objects, user objects, etc.)
   - Extract meaningful values từ complex objects
   - Đánh giá data consistency

4. **Business Insights:**
   - Insights quan trọng từ dữ liệu thực tế
   - Trends và patterns
   - Actionable recommendations

5. **Kết luận:**
   - Tóm tắt findings chính
   - Data quality assessment
   - Key takeaways

**QUAN TRỌNG**: 
- Phân tích dựa 100% trên dữ liệu JSON thực tế
- Không đoán mò hoặc tạo ra thông tin không có
- Đếm chính xác số records từ JSON array
- Extract values từ Lark Base object structures

Trả lời chi tiết bằng tiếng Việt với format rõ ràng:`

    const promptTokens = estimateTokens(analysisPrompt)
    console.log(`📤 Sending raw JSON analysis request: ${promptTokens} input tokens`)

    const startTime = Date.now()

    const completion = await groq.chat.completions.create({
      model: SINGLE_MODEL,
      messages: [{ role: "user", content: analysisPrompt }],
      temperature: 0.7,
      max_tokens: 4000,
    })

    const responseTime = Date.now() - startTime
    console.log(`📥 Response received (${responseTime}ms)`)

    if (!completion?.choices?.[0]?.message?.content) {
      const errorMsg = "Empty response from API"
      console.log(`❌ ${errorMsg}`)
      return {
        success: false,
        analysis: `❌ Không nhận được phản hồi từ ${SINGLE_MODEL}`,
        apiDetails: selectedAPI.details,
        error: errorMsg,
      }
    }

    const analysis = completion.choices[0].message.content.trim()
    const outputTokens = estimateTokens(analysis)

    console.log(`📊 OUTPUT: ${outputTokens} tokens`)
    console.log(`⚡ Total processing time: ${responseTime}ms`)
    console.log(`✅ SUCCESS: Analyzed ${recordCount} records with RAW JSON (no conversion loss)`)
    console.log(`📋 Analysis preview: ${analysis.substring(0, 150)}...`)
    console.log(`===== END RAW JSON ANALYSIS =====\n`)

    return {
      success: true,
      analysis: analysis,
      apiDetails: {
        ...selectedAPI.details,
        responseTime: responseTime,
        inputTokens: promptTokens,
        outputTokens: outputTokens,
        totalTokens: promptTokens + outputTokens,
      },
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`❌ Raw JSON analysis failed: ${errorMsg}`)

    return {
      success: false,
      analysis: `❌ Lỗi phân tích với ${SINGLE_MODEL}: ${errorMsg}`,
      apiDetails: { error: errorMsg },
      error: errorMsg,
    }
  }
}

// 🔥 UPDATED: Main pipeline với raw JSON (no CSV conversion)
export const preprocessDataWithPipeline = async (
  data: any[],
  tableName: string,
): Promise<{ success: boolean; optimizedData: string; analysis: string; keyUsage: any }> => {
  try {
    console.log(`🚀 Raw JSON Pipeline (NO CSV CONVERSION) với ${data.length} records - Model: ${SINGLE_MODEL}`)

    if (!API_KEYS || API_KEYS.length === 0) {
      throw new Error("Cần ít nhất 1 API key")
    }

    // 🔥 BƯỚC 1: Prepare raw JSON data (NO CSV conversion)
    console.log(`📊 BƯỚC 1: Preparing raw JSON data (bypassing CSV conversion)...`)
    const { jsonData, integrityReport, stats } = prepareRawJSONData(data)

    if (!jsonData) {
      throw new Error("Không thể tạo JSON data")
    }

    // 🔥 BƯỚC 2: Validate raw JSON integrity
    console.log(`🔍 BƯỚC 2: Validating raw JSON integrity...`)
    const integrityValidation = validateRawJSONIntegrity(data, jsonData)

    if (!integrityValidation.isValid) {
      console.warn(`⚠️ JSON integrity issues detected:`)
      integrityValidation.issues.forEach((issue) => console.warn(`  - ${issue}`))
    }

    // 🔥 BƯỚC 3: Raw JSON analysis
    console.log(`🤖 BƯỚC 3: Raw JSON analysis với random API...`)
    const analysisResult = await analyzeRawJSONWithRandomAPI(jsonData, tableName, data.length, integrityReport)

    if (!analysisResult.success) {
      console.log(`❌ Analysis failed, using raw JSON`)
      return {
        success: true,
        optimizedData: jsonData,
        analysis: analysisResult.analysis,
        keyUsage: {
          error: true,
          format: "Raw JSON",
          fallback: true,
          model: SINGLE_MODEL,
          strategy: "Raw JSON (No CSV)",
          errorDetails: analysisResult.error,
          dataIntegrity: integrityValidation,
          stats: stats,
        },
      }
    }

    // 🔥 SUCCESS: Return raw JSON results
    const keyUsage = {
      totalKeys: API_KEYS.length,
      usedAPI: analysisResult.apiDetails.keyIndex,
      selectedRandomly: true,
      totalRecords: data.length,
      processedRecords: data.length,
      dataLoss: 0, // No data loss with raw JSON
      format: "Raw JSON (No CSV Conversion)",
      model: SINGLE_MODEL,
      strategy: "Raw JSON Direct Analysis",
      responseTime: analysisResult.apiDetails.responseTime,
      inputTokens: analysisResult.apiDetails.inputTokens,
      outputTokens: analysisResult.apiDetails.outputTokens,
      totalTokens: analysisResult.apiDetails.totalTokens,
      apiPreview: analysisResult.apiDetails.preview,
      dataIntegrity: integrityValidation,
      stats: stats,
    }

    console.log(`✅ Raw JSON Pipeline Complete:`)
    console.log(`  📊 Records: ${data.length} (100% preserved - no conversion)`)
    console.log(`  🎯 API used: ${analysisResult.apiDetails.keyIndex}`)
    console.log(`  ⚡ Time: ${analysisResult.apiDetails.responseTime}ms`)
    console.log(`  🎫 Tokens: ${analysisResult.apiDetails.totalTokens}`)
    console.log(`  🔍 Data integrity: ${integrityValidation.isValid ? "✅ Valid" : "⚠️ Issues detected"}`)
    console.log(`  📄 Format: Raw JSON (no CSV conversion loss)`)

    return {
      success: true,
      optimizedData: jsonData,
      analysis: analysisResult.analysis,
      keyUsage: keyUsage,
    }
  } catch (error) {
    console.error("❌ Raw JSON Pipeline failed:", error)

    const { jsonData } = prepareRawJSONData(data)
    return {
      success: true,
      optimizedData: jsonData,
      analysis: `❌ Pipeline error với ${SINGLE_MODEL}: ${error}. Sử dụng raw JSON với ${data.length} records.`,
      keyUsage: {
        error: true,
        format: "Raw JSON",
        model: SINGLE_MODEL,
        fallback: true,
        strategy: "Raw JSON (No CSV)",
        dataIntegrity: { isValid: false, report: "Pipeline failed", issues: [String(error)] },
      },
    }
  }
}

// 🔥 UPDATED: Answer question với raw JSON
export const answerQuestionWithOptimizedData = async (
  optimizedJSONData: string,
  tableName: string,
  question: string,
  originalRecordCount: number,
): Promise<string> => {
  try {
    console.log(`🤔 Trả lời câu hỏi với raw JSON data (${originalRecordCount} records) - ${SINGLE_MODEL}`)

    const selectedAPI = await selectRandomWorkingAPI()

    if (!selectedAPI) {
      return `❌ Không có API nào hoạt động với ${SINGLE_MODEL}`
    }

    console.log(`🎯 Using API ${selectedAPI.apiIndex + 1} for question answering`)

    // Truncate JSON if too long (but keep more data than CSV)
    const maxJSONLength = 8000 // Increased for JSON
    const truncatedJSON =
      optimizedJSONData.length > maxJSONLength
        ? optimizedJSONData.substring(0, maxJSONLength) + "..."
        : optimizedJSONData

    const questionPrompt = `Dữ liệu RAW JSON từ bảng "${tableName}" (${originalRecordCount} records):

${truncatedJSON}

Câu hỏi: ${question}

Phân tích dữ liệu JSON thực tế và trả lời chi tiết bằng tiếng Việt:

1. **Trả lời trực tiếp câu hỏi** dựa trên dữ liệu JSON có sẵn
2. **Dẫn chứng cụ thể** từ JSON data (STT, recordId, field values)
3. **Extract values** từ Lark Base objects (text objects, option objects, etc.)
4. **Insights bổ sung** nếu có từ data patterns
5. **Data quality notes** nếu cần thiết

**QUAN TRỌNG**: 
- Chỉ dựa vào dữ liệu thực tế trong JSON
- Đếm chính xác từ JSON array
- Extract meaningful values từ complex Lark Base objects
- Không đoán mò hoặc tạo ra thông tin không có

Trả lời:`

    const groq = createGroqClient(selectedAPI.apiKey)
    const startTime = Date.now()

    const completion = await groq.chat.completions.create({
      model: SINGLE_MODEL,
      messages: [{ role: "user", content: questionPrompt }],
      temperature: 0.7,
      max_tokens: 2000,
    })

    const responseTime = Date.now() - startTime

    if (!completion?.choices?.[0]?.message?.content) {
      throw new Error("No response content")
    }

    const answer = completion.choices[0].message.content
    console.log(`✅ Question answered with raw JSON data (${responseTime}ms)`)

    return answer
  } catch (error) {
    console.error("❌ answerQuestionWithOptimizedData failed:", error)
    return `❌ Lỗi khi trả lời câu hỏi với ${SINGLE_MODEL}: ${error}`
  }
}

// Export functions
export const analyzeDataWithParallelKeys = preprocessDataWithPipeline

export const answerQuestionWithData = async (
  data: any[],
  tableName: string,
  question: string,
  previousAnalysis?: string,
  optimizedData?: string,
): Promise<string> => {
  try {
    if (optimizedData && optimizedData.length > 0) {
      return await answerQuestionWithOptimizedData(optimizedData, tableName, question, data.length)
    } else {
      // Use raw JSON for quick questions too
      const { jsonData } = prepareRawJSONData(data.slice(0, 30))
      return await answerQuestionWithOptimizedData(jsonData, tableName, question, data.length)
    }
  } catch (error) {
    console.error("❌ answerQuestionWithData failed:", error)
    return `❌ Lỗi khi trả lời câu hỏi: ${error}`
  }
}

export const testAllApiKeys = async (): Promise<{
  success: boolean
  message: string
  workingKeys: number
  totalKeys: number
  keyDetails: any[]
}> => {
  console.log(`🧪 Testing ${API_KEYS.length} API keys với ${SINGLE_MODEL}...`)

  const testPromises = API_KEYS.map(async (apiKey, index) => {
    try {
      const groq = createGroqClient(apiKey)
      const startTime = Date.now()

      const testCompletion = await groq.chat.completions.create({
        model: SINGLE_MODEL,
        messages: [
          {
            role: "user",
            content: "Test: Return 'OK'",
          },
        ],
        temperature: 0.1,
        max_tokens: 10,
      })

      const responseTime = Date.now() - startTime
      const response = testCompletion?.choices?.[0]?.message?.content || "No response"
      console.log(`✅ API ${index + 1}: OK (${responseTime}ms)`)

      return {
        keyIndex: index + 1,
        status: "success" as const,
        response: response,
        responseTime: responseTime,
        preview: `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`,
        model: SINGLE_MODEL,
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.log(`❌ API ${index + 1}: ${errorMsg}`)
      return {
        keyIndex: index + 1,
        status: "failed" as const,
        error: errorMsg,
        preview: `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`,
        model: SINGLE_MODEL,
        responseTime: 0,
      }
    }
  })

  const results = await Promise.all(testPromises)
  const workingKeys = results.filter((r) => r.status === "success").length

  return {
    success: workingKeys > 0,
    message: `${workingKeys}/${API_KEYS.length} API keys hoạt động với ${SINGLE_MODEL}`,
    workingKeys: workingKeys,
    totalKeys: API_KEYS.length,
    keyDetails: results,
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
    workingModel: SINGLE_MODEL,
    format: "Raw JSON (No CSV)",
  }
}

export const getAvailableModels = (): string[] => {
  return [SINGLE_MODEL]
}

export const getApiKeysInfo = () => {
  return {
    totalKeys: API_KEYS.length,
    keysPreview: API_KEYS.map(
      (key, index) => `API ${index + 1}: ${key.substring(0, 10)}...${key.substring(key.length - 4)} (${SINGLE_MODEL})`,
    ),
    format: "Raw JSON (No CSV)",
    model: SINGLE_MODEL,
  }
}

export const clearApiCache = () => {
  testResultsCache.clear()
  console.log("🔄 Cache cleared")
}
