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

// 🔥 ENHANCED: Comprehensive field extraction với data integrity protection
const extractPlainTextFromField = (value: unknown, fieldName?: string): string => {
  // 🔍 DETAILED LOGGING for debugging
  const logExtraction = (input: unknown, output: string, method: string) => {
    if (fieldName && (output === "" || output === "null" || output === "undefined")) {
      console.warn(`⚠️ Field "${fieldName}": ${method} resulted in empty output`)
      console.warn(`   Input type: ${typeof input}`)
      console.warn(`   Input value:`, input)
    }
  }

  // 1. Handle null/undefined
  if (value === null || value === undefined) {
    logExtraction(value, "", "null/undefined check")
    return ""
  }

  // 2. Handle primitive types
  if (typeof value === "string") {
    const result = value.trim()
    logExtraction(value, result, "string")
    return result
  }

  if (typeof value === "number") {
    const result = String(value)
    logExtraction(value, result, "number")
    return result
  }

  if (typeof value === "boolean") {
    const result = value ? "Yes" : "No"
    logExtraction(value, result, "boolean")
    return result
  }

  // 3. Handle Date objects
  if (value instanceof Date) {
    const result = value.toISOString()
    logExtraction(value, result, "Date object")
    return result
  }

  // 4. 🔥 COMPREHENSIVE OBJECT HANDLING
  if (typeof value === "object") {
    try {
      const jsonStr = JSON.stringify(value)

      // 🔍 Log original object for debugging
      console.log(`🔍 Processing object field "${fieldName}":`, jsonStr.substring(0, 200))

      // Handle empty/null objects
      if (jsonStr === "null" || jsonStr === "{}" || jsonStr === "[]") {
        logExtraction(value, "", "empty object")
        return ""
      }

      // 🔥 PATTERN 1: Lark Base Text Objects
      // Format: [{"type":"text","text":"Intel Pentium"}] or {"type":"text","text":"value"}
      if (jsonStr.includes('"type":"text"') && jsonStr.includes('"text":')) {
        const textMatches = jsonStr.match(/"text":"([^"]*(?:\\.[^"]*)*)"/g)
        if (textMatches) {
          const texts = textMatches
            .map((match) => {
              const textMatch = match.match(/"text":"([^"]*(?:\\.[^"]*)*)"/)
              return textMatch ? textMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\") : ""
            })
            .filter((text) => text.length > 0)

          if (texts.length > 0) {
            const result = texts.join(", ")
            console.log(`✅ Extracted text objects: "${result}"`)
            logExtraction(value, result, "text objects")
            return result
          }
        }
      }

      // 🔥 PATTERN 2: Lark Base Option Objects
      // Format: {"id":"optr5hYAsF","text":"SSD-128"} or [{"id":"opt1","text":"Value1"}]
      if (jsonStr.includes('"text":') && (jsonStr.includes('"id":') || jsonStr.includes('"color":'))) {
        const textMatches = jsonStr.match(/"text":"([^"]*(?:\\.[^"]*)*)"/g)
        if (textMatches) {
          const texts = textMatches
            .map((match) => {
              const textMatch = match.match(/"text":"([^"]*(?:\\.[^"]*)*)"/)
              return textMatch ? textMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\") : ""
            })
            .filter((text) => text.length > 0)

          if (texts.length > 0) {
            const result = texts.join(", ")
            console.log(`✅ Extracted option objects: "${result}"`)
            logExtraction(value, result, "option objects")
            return result
          }
        }
      }

      // 🔥 PATTERN 3: Lark Base User Objects
      // Format: {"id":"user123","name":"John Doe","email":"john@example.com"}
      if (jsonStr.includes('"name":') && (jsonStr.includes('"id":') || jsonStr.includes('"email":'))) {
        const nameMatches = jsonStr.match(/"name":"([^"]*(?:\\.[^"]*)*)"/g)
        if (nameMatches) {
          const names = nameMatches
            .map((match) => {
              const nameMatch = match.match(/"name":"([^"]*(?:\\.[^"]*)*)"/)
              return nameMatch ? nameMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\") : ""
            })
            .filter((name) => name.length > 0)

          if (names.length > 0) {
            const result = names.join(", ")
            console.log(`✅ Extracted user objects: "${result}"`)
            logExtraction(value, result, "user objects")
            return result
          }
        }
      }

      // 🔥 PATTERN 4: Lark Base Attachment Objects
      // Format: {"name":"file.pdf","url":"https://...","size":1024}
      if (jsonStr.includes('"name":') && (jsonStr.includes('"url":') || jsonStr.includes('"size":'))) {
        const nameMatches = jsonStr.match(/"name":"([^"]*(?:\\.[^"]*)*)"/g)
        if (nameMatches) {
          const names = nameMatches
            .map((match) => {
              const nameMatch = match.match(/"name":"([^"]*(?:\\.[^"]*)*)"/)
              return nameMatch ? nameMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\") : ""
            })
            .filter((name) => name.length > 0)

          if (names.length > 0) {
            const result = names.join(", ")
            console.log(`✅ Extracted attachment objects: "${result}"`)
            logExtraction(value, result, "attachment objects")
            return result
          }
        }
      }

      // 🔥 PATTERN 5: Lark Base Link Objects
      // Format: {"text":"Display Text","link":"https://example.com"}
      if (jsonStr.includes('"link":') && jsonStr.includes('"text":')) {
        const linkData = []
        const textMatches = jsonStr.match(/"text":"([^"]*(?:\\.[^"]*)*)"/g)
        const linkMatches = jsonStr.match(/"link":"([^"]*(?:\\.[^"]*)*)"/g)

        if (textMatches && linkMatches) {
          const texts = textMatches.map((match) => {
            const textMatch = match.match(/"text":"([^"]*(?:\\.[^"]*)*)"/)
            return textMatch ? textMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\") : ""
          })
          const links = linkMatches.map((match) => {
            const linkMatch = match.match(/"link":"([^"]*(?:\\.[^"]*)*)"/)
            return linkMatch ? linkMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\") : ""
          })

          for (let i = 0; i < Math.max(texts.length, links.length); i++) {
            const text = texts[i] || ""
            const link = links[i] || ""
            if (text || link) {
              linkData.push(text ? `${text} (${link})` : link)
            }
          }
        }

        if (linkData.length > 0) {
          const result = linkData.join(", ")
          console.log(`✅ Extracted link objects: "${result}"`)
          logExtraction(value, result, "link objects")
          return result
        }
      }

      // 🔥 PATTERN 6: Arrays of primitive values
      if (Array.isArray(value)) {
        const arrayValues = value
          .map((item) => extractPlainTextFromField(item, `${fieldName}[array_item]`))
          .filter((item) => item && item.trim() !== "")

        if (arrayValues.length > 0) {
          const result = arrayValues.join(", ")
          console.log(`✅ Extracted array values: "${result}"`)
          logExtraction(value, result, "array values")
          return result
        }
      }

      // 🔥 PATTERN 7: Generic object with valuable properties
      // Extract all string/number values from object
      const extractObjectValues = (obj: any, prefix = ""): string[] => {
        const values: string[] = []

        for (const [key, val] of Object.entries(obj)) {
          if (val === null || val === undefined) continue

          if (typeof val === "string" && val.trim() !== "") {
            values.push(val.trim())
          } else if (typeof val === "number") {
            values.push(String(val))
          } else if (typeof val === "boolean") {
            values.push(val ? "Yes" : "No")
          } else if (typeof val === "object" && val !== null) {
            // Recursive extraction for nested objects
            const nestedValues = extractObjectValues(val, `${prefix}${key}.`)
            values.push(...nestedValues)
          }
        }

        return values
      }

      const objectValues = extractObjectValues(value)
      if (objectValues.length > 0) {
        const result = objectValues.join(", ")
        console.log(`✅ Extracted object values: "${result}"`)
        logExtraction(value, result, "generic object")
        return result
      }

      // 🔥 FALLBACK: Return formatted JSON if no patterns match
      const fallbackResult = jsonStr.length > 200 ? jsonStr.substring(0, 200) + "..." : jsonStr
      console.warn(`⚠️ Using fallback JSON for field "${fieldName}": ${fallbackResult}`)
      logExtraction(value, fallbackResult, "fallback JSON")
      return fallbackResult
    } catch (error) {
      console.error(`❌ Error parsing field "${fieldName}":`, error)
      console.error(`   Original value:`, value)

      // 🔥 EMERGENCY FALLBACK: Convert to string
      const emergencyResult = String(value).substring(0, 100)
      logExtraction(value, emergencyResult, "emergency fallback")
      return emergencyResult
    }
  }

  // 🔥 FINAL FALLBACK for unknown types
  const finalResult = String(value).substring(0, 100)
  console.warn(`⚠️ Unknown type for field "${fieldName}": ${typeof value}`)
  logExtraction(value, finalResult, "final fallback")
  return finalResult
}

// 🔥 ENHANCED: CSV Conversion với data integrity validation
const convertToCSV = (data: Array<{ recordId: string; fields: Record<string, unknown> }>): string => {
  if (data.length === 0) return ""

  console.log(`📊 ===== ENHANCED CSV CONVERSION với DATA INTEGRITY =====`)
  console.log(`📊 Converting ${data.length} records to CSV format...`)

  // 🔍 STEP 1: Analyze all fields across all records
  const allFieldNames = new Set<string>()
  const fieldValueSamples: Record<string, unknown[]> = {}
  const fieldStats: Record<string, { totalValues: number; emptyValues: number; uniqueTypes: Set<string> }> = {}

  data.forEach((record, recordIndex) => {
    Object.entries(record.fields).forEach(([fieldName, fieldValue]) => {
      allFieldNames.add(fieldName)

      // Collect samples for analysis
      if (!fieldValueSamples[fieldName]) {
        fieldValueSamples[fieldName] = []
        fieldStats[fieldName] = { totalValues: 0, emptyValues: 0, uniqueTypes: new Set() }
      }

      fieldValueSamples[fieldName].push(fieldValue)
      fieldStats[fieldName].totalValues++
      fieldStats[fieldName].uniqueTypes.add(typeof fieldValue)

      if (fieldValue === null || fieldValue === undefined || fieldValue === "") {
        fieldStats[fieldName].emptyValues++
      }

      // Log first few samples for debugging
      if (fieldValueSamples[fieldName].length <= 3) {
        console.log(`🔍 Field "${fieldName}" sample ${fieldValueSamples[fieldName].length}:`, fieldValue)
      }
    })
  })

  const fieldNames = Array.from(allFieldNames).sort()
  console.log(`📋 Found ${fieldNames.length} unique fields:`, fieldNames)

  // 🔍 STEP 2: Analyze field quality
  console.log(`📊 Field Quality Analysis:`)
  fieldNames.forEach((fieldName) => {
    const stats = fieldStats[fieldName]
    const fillRate = (((stats.totalValues - stats.emptyValues) / stats.totalValues) * 100).toFixed(1)
    const types = Array.from(stats.uniqueTypes).join(", ")
    console.log(`  "${fieldName}": ${stats.totalValues} values, ${fillRate}% filled, types: ${types}`)
  })

  // 🔍 STEP 3: Create consistent headers
  const headers = ["STT", ...fieldNames]
  const csvHeaders = headers.join(",")

  // 🔍 STEP 4: Convert records với comprehensive extraction
  let totalExtractedValues = 0
  let totalEmptyValues = 0
  let extractionErrors = 0

  const csvRows = data.map((record, recordIndex) => {
    const values = [
      String(recordIndex + 1), // STT
      ...fieldNames.map((fieldName) => {
        const rawValue = record.fields[fieldName]

        try {
          const cleanValue = extractPlainTextFromField(rawValue, fieldName)

          if (!cleanValue || cleanValue.trim() === "") {
            totalEmptyValues++
            return ""
          }

          totalExtractedValues++

          // 🔥 PROPER CSV ESCAPING
          if (
            cleanValue.includes(",") ||
            cleanValue.includes('"') ||
            cleanValue.includes("\n") ||
            cleanValue.includes("\r")
          ) {
            return `"${cleanValue.replace(/"/g, '""')}"`
          }

          return cleanValue
        } catch (error) {
          extractionErrors++
          console.error(`❌ Extraction error for record ${recordIndex + 1}, field "${fieldName}":`, error)
          return `ERROR: ${error}`
        }
      }),
    ]

    return values.join(",")
  })

  const csvContent = [csvHeaders, ...csvRows].join("\n")

  // 🔍 STEP 5: Data integrity validation
  const originalJsonSize = JSON.stringify(data).length
  const csvSize = csvContent.length
  const compressionRatio = Math.round((1 - csvSize / originalJsonSize) * 100)

  const totalPossibleValues = data.length * fieldNames.length
  const dataIntegrityRate = ((totalExtractedValues / totalPossibleValues) * 100).toFixed(1)

  console.log(`✅ ===== CSV CONVERSION COMPLETE =====`)
  console.log(`📊 Records: ${data.length}`)
  console.log(`📋 Fields: ${fieldNames.length}`)
  console.log(`📄 Total columns: ${headers.length}`)
  console.log(`📄 Original JSON: ${originalJsonSize} chars`)
  console.log(`📄 Final CSV: ${csvSize} chars`)
  console.log(`🎯 Compression: ${compressionRatio}% smaller`)
  console.log(`🎯 Estimated tokens: ${estimateTokens(csvContent)}`)
  console.log(``)
  console.log(`🔍 DATA INTEGRITY REPORT:`)
  console.log(`  📊 Total possible values: ${totalPossibleValues}`)
  console.log(`  ✅ Successfully extracted: ${totalExtractedValues}`)
  console.log(`  ⚪ Empty values: ${totalEmptyValues}`)
  console.log(`  ❌ Extraction errors: ${extractionErrors}`)
  console.log(`  🎯 Data integrity rate: ${dataIntegrityRate}%`)

  if (Number.parseFloat(dataIntegrityRate) < 70) {
    console.warn(`⚠️ LOW DATA INTEGRITY: Only ${dataIntegrityRate}% of data extracted successfully!`)
  } else {
    console.log(`✅ GOOD DATA INTEGRITY: ${dataIntegrityRate}% extraction success rate`)
  }

  console.log(`===============================================`)

  return csvContent
}

// 🔥 ENHANCED: Data integrity validation function
const validateDataIntegrity = (
  originalData: Array<{ recordId: string; fields: Record<string, unknown> }>,
  csvContent: string,
): { isValid: boolean; report: string; issues: string[] } => {
  const issues: string[] = []

  try {
    const csvLines = csvContent.trim().split("\n")
    const headerLine = csvLines[0]
    const dataLines = csvLines.slice(1)

    // Check record count
    if (dataLines.length !== originalData.length) {
      issues.push(`Record count mismatch: Expected ${originalData.length}, got ${dataLines.length}`)
    }

    // Check field count
    const csvHeaders = headerLine.split(",")
    const originalFieldCount = new Set<string>()
    originalData.forEach((record) => {
      Object.keys(record.fields).forEach((field) => originalFieldCount.add(field))
    })

    const expectedFieldCount = originalFieldCount.size + 1 // +1 for STT column
    if (csvHeaders.length !== expectedFieldCount) {
      issues.push(`Field count mismatch: Expected ${expectedFieldCount}, got ${csvHeaders.length}`)
    }

    // Check for empty rows
    const emptyRows = dataLines.filter(
      (line) => line.trim() === "" || line.split(",").every((cell) => cell.trim() === ""),
    ).length
    if (emptyRows > 0) {
      issues.push(`Found ${emptyRows} completely empty rows`)
    }

    // Check data density
    const totalCells = dataLines.length * csvHeaders.length
    const emptyCells = dataLines.reduce((count, line) => {
      return count + line.split(",").filter((cell) => cell.trim() === "").length
    }, 0)

    const dataDensity = (((totalCells - emptyCells) / totalCells) * 100).toFixed(1)
    if (Number.parseFloat(dataDensity) < 50) {
      issues.push(`Low data density: Only ${dataDensity}% of cells contain data`)
    }

    const report = `
📊 Data Integrity Validation Report:
  ✅ Records: ${dataLines.length}/${originalData.length}
  ✅ Fields: ${csvHeaders.length}/${expectedFieldCount}
  ✅ Data density: ${dataDensity}%
  ✅ Empty rows: ${emptyRows}
  ${issues.length === 0 ? "✅ All checks passed!" : `⚠️ ${issues.length} issues found`}
    `

    return {
      isValid: issues.length === 0,
      report: report,
      issues: issues,
    }
  } catch (error) {
    const errorMsg = `Validation error: ${error}`
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

// 🔥 ENHANCED: Single request analysis với data integrity validation
const analyzeFullCSVWithRandomAPI = async (
  csvContent: string,
  tableName: string,
  recordCount: number,
  dataIntegrityReport: string,
): Promise<{ success: boolean; analysis: string; apiDetails: any; error?: string }> => {
  try {
    console.log(`\n🚀 ===== ENHANCED SINGLE REQUEST ANALYSIS =====`)
    console.log(`📊 INPUT: ${recordCount} records`)
    console.log(`📄 CSV size: ${csvContent.length} characters`)
    console.log(`🎯 Estimated tokens: ${estimateTokens(csvContent)}`)

    const selectedAPI = await selectRandomWorkingAPI()

    if (!selectedAPI) {
      return {
        success: false,
        analysis: "❌ Không có API nào hoạt động",
        apiDetails: { error: "No working APIs" },
        error: "No working APIs available",
      }
    }

    console.log(`🎯 Using API ${selectedAPI.apiIndex + 1} for analysis`)

    const groq = createGroqClient(selectedAPI.apiKey)

    // 🔥 ENHANCED: Analysis prompt với data integrity context
    const analysisPrompt = `Phân tích toàn bộ dữ liệu CSV từ bảng "${tableName}" (${recordCount} records):

${dataIntegrityReport}

${csvContent}

Thực hiện phân tích toàn diện với focus vào data integrity:

1. **Tổng quan dữ liệu:**
   - Số lượng records và fields thực tế
   - Chất lượng dữ liệu và completeness
   - Các field có giá trị và field trống

2. **Thống kê chi tiết:**
   - Phân bố theo các trường quan trọng
   - Giá trị phổ biến và unique values
   - Patterns và trends trong dữ liệu

3. **Data Quality Assessment:**
   - Fields nào có data đầy đủ nhất
   - Fields nào bị thiếu data nhiều
   - Consistency của dữ liệu

4. **Insights quan trọng:**
   - Phát hiện thú vị từ dữ liệu complete
   - Mối quan hệ giữa các trường
   - Business insights và recommendations

5. **Kết luận:**
   - Tóm tắt findings chính
   - Data reliability assessment
   - Actionable insights

Lưu ý: Tập trung vào dữ liệu thực tế có trong CSV, không đoán mò hoặc tạo ra thông tin không có.

Trả lời chi tiết bằng tiếng Việt với format rõ ràng:`

    const promptTokens = estimateTokens(analysisPrompt)
    console.log(`📤 Sending enhanced analysis request: ${promptTokens} input tokens`)

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
    console.log(`✅ SUCCESS: Analyzed ${recordCount} records with enhanced data integrity`)
    console.log(`📋 Analysis preview: ${analysis.substring(0, 150)}...`)
    console.log(`===== END ENHANCED ANALYSIS =====\n`)

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
    console.error(`❌ Enhanced analysis failed: ${errorMsg}`)

    return {
      success: false,
      analysis: `❌ Lỗi phân tích với ${SINGLE_MODEL}: ${errorMsg}`,
      apiDetails: { error: errorMsg },
      error: errorMsg,
    }
  }
}

// 🔥 UPDATED: Main pipeline với enhanced data integrity
export const preprocessDataWithPipeline = async (
  data: any[],
  tableName: string,
): Promise<{ success: boolean; optimizedData: string; analysis: string; keyUsage: any }> => {
  try {
    console.log(`🚀 Enhanced Single Request Pipeline với ${data.length} records - Model: ${SINGLE_MODEL}`)

    if (!API_KEYS || API_KEYS.length === 0) {
      throw new Error("Cần ít nhất 1 API key")
    }

    // 🔥 BƯỚC 1: Enhanced CSV conversion với data integrity
    console.log(`📊 BƯỚC 1: Enhanced CSV conversion với data integrity validation...`)
    const fullCSV = convertToCSV(data)

    if (!fullCSV) {
      throw new Error("Không thể tạo CSV content")
    }

    // 🔥 BƯỚC 2: Validate data integrity
    console.log(`🔍 BƯỚC 2: Validating data integrity...`)
    const integrityValidation = validateDataIntegrity(data, fullCSV)

    if (!integrityValidation.isValid) {
      console.warn(`⚠️ Data integrity issues detected:`)
      integrityValidation.issues.forEach((issue) => console.warn(`  - ${issue}`))
    }

    // 🔥 BƯỚC 3: Enhanced analysis với data integrity context
    console.log(`🤖 BƯỚC 3: Enhanced analysis với data integrity context...`)
    const analysisResult = await analyzeFullCSVWithRandomAPI(
      fullCSV,
      tableName,
      data.length,
      integrityValidation.report,
    )

    if (!analysisResult.success) {
      console.log(`❌ Analysis failed, using raw CSV`)
      return {
        success: true,
        optimizedData: fullCSV,
        analysis: analysisResult.analysis,
        keyUsage: {
          error: true,
          format: "Raw CSV",
          fallback: true,
          model: SINGLE_MODEL,
          strategy: "Enhanced Single Request",
          errorDetails: analysisResult.error,
          dataIntegrity: integrityValidation,
        },
      }
    }

    // 🔥 SUCCESS: Return enhanced results
    const keyUsage = {
      totalKeys: API_KEYS.length,
      usedAPI: analysisResult.apiDetails.keyIndex,
      selectedRandomly: true,
      totalRecords: data.length,
      processedRecords: data.length,
      dataLoss: 0,
      format: "Enhanced CSV",
      model: SINGLE_MODEL,
      strategy: "Enhanced Single Request with Data Integrity",
      responseTime: analysisResult.apiDetails.responseTime,
      inputTokens: analysisResult.apiDetails.inputTokens,
      outputTokens: analysisResult.apiDetails.outputTokens,
      totalTokens: analysisResult.apiDetails.totalTokens,
      apiPreview: analysisResult.apiDetails.preview,
      dataIntegrity: integrityValidation,
    }

    console.log(`✅ Enhanced Single Request Pipeline Complete:`)
    console.log(`  📊 Records: ${data.length} (100% processed)`)
    console.log(`  🎯 API used: ${analysisResult.apiDetails.keyIndex}`)
    console.log(`  ⚡ Time: ${analysisResult.apiDetails.responseTime}ms`)
    console.log(`  🎫 Tokens: ${analysisResult.apiDetails.totalTokens}`)
    console.log(`  🔍 Data integrity: ${integrityValidation.isValid ? "✅ Valid" : "⚠️ Issues detected"}`)

    return {
      success: true,
      optimizedData: fullCSV,
      analysis: analysisResult.analysis,
      keyUsage: keyUsage,
    }
  } catch (error) {
    console.error("❌ Enhanced Single Request Pipeline failed:", error)

    const rawCSV = convertToCSV(data)
    return {
      success: true,
      optimizedData: rawCSV,
      analysis: `❌ Pipeline error với ${SINGLE_MODEL}: ${error}. Sử dụng raw CSV với ${data.length} records.`,
      keyUsage: {
        error: true,
        format: "Raw CSV",
        model: SINGLE_MODEL,
        fallback: true,
        strategy: "Enhanced Single Request",
        dataIntegrity: { isValid: false, report: "Pipeline failed", issues: [String(error)] },
      },
    }
  }
}

// Rest of the functions remain the same...
export const answerQuestionWithOptimizedData = async (
  optimizedCSVData: string,
  tableName: string,
  question: string,
  originalRecordCount: number,
): Promise<string> => {
  try {
    console.log(`🤔 Trả lời câu hỏi với enhanced CSV data (${originalRecordCount} records) - ${SINGLE_MODEL}`)

    const selectedAPI = await selectRandomWorkingAPI()

    if (!selectedAPI) {
      return `❌ Không có API nào hoạt động với ${SINGLE_MODEL}`
    }

    console.log(`🎯 Using API ${selectedAPI.apiIndex + 1} for question answering`)

    const maxCSVLength = 6000
    const truncatedCSV =
      optimizedCSVData.length > maxCSVLength ? optimizedCSVData.substring(0, maxCSVLength) + "..." : optimizedCSVData

    const questionPrompt = `Dữ liệu từ bảng "${tableName}" (${originalRecordCount} records) với enhanced data integrity:

${truncatedCSV}

Câu hỏi: ${question}

Phân tích dữ liệu thực tế và trả lời chi tiết bằng tiếng Việt với:
1. Trả lời trực tiếp câu hỏi dựa trên dữ liệu có sẵn
2. Dẫn chứng cụ thể từ CSV data
3. Insights bổ sung nếu có
4. Lưu ý về data quality nếu cần

Chỉ dựa vào dữ liệu thực tế trong CSV, không đoán mò:

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
    console.log(`✅ Question answered with enhanced data integrity (${responseTime}ms)`)

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
      const quickCSV = convertToCSV(data.slice(0, 30))
      return await answerQuestionWithOptimizedData(quickCSV, tableName, question, data.length)
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
    format: "Enhanced Single Request CSV",
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
    format: "Enhanced Single Request CSV",
    model: SINGLE_MODEL,
  }
}

export const clearApiCache = () => {
  testResultsCache.clear()
  console.log("🔄 Cache cleared")
}
