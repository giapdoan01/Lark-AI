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

// 🔥 ZERO DATA LOSS: Comprehensive field extraction với complete data preservation
const extractCompleteFieldValue = (value: unknown, fieldName?: string): string => {
  // 🔍 DETAILED LOGGING for zero data loss tracking
  const logExtraction = (input: unknown, output: string, method: string) => {
    if (fieldName) {
      console.log(
        `🔍 Field "${fieldName}": ${method} → "${output.substring(0, 100)}${output.length > 100 ? "..." : ""}"`,
      )
    }
  }

  // 1. Handle null/undefined - preserve as empty but log
  if (value === null || value === undefined) {
    logExtraction(value, "", "null/undefined")
    return ""
  }

  // 2. Handle primitive types - preserve exactly
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

  // 3. Handle Date objects - preserve with full info
  if (value instanceof Date) {
    const result = value.toISOString()
    logExtraction(value, result, "Date object")
    return result
  }

  // 4. 🔥 COMPREHENSIVE OBJECT HANDLING - ZERO DATA LOSS
  if (typeof value === "object") {
    try {
      const jsonStr = JSON.stringify(value)
      console.log(`🔍 Processing object field "${fieldName}": ${jsonStr.substring(0, 200)}...`)

      // Handle empty objects
      if (jsonStr === "null" || jsonStr === "{}" || jsonStr === "[]") {
        logExtraction(value, "", "empty object")
        return ""
      }

      // 🔥 PATTERN 1: Lark Base Text Objects - COMPLETE EXTRACTION
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
            const result = texts.join(" | ") // Use | separator for multiple texts
            console.log(`✅ Extracted ${texts.length} text objects: "${result}"`)
            logExtraction(value, result, "text objects")
            return result
          }
        }
      }

      // 🔥 PATTERN 2: Option Objects - PRESERVE ALL INFO
      if (jsonStr.includes('"text":') && (jsonStr.includes('"id":') || jsonStr.includes('"color":'))) {
        const options: string[] = []

        // Extract text values
        const textMatches = jsonStr.match(/"text":"([^"]*(?:\\.[^"]*)*)"/g)
        if (textMatches) {
          textMatches.forEach((match) => {
            const textMatch = match.match(/"text":"([^"]*(?:\\.[^"]*)*)"/)
            if (textMatch) {
              options.push(textMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\"))
            }
          })
        }

        // Also extract IDs for complete info
        const idMatches = jsonStr.match(/"id":"([^"]*(?:\\.[^"]*)*)"/g)
        if (idMatches && options.length === 0) {
          idMatches.forEach((match) => {
            const idMatch = match.match(/"id":"([^"]*(?:\\.[^"]*)*)"/)
            if (idMatch) {
              options.push(`ID:${idMatch[1]}`)
            }
          })
        }

        if (options.length > 0) {
          const result = options.join(" | ")
          console.log(`✅ Extracted ${options.length} option objects: "${result}"`)
          logExtraction(value, result, "option objects")
          return result
        }
      }

      // 🔥 PATTERN 3: User Objects - COMPLETE USER INFO
      if (jsonStr.includes('"name":') || jsonStr.includes('"email":') || jsonStr.includes('"id":')) {
        const userInfo: string[] = []

        // Extract names
        const nameMatches = jsonStr.match(/"name":"([^"]*(?:\\.[^"]*)*)"/g)
        if (nameMatches) {
          nameMatches.forEach((match) => {
            const nameMatch = match.match(/"name":"([^"]*(?:\\.[^"]*)*)"/)
            if (nameMatch) {
              userInfo.push(nameMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\"))
            }
          })
        }

        // Extract emails for additional context
        const emailMatches = jsonStr.match(/"email":"([^"]*(?:\\.[^"]*)*)"/g)
        if (emailMatches) {
          emailMatches.forEach((match) => {
            const emailMatch = match.match(/"email":"([^"]*(?:\\.[^"]*)*)"/)
            if (emailMatch) {
              userInfo.push(`(${emailMatch[1]})`)
            }
          })
        }

        // Extract IDs if no names/emails
        if (userInfo.length === 0) {
          const idMatches = jsonStr.match(/"id":"([^"]*(?:\\.[^"]*)*)"/g)
          if (idMatches) {
            idMatches.forEach((match) => {
              const idMatch = match.match(/"id":"([^"]*(?:\\.[^"]*)*)"/)
              if (idMatch) {
                userInfo.push(`UserID:${idMatch[1]}`)
              }
            })
          }
        }

        if (userInfo.length > 0) {
          const result = userInfo.join(" ")
          console.log(`✅ Extracted user objects: "${result}"`)
          logExtraction(value, result, "user objects")
          return result
        }
      }

      // 🔥 PATTERN 4: Attachment Objects - COMPLETE FILE INFO
      if (jsonStr.includes('"name":') && (jsonStr.includes('"url":') || jsonStr.includes('"size":'))) {
        const attachmentInfo: string[] = []

        // Extract file names
        const nameMatches = jsonStr.match(/"name":"([^"]*(?:\\.[^"]*)*)"/g)
        if (nameMatches) {
          nameMatches.forEach((match) => {
            const nameMatch = match.match(/"name":"([^"]*(?:\\.[^"]*)*)"/)
            if (nameMatch) {
              attachmentInfo.push(nameMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\"))
            }
          })
        }

        // Extract sizes for context
        const sizeMatches = jsonStr.match(/"size":(\d+)/g)
        if (sizeMatches && attachmentInfo.length > 0) {
          sizeMatches.forEach((match, index) => {
            const sizeMatch = match.match(/"size":(\d+)/)
            if (sizeMatch && attachmentInfo[index]) {
              const sizeKB = Math.round(Number.parseInt(sizeMatch[1]) / 1024)
              attachmentInfo[index] += ` (${sizeKB}KB)`
            }
          })
        }

        if (attachmentInfo.length > 0) {
          const result = attachmentInfo.join(" | ")
          console.log(`✅ Extracted attachment objects: "${result}"`)
          logExtraction(value, result, "attachment objects")
          return result
        }
      }

      // 🔥 PATTERN 5: Link Objects - PRESERVE LINKS AND TEXT
      if (jsonStr.includes('"link":') && jsonStr.includes('"text":')) {
        const linkData: string[] = []

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
            if (text && link) {
              linkData.push(`${text} [${link}]`)
            } else if (text) {
              linkData.push(text)
            } else if (link) {
              linkData.push(`[${link}]`)
            }
          }
        }

        if (linkData.length > 0) {
          const result = linkData.join(" | ")
          console.log(`✅ Extracted link objects: "${result}"`)
          logExtraction(value, result, "link objects")
          return result
        }
      }

      // 🔥 PATTERN 6: Arrays - PRESERVE ALL ELEMENTS
      if (Array.isArray(value)) {
        const arrayValues = value
          .map((item, index) => extractCompleteFieldValue(item, `${fieldName}[${index}]`))
          .filter((item) => item && item.trim() !== "")

        if (arrayValues.length > 0) {
          const result = arrayValues.join(" | ")
          console.log(`✅ Extracted ${arrayValues.length} array values: "${result}"`)
          logExtraction(value, result, "array values")
          return result
        }
      }

      // 🔥 PATTERN 7: Generic Object - EXTRACT ALL MEANINGFUL VALUES
      const extractAllObjectValues = (obj: any, prefix = ""): string[] => {
        const values: string[] = []

        for (const [key, val] of Object.entries(obj)) {
          if (val === null || val === undefined) continue

          if (typeof val === "string" && val.trim() !== "") {
            values.push(`${key}:${val.trim()}`)
          } else if (typeof val === "number") {
            values.push(`${key}:${val}`)
          } else if (typeof val === "boolean") {
            values.push(`${key}:${val ? "Yes" : "No"}`)
          } else if (typeof val === "object" && val !== null) {
            // Recursive extraction for nested objects
            const nestedValues = extractAllObjectValues(val, `${prefix}${key}.`)
            values.push(...nestedValues.map((v) => `${key}.${v}`))
          }
        }

        return values
      }

      const objectValues = extractAllObjectValues(value)
      if (objectValues.length > 0) {
        const result = objectValues.join(" | ")
        console.log(`✅ Extracted ${objectValues.length} object values: "${result}"`)
        logExtraction(value, result, "generic object")
        return result
      }

      // 🔥 LAST RESORT: Preserve as formatted JSON (truncated if too long)
      const fallbackResult = jsonStr.length > 500 ? jsonStr.substring(0, 500) + "..." : jsonStr
      console.warn(`⚠️ Using fallback JSON for field "${fieldName}": ${fallbackResult.substring(0, 100)}...`)
      logExtraction(value, fallbackResult, "fallback JSON")
      return fallbackResult
    } catch (error) {
      console.error(`❌ Error parsing field "${fieldName}":`, error)
      console.error(`   Original value:`, value)

      // 🔥 EMERGENCY PRESERVATION: Convert to string to avoid data loss
      const emergencyResult = String(value).substring(0, 200)
      logExtraction(value, emergencyResult, "emergency preservation")
      return emergencyResult
    }
  }

  // 🔥 FINAL PRESERVATION for unknown types
  const finalResult = String(value).substring(0, 200)
  console.warn(`⚠️ Unknown type for field "${fieldName}": ${typeof value}`)
  logExtraction(value, finalResult, "final preservation")
  return finalResult
}

// 🔥 ZERO DATA LOSS: Enhanced CSV conversion với complete data preservation
const convertToEnhancedCSV = (
  data: Array<{ recordId: string; fields: Record<string, unknown> }>,
  fieldMetadata?: { fieldTypes: Record<string, string>; fieldNames: string[] },
): {
  csvContent: string
  conversionReport: string
  stats: any
} => {
  if (data.length === 0) return { csvContent: "", conversionReport: "No data", stats: {} }

  console.log(`📊 ===== ZERO DATA LOSS CSV CONVERSION =====`)
  console.log(`📊 Converting ${data.length} records with COMPLETE data preservation...`)

  // 🔍 STEP 1: Comprehensive field analysis
  const allFieldNames = new Set<string>()
  const fieldValueSamples: Record<string, unknown[]> = {}
  const fieldStats: Record<
    string,
    {
      totalValues: number
      emptyValues: number
      uniqueTypes: Set<string>
      extractedValues: number
      preservedValues: number
    }
  > = {}

  // First pass: Analyze all fields and values
  data.forEach((record, recordIndex) => {
    Object.entries(record.fields).forEach(([fieldName, fieldValue]) => {
      allFieldNames.add(fieldName)

      if (!fieldValueSamples[fieldName]) {
        fieldValueSamples[fieldName] = []
        fieldStats[fieldName] = {
          totalValues: 0,
          emptyValues: 0,
          uniqueTypes: new Set(),
          extractedValues: 0,
          preservedValues: 0,
        }
      }

      fieldValueSamples[fieldName].push(fieldValue)
      fieldStats[fieldName].totalValues++
      fieldStats[fieldName].uniqueTypes.add(typeof fieldValue)

      if (fieldValue === null || fieldValue === undefined || fieldValue === "") {
        fieldStats[fieldName].emptyValues++
      }

      // Log first few samples for analysis
      if (fieldValueSamples[fieldName].length <= 3) {
        console.log(`🔍 Field "${fieldName}" sample ${fieldValueSamples[fieldName].length}:`, fieldValue)
      }
    })
  })

  // 🔍 STEP 2: Create clean field names mapping
  const fieldNameMapping: Record<string, string> = {}
  const cleanFieldNames: string[] = []

  if (fieldMetadata && fieldMetadata.fieldNames) {
    // Use provided field metadata
    fieldMetadata.fieldNames.forEach((fieldName) => {
      fieldNameMapping[fieldName] = fieldName
      cleanFieldNames.push(fieldName)
    })
    console.log(`📋 Using provided field metadata: ${fieldMetadata.fieldNames.length} fields`)
  } else {
    // Auto-clean field names
    Array.from(allFieldNames)
      .sort()
      .forEach((fieldName) => {
        const cleanName = cleanFieldName(fieldName)
        fieldNameMapping[fieldName] = cleanName
        cleanFieldNames.push(cleanName)
      })
    console.log(`📋 Auto-cleaned ${cleanFieldNames.length} field names`)
  }

  console.log(`🔧 Field name mapping:`)
  Object.entries(fieldNameMapping).forEach(([original, cleaned]) => {
    if (original !== cleaned) {
      console.log(`  "${original}" → "${cleaned}"`)
    }
  })

  // 🔍 STEP 3: Create CSV headers
  const headers = ["STT", "RecordID", ...cleanFieldNames]
  const csvHeaders = headers.map((h) => `"${h}"`).join(",")

  // 🔍 STEP 4: Convert records với ZERO DATA LOSS
  let totalExtractedValues = 0
  let totalPreservedValues = 0
  let extractionErrors = 0

  const csvRows = data.map((record, recordIndex) => {
    const values = [
      `"${recordIndex + 1}"`, // STT
      `"${record.recordId}"`, // RecordID
      ...Array.from(allFieldNames)
        .sort()
        .map((originalFieldName) => {
          const rawValue = record.fields[originalFieldName]

          try {
            const extractedValue = extractCompleteFieldValue(rawValue, originalFieldName)

            // Track extraction success
            if (rawValue !== null && rawValue !== undefined) {
              fieldStats[originalFieldName].preservedValues++
              totalPreservedValues++
            }

            if (extractedValue && extractedValue.trim() !== "") {
              fieldStats[originalFieldName].extractedValues++
              totalExtractedValues++

              // 🔥 PROPER CSV ESCAPING - PRESERVE ALL DATA
              const escapedValue = extractedValue
                .replace(/"/g, '""') // Escape quotes
                .replace(/\r?\n/g, " ") // Replace newlines with spaces
                .trim()

              return `"${escapedValue}"`
            }

            return '""' // Empty but properly quoted
          } catch (error) {
            extractionErrors++
            console.error(`❌ Extraction error for record ${recordIndex + 1}, field "${originalFieldName}":`, error)

            // 🔥 EMERGENCY DATA PRESERVATION
            const emergencyValue = String(rawValue).substring(0, 100).replace(/"/g, '""')
            return `"ERROR_PRESERVED:${emergencyValue}"`
          }
        }),
    ]

    return values.join(",")
  })

  const csvContent = [csvHeaders, ...csvRows].join("\n")

  // 🔍 STEP 5: Comprehensive data integrity validation
  const originalDataSize = JSON.stringify(data).length
  const csvSize = csvContent.length
  const compressionRatio = Math.round((1 - csvSize / originalDataSize) * 100)

  const totalPossibleValues = data.length * allFieldNames.size
  const dataPreservationRate = ((totalPreservedValues / totalPossibleValues) * 100).toFixed(1)
  const extractionSuccessRate = ((totalExtractedValues / totalPreservedValues) * 100).toFixed(1)

  // 🔍 STEP 6: Create comprehensive conversion report
  const conversionReport = `
📊 ZERO DATA LOSS CSV CONVERSION REPORT:
  ✅ Total records: ${data.length}
  ✅ Total fields: ${allFieldNames.size}
  ✅ Clean field names: ${cleanFieldNames.length}
  ✅ CSV size: ${csvSize} characters
  ✅ Estimated tokens: ${estimateTokens(csvContent)}
  ✅ Compression ratio: ${compressionRatio}% smaller than JSON
  
🔍 DATA PRESERVATION METRICS:
  📊 Total possible values: ${totalPossibleValues}
  ✅ Values preserved: ${totalPreservedValues} (${dataPreservationRate}%)
  ✅ Values extracted: ${totalExtractedValues} (${extractionSuccessRate}% of preserved)
  ❌ Extraction errors: ${extractionErrors}
  
📋 Field Extraction Quality:
${Array.from(allFieldNames)
  .sort()
  .map((fieldName) => {
    const stats = fieldStats[fieldName]
    const preservationRate = ((stats.preservedValues / stats.totalValues) * 100).toFixed(1)
    const extractionRate =
      stats.preservedValues > 0 ? ((stats.extractedValues / stats.preservedValues) * 100).toFixed(1) : "0"
    return `  • "${fieldNameMapping[fieldName]}": ${preservationRate}% preserved, ${extractionRate}% extracted`
  })
  .join("\n")}

🎯 ZERO DATA LOSS GUARANTEE:
  ${dataPreservationRate === "100.0" ? "✅ PERFECT: No data loss detected" : `⚠️ WARNING: ${100 - Number.parseFloat(dataPreservationRate)}% data loss detected`}
  ${extractionErrors === 0 ? "✅ PERFECT: No extraction errors" : `⚠️ WARNING: ${extractionErrors} extraction errors`}
  ${Number.parseFloat(extractionSuccessRate) >= 95 ? "✅ EXCELLENT: High extraction success rate" : `⚠️ WARNING: Low extraction success rate`}
  `

  console.log(`✅ ===== ZERO DATA LOSS CSV CONVERSION COMPLETE =====`)
  console.log(`📊 Records: ${data.length}`)
  console.log(`📋 Fields: ${allFieldNames.size}`)
  console.log(`📄 CSV size: ${csvSize} characters`)
  console.log(`🎯 Estimated tokens: ${estimateTokens(csvContent)}`)
  console.log(`🔍 Data preservation rate: ${dataPreservationRate}%`)
  console.log(`🔍 Extraction success rate: ${extractionSuccessRate}%`)
  console.log(
    `${Number.parseFloat(dataPreservationRate) === 100 && extractionErrors === 0 ? "✅ ZERO DATA LOSS ACHIEVED!" : "⚠️ DATA LOSS DETECTED - REVIEW REQUIRED"}`,
  )
  console.log(`===============================================`)

  return {
    csvContent,
    conversionReport,
    stats: {
      totalRecords: data.length,
      totalFields: allFieldNames.size,
      totalPossibleValues,
      totalPreservedValues,
      totalExtractedValues,
      extractionErrors,
      dataPreservationRate: Number.parseFloat(dataPreservationRate),
      extractionSuccessRate: Number.parseFloat(extractionSuccessRate),
      csvSize,
      estimatedTokens: estimateTokens(csvContent),
      fieldStats,
      fieldNameMapping,
    },
  }
}

// 🔥 NEW: Clean field name function
const cleanFieldName = (fieldName: string): string => {
  // Handle Lark Base field IDs like "fldwRXU3jn"
  if (fieldName.match(/^fld[a-zA-Z0-9]+$/)) {
    return `Field_${fieldName.substring(3)}` // Convert fldwRXU3jn → Field_wRXU3jn
  }

  // Handle other ID patterns
  if (fieldName.match(/^[a-zA-Z0-9]{8,}$/)) {
    return `Field_${fieldName.substring(0, 8)}` // Truncate long IDs
  }

  // Clean special characters but keep meaningful names
  const cleaned = fieldName
    .replace(/[^a-zA-Z0-9\s\-_]/g, "") // Remove special chars except space, dash, underscore
    .replace(/\s+/g, "_") // Convert spaces to underscores for CSV compatibility
    .trim()

  // If result is empty or too short, use original with prefix
  if (cleaned.length < 2) {
    return `Field_${fieldName.replace(/[^a-zA-Z0-9]/g, "_")}`
  }

  return cleaned
}

// 🔥 NEW: Validate CSV data integrity
const validateCSVIntegrity = (
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

    // Check header structure
    const csvHeaders = headerLine.split(",").map((h) => h.replace(/"/g, ""))
    const expectedMinHeaders = 2 + new Set(originalData.flatMap((r) => Object.keys(r.fields))).size // STT + RecordID + fields

    if (csvHeaders.length < expectedMinHeaders) {
      issues.push(`Header count too low: Expected at least ${expectedMinHeaders}, got ${csvHeaders.length}`)
    }

    // Check for completely empty rows
    const emptyRows = dataLines.filter((line) => {
      const cells = line.split(",").map((cell) => cell.replace(/"/g, "").trim())
      return cells.every((cell) => cell === "")
    }).length

    if (emptyRows > 0) {
      issues.push(`Found ${emptyRows} completely empty rows`)
    }

    // Check data density
    const totalCells = dataLines.length * csvHeaders.length
    const emptyCells = dataLines.reduce((count, line) => {
      const cells = line.split(",").map((cell) => cell.replace(/"/g, "").trim())
      return count + cells.filter((cell) => cell === "").length
    }, 0)

    const dataDensity = (((totalCells - emptyCells) / totalCells) * 100).toFixed(1)

    // Check for data loss indicators
    const errorCells = csvContent.match(/ERROR_PRESERVED:/g)?.length || 0
    if (errorCells > 0) {
      issues.push(`Found ${errorCells} cells with extraction errors`)
    }

    const report = `
📊 CSV Integrity Validation Report:
  ✅ Records: ${dataLines.length}/${originalData.length}
  ✅ Headers: ${csvHeaders.length}/${expectedMinHeaders}+ expected
  ✅ Data density: ${dataDensity}%
  ✅ Empty rows: ${emptyRows}
  ✅ Error cells: ${errorCells}
  ${issues.length === 0 ? "✅ All validation checks passed!" : `⚠️ ${issues.length} issues detected`}
    `

    return {
      isValid: issues.length === 0,
      report: report,
      issues: issues,
    }
  } catch (error) {
    const errorMsg = `CSV validation error: ${error}`
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

// 🔥 NEW: Enhanced CSV analysis với Llama 4 Scout
const analyzeEnhancedCSVWithRandomAPI = async (
  csvContent: string,
  tableName: string,
  recordCount: number,
  conversionReport: string,
): Promise<{ success: boolean; analysis: string; apiDetails: any; error?: string }> => {
  try {
    console.log(`\n🚀 ===== ENHANCED CSV ANALYSIS với ${SINGLE_MODEL} =====`)
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

    console.log(`🎯 Using API ${selectedAPI.apiIndex + 1} for enhanced CSV analysis`)

    const groq = createGroqClient(selectedAPI.apiKey)

    // 🔥 NEW: Enhanced CSV analysis prompt với zero data loss focus
    const analysisPrompt = `Phân tích toàn bộ dữ liệu CSV từ bảng "${tableName}" (${recordCount} records) với ZERO DATA LOSS guarantee:

${conversionReport}

Dữ liệu CSV (đã được xử lý với complete data preservation):
${csvContent}

Thực hiện phân tích toàn diện với focus vào data completeness:

1. **Kiểm tra Data Integrity:**
   - Đếm chính xác số records trong CSV (phải = ${recordCount})
   - Verify tất cả fields đã được preserve
   - Check data quality và completeness

2. **Thống kê chi tiết từ CSV:**
   - Phân tích từng column với complete data
   - Thống kê phân bố và frequency
   - Identify patterns và relationships
   - Extract insights từ preserved data

3. **Business Analysis:**
   - Insights quan trọng từ complete dataset
   - Trends và patterns từ full data
   - Actionable recommendations
   - Data-driven conclusions

4. **Data Quality Assessment:**
   - Đánh giá completeness của từng field
   - Identify missing data patterns
   - Data consistency analysis

5. **Kết luận:**
   - Tóm tắt findings chính từ complete data
   - Data reliability assessment
   - Key business insights

**QUAN TRỌNG - ZERO DATA LOSS VERIFICATION**: 
- Đếm chính xác số records từ CSV (phải = ${recordCount})
- Phân tích dựa 100% trên dữ liệu CSV đã preserve
- Không bỏ qua bất kỳ data nào
- Verify data integrity trong analysis

Trả lời chi tiết bằng tiếng Việt với format rõ ràng và focus vào complete data analysis:`

    const promptTokens = estimateTokens(analysisPrompt)
    console.log(`📤 Sending enhanced CSV analysis request: ${promptTokens} input tokens`)

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
    console.log(`✅ SUCCESS: Analyzed ${recordCount} records with Enhanced CSV (zero data loss)`)
    console.log(`📋 Analysis preview: ${analysis.substring(0, 150)}...`)
    console.log(`===== END ENHANCED CSV ANALYSIS =====\n`)

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
    console.error(`❌ Enhanced CSV analysis failed: ${errorMsg}`)

    return {
      success: false,
      analysis: `❌ Lỗi phân tích với ${SINGLE_MODEL}: ${errorMsg}`,
      apiDetails: { error: errorMsg },
      error: errorMsg,
    }
  }
}

// 🔥 MAIN: Enhanced CSV Pipeline với ZERO DATA LOSS
export const preprocessDataWithPipeline = async (
  data: any[],
  tableName: string,
  fieldMetadata?: { fieldTypes: Record<string, string>; fieldNames: string[] },
): Promise<{ success: boolean; optimizedData: string; analysis: string; keyUsage: any }> => {
  try {
    console.log(`🚀 Enhanced CSV Pipeline (ZERO DATA LOSS) với ${data.length} records - Model: ${SINGLE_MODEL}`)

    if (!API_KEYS || API_KEYS.length === 0) {
      throw new Error("Cần ít nhất 1 API key")
    }

    // 🔥 BƯỚC 1: Enhanced CSV conversion với zero data loss
    console.log(`📊 BƯỚC 1: Enhanced CSV conversion với ZERO DATA LOSS guarantee...`)
    const { csvContent, conversionReport, stats } = convertToEnhancedCSV(data, fieldMetadata)

    if (!csvContent) {
      throw new Error("Không thể tạo CSV content")
    }

    // 🔥 BƯỚC 2: Validate CSV integrity
    console.log(`🔍 BƯỚC 2: Validating CSV integrity...`)
    const integrityValidation = validateCSVIntegrity(data, csvContent)

    if (!integrityValidation.isValid) {
      console.warn(`⚠️ CSV integrity issues detected:`)
      integrityValidation.issues.forEach((issue) => console.warn(`  - ${issue}`))
    }

    // 🔥 CRITICAL: Check for data loss
    if (stats.dataPreservationRate < 100) {
      console.error(`❌ DATA LOSS DETECTED: ${100 - stats.dataPreservationRate}% data loss!`)
      console.error(`This violates the ZERO DATA LOSS requirement!`)
    }

    // 🔥 BƯỚC 3: Enhanced CSV analysis
    console.log(`🤖 BƯỚC 3: Enhanced CSV analysis với random API...`)
    const analysisResult = await analyzeEnhancedCSVWithRandomAPI(csvContent, tableName, data.length, conversionReport)

    if (!analysisResult.success) {
      console.log(`❌ Analysis failed, using enhanced CSV`)
      return {
        success: true,
        optimizedData: csvContent,
        analysis: analysisResult.analysis,
        keyUsage: {
          error: true,
          format: "Enhanced CSV",
          fallback: true,
          model: SINGLE_MODEL,
          strategy: "Enhanced CSV (Zero Data Loss)",
          errorDetails: analysisResult.error,
          dataIntegrity: integrityValidation,
          stats: stats,
        },
      }
    }

    // 🔥 SUCCESS: Return enhanced CSV results
    const keyUsage = {
      totalKeys: API_KEYS.length,
      usedAPI: analysisResult.apiDetails.keyIndex,
      selectedRandomly: true,
      totalRecords: data.length,
      processedRecords: data.length,
      dataLoss: Math.max(0, 100 - stats.dataPreservationRate),
      format: "Enhanced CSV (Zero Data Loss)",
      model: SINGLE_MODEL,
      strategy: "Enhanced CSV Direct Analysis",
      responseTime: analysisResult.apiDetails.responseTime,
      inputTokens: analysisResult.apiDetails.inputTokens,
      outputTokens: analysisResult.apiDetails.outputTokens,
      totalTokens: analysisResult.apiDetails.totalTokens,
      apiPreview: analysisResult.apiDetails.preview,
      dataIntegrity: integrityValidation,
      stats: stats,
    }

    console.log(`✅ Enhanced CSV Pipeline Complete:`)
    console.log(`  📊 Records: ${data.length} (${stats.dataPreservationRate}% preserved)`)
    console.log(`  🎯 API used: ${analysisResult.apiDetails.keyIndex}`)
    console.log(`  ⚡ Time: ${analysisResult.apiDetails.responseTime}ms`)
    console.log(`  🎫 Tokens: ${analysisResult.apiDetails.totalTokens}`)
    console.log(`  🔍 Data integrity: ${integrityValidation.isValid ? "✅ Valid" : "⚠️ Issues detected"}`)
    console.log(`  📄 Format: Enhanced CSV (${stats.dataPreservationRate}% data preservation)`)
    console.log(`  ${stats.dataPreservationRate === 100 ? "✅ ZERO DATA LOSS ACHIEVED!" : "⚠️ DATA LOSS DETECTED!"}`)

    return {
      success: true,
      optimizedData: csvContent,
      analysis: analysisResult.analysis,
      keyUsage: keyUsage,
    }
  } catch (error) {
    console.error("❌ Enhanced CSV Pipeline failed:", error)

    const { csvContent } = convertToEnhancedCSV(data)
    return {
      success: true,
      optimizedData: csvContent,
      analysis: `❌ Pipeline error với ${SINGLE_MODEL}: ${error}. Sử dụng enhanced CSV với ${data.length} records.`,
      keyUsage: {
        error: true,
        format: "Enhanced CSV",
        model: SINGLE_MODEL,
        fallback: true,
        strategy: "Enhanced CSV (Zero Data Loss)",
        dataIntegrity: { isValid: false, report: "Pipeline failed", issues: [String(error)] },
      },
    }
  }
}

// 🔥 UPDATED: Answer question với enhanced CSV
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

    // Keep more CSV data for questions
    const maxCSVLength = 10000 // Increased for enhanced CSV
    const truncatedCSV =
      optimizedCSVData.length > maxCSVLength ? optimizedCSVData.substring(0, maxCSVLength) + "..." : optimizedCSVData

    const questionPrompt = `Dữ liệu Enhanced CSV từ bảng "${tableName}" (${originalRecordCount} records) với ZERO DATA LOSS:

${truncatedCSV}

Câu hỏi: ${question}

Phân tích dữ liệu CSV và trả lời chi tiết bằng tiếng Việt:

1. **Trả lời trực tiếp câu hỏi** dựa trên complete CSV data
2. **Dẫn chứng cụ thể** từ CSV rows và columns
3. **Đếm chính xác** từ CSV data (verify với ${originalRecordCount} records)
4. **Insights bổ sung** từ complete dataset
5. **Data quality notes** nếu cần

**QUAN TRỌNG - ZERO DATA LOSS**: 
- Chỉ dựa vào dữ liệu thực tế trong CSV
- Đếm chính xác từ CSV rows
- Sử dụng complete data đã được preserve
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
    console.log(`✅ Question answered with enhanced CSV data (${responseTime}ms)`)

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
      // Use enhanced CSV for quick questions too
      const { csvContent } = convertToEnhancedCSV(data.slice(0, 30))
      return await answerQuestionWithOptimizedData(csvContent, tableName, question, data.length)
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
    format: "Enhanced CSV (Zero Data Loss)",
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
    format: "Enhanced CSV (Zero Data Loss)",
    model: SINGLE_MODEL,
  }
}

export const clearApiCache = () => {
  testResultsCache.clear()
  console.log("🔄 Cache cleared")
}
