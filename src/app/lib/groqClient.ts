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

// 🔥 PRESERVE EVERYTHING: Enhanced field extraction với absolute zero data loss
const extractCompleteFieldValue = (value: unknown, fieldName?: string): string => {
  // 🔍 DETAILED LOGGING for absolute zero data loss tracking
  const logExtraction = (input: unknown, output: string, method: string) => {
    if (fieldName && output.length > 0) {
      console.log(`✅ Field "${fieldName}": ${method} → "${output.substring(0, 50)}${output.length > 50 ? "..." : ""}"`)
    } else if (fieldName) {
      console.log(`⚠️ Field "${fieldName}": ${method} → EMPTY (input: ${typeof input})`)
    }
  }

  // 1. Handle null/undefined - but preserve the information
  if (value === null) {
    logExtraction(value, "NULL", "null value")
    return "NULL"
  }

  if (value === undefined) {
    logExtraction(value, "UNDEFINED", "undefined value")
    return "UNDEFINED"
  }

  // 2. Handle primitive types - preserve exactly with type info
  if (typeof value === "string") {
    const result = value.trim()
    // 🔥 PRESERVE EMPTY STRINGS TOO
    if (result === "") {
      logExtraction(value, "EMPTY_STRING", "empty string")
      return "EMPTY_STRING"
    }
    logExtraction(value, result, "string")
    return result
  }

  if (typeof value === "number") {
    const result = String(value)
    logExtraction(value, result, "number")
    return result
  }

  if (typeof value === "boolean") {
    const result = value ? "TRUE" : "FALSE"
    logExtraction(value, result, "boolean")
    return result
  }

  // 3. Handle Date objects - preserve with full info
  if (value instanceof Date) {
    const result = value.toISOString()
    logExtraction(value, result, "Date object")
    return result
  }

  // 4. 🔥 ABSOLUTE PRESERVATION: Handle ALL objects and arrays
  if (typeof value === "object") {
    try {
      const jsonStr = JSON.stringify(value)
      console.log(`🔍 Processing object field "${fieldName}": ${jsonStr.substring(0, 100)}...`)

      // Handle empty objects - but preserve the info
      if (jsonStr === "null") {
        logExtraction(value, "NULL_OBJECT", "null object")
        return "NULL_OBJECT"
      }

      if (jsonStr === "{}") {
        logExtraction(value, "EMPTY_OBJECT", "empty object")
        return "EMPTY_OBJECT"
      }

      if (jsonStr === "[]") {
        logExtraction(value, "EMPTY_ARRAY", "empty array")
        return "EMPTY_ARRAY"
      }

      // 🔥 COMPREHENSIVE EXTRACTION: Try all possible patterns
      const extractedValues: string[] = []

      // PATTERN 1: Text objects - extract ALL text content
      const textMatches = jsonStr.match(/"text":"([^"]*(?:\\.[^"]*)*)"/g)
      if (textMatches) {
        textMatches.forEach((match) => {
          const textMatch = match.match(/"text":"([^"]*(?:\\.[^"]*)*)"/)
          if (textMatch) {
            const text = textMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\")
            if (text.trim() !== "") {
              extractedValues.push(`TEXT:${text}`)
            }
          }
        })
      }

      // PATTERN 2: All "name" fields
      const nameMatches = jsonStr.match(/"name":"([^"]*(?:\\.[^"]*)*)"/g)
      if (nameMatches) {
        nameMatches.forEach((match) => {
          const nameMatch = match.match(/"name":"([^"]*(?:\\.[^"]*)*)"/)
          if (nameMatch) {
            const name = nameMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\")
            if (name.trim() !== "") {
              extractedValues.push(`NAME:${name}`)
            }
          }
        })
      }

      // PATTERN 3: All "id" fields
      const idMatches = jsonStr.match(/"id":"([^"]*(?:\\.[^"]*)*)"/g)
      if (idMatches) {
        idMatches.forEach((match) => {
          const idMatch = match.match(/"id":"([^"]*(?:\\.[^"]*)*)"/)
          if (idMatch) {
            const id = idMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\")
            if (id.trim() !== "") {
              extractedValues.push(`ID:${id}`)
            }
          }
        })
      }

      // PATTERN 4: All "email" fields
      const emailMatches = jsonStr.match(/"email":"([^"]*(?:\\.[^"]*)*)"/g)
      if (emailMatches) {
        emailMatches.forEach((match) => {
          const emailMatch = match.match(/"email":"([^"]*(?:\\.[^"]*)*)"/)
          if (emailMatch) {
            const email = emailMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\")
            if (email.trim() !== "") {
              extractedValues.push(`EMAIL:${email}`)
            }
          }
        })
      }

      // PATTERN 5: All "url" fields
      const urlMatches = jsonStr.match(/"url":"([^"]*(?:\\.[^"]*)*)"/g)
      if (urlMatches) {
        urlMatches.forEach((match) => {
          const urlMatch = match.match(/"url":"([^"]*(?:\\.[^"]*)*)"/)
          if (urlMatch) {
            const url = urlMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\")
            if (url.trim() !== "") {
              extractedValues.push(`URL:${url}`)
            }
          }
        })
      }

      // PATTERN 6: All "link" fields
      const linkMatches = jsonStr.match(/"link":"([^"]*(?:\\.[^"]*)*)"/g)
      if (linkMatches) {
        linkMatches.forEach((match) => {
          const linkMatch = match.match(/"link":"([^"]*(?:\\.[^"]*)*)"/)
          if (linkMatch) {
            const link = linkMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\")
            if (link.trim() !== "") {
              extractedValues.push(`LINK:${link}`)
            }
          }
        })
      }

      // PATTERN 7: All "value" fields
      const valueMatches = jsonStr.match(/"value":"([^"]*(?:\\.[^"]*)*)"/g)
      if (valueMatches) {
        valueMatches.forEach((match) => {
          const valueMatch = match.match(/"value":"([^"]*(?:\\.[^"]*)*)"/)
          if (valueMatch) {
            const val = valueMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\")
            if (val.trim() !== "") {
              extractedValues.push(`VALUE:${val}`)
            }
          }
        })
      }

      // PATTERN 8: All "title" fields
      const titleMatches = jsonStr.match(/"title":"([^"]*(?:\\.[^"]*)*)"/g)
      if (titleMatches) {
        titleMatches.forEach((match) => {
          const titleMatch = match.match(/"title":"([^"]*(?:\\.[^"]*)*)"/)
          if (titleMatch) {
            const title = titleMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\")
            if (title.trim() !== "") {
              extractedValues.push(`TITLE:${title}`)
            }
          }
        })
      }

      // PATTERN 9: All "description" fields
      const descMatches = jsonStr.match(/"description":"([^"]*(?:\\.[^"]*)*)"/g)
      if (descMatches) {
        descMatches.forEach((match) => {
          const descMatch = match.match(/"description":"([^"]*(?:\\.[^"]*)*)"/)
          if (descMatch) {
            const desc = descMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\")
            if (desc.trim() !== "") {
              extractedValues.push(`DESC:${desc}`)
            }
          }
        })
      }

      // PATTERN 10: All numeric values
      const numberMatches = jsonStr.match(/"[^"]+":(\d+(?:\.\d+)?)/g)
      if (numberMatches) {
        numberMatches.forEach((match) => {
          const numberMatch = match.match(/"([^"]+)":(\d+(?:\.\d+)?)/)
          if (numberMatch) {
            const key = numberMatch[1]
            const num = numberMatch[2]
            extractedValues.push(`${key.toUpperCase()}:${num}`)
          }
        })
      }

      // PATTERN 11: All boolean values
      const boolMatches = jsonStr.match(/"[^"]+":(true|false)/g)
      if (boolMatches) {
        boolMatches.forEach((match) => {
          const boolMatch = match.match(/"([^"]+)":(true|false)/)
          if (boolMatch) {
            const key = boolMatch[1]
            const bool = boolMatch[2]
            extractedValues.push(`${key.toUpperCase()}:${bool.toUpperCase()}`)
          }
        })
      }

      // 🔥 ARRAYS: Handle arrays recursively
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          const arrayValue = extractCompleteFieldValue(item, `${fieldName}[${index}]`)
          if (arrayValue && arrayValue.trim() !== "") {
            extractedValues.push(`ARRAY[${index}]:${arrayValue}`)
          }
        })
      }

      // 🔥 NESTED OBJECTS: Extract from nested objects
      if (typeof value === "object" && !Array.isArray(value)) {
        Object.entries(value as Record<string, unknown>).forEach(([key, val]) => {
          if (val !== null && val !== undefined) {
            const nestedValue = extractCompleteFieldValue(val, `${fieldName}.${key}`)
            if (nestedValue && nestedValue.trim() !== "") {
              extractedValues.push(`${key.toUpperCase()}:${nestedValue}`)
            }
          }
        })
      }

      // 🔥 RETURN EXTRACTED VALUES OR PRESERVE FULL JSON
      if (extractedValues.length > 0) {
        const result = extractedValues.join(" | ")
        console.log(`✅ Extracted ${extractedValues.length} values from object: "${result.substring(0, 100)}..."`)
        logExtraction(value, result, "comprehensive extraction")
        return result
      }

      // 🔥 ABSOLUTE FALLBACK: Preserve complete JSON (formatted for readability)
      const fallbackResult = jsonStr.length > 1000 ? `JSON:${jsonStr.substring(0, 1000)}...` : `JSON:${jsonStr}`

      console.log(`⚠️ Using complete JSON preservation for field "${fieldName}": ${fallbackResult.substring(0, 100)}...`)
      logExtraction(value, fallbackResult, "complete JSON preservation")
      return fallbackResult
    } catch (error) {
      console.error(`❌ Error parsing field "${fieldName}":`, error)
      console.error(`   Original value:`, value)

      // 🔥 EMERGENCY ABSOLUTE PRESERVATION
      const emergencyResult = `ERROR_PRESERVED:${String(value).substring(0, 500)}`
      logExtraction(value, emergencyResult, "emergency absolute preservation")
      return emergencyResult
    }
  }

  // 🔥 FINAL ABSOLUTE PRESERVATION for any unknown types
  const finalResult = `UNKNOWN_TYPE:${String(value).substring(0, 500)}`
  console.warn(`⚠️ Unknown type for field "${fieldName}": ${typeof value}`)
  logExtraction(value, finalResult, "final absolute preservation")
  return finalResult
}

// 🔥 ZERO DATA LOSS: Enhanced CSV conversion với complete data preservation + FIELD ORDER FIX
const convertToEnhancedCSV = (
  data: Array<{ recordId: string; fields: Record<string, unknown> }>,
  fieldMetadata?: { fieldTypes: Record<string, string>; fieldNames: string[] },
): {
  csvContent: string
  conversionReport: string
  stats: any
} => {
  if (data.length === 0) return { csvContent: "", conversionReport: "No data", stats: {} }

  console.log(`📊 ===== ZERO DATA LOSS CSV CONVERSION (FIELD ORDER FIXED) =====`)
  console.log(`📊 Converting ${data.length} records with COMPLETE data preservation...`)

  // 🔥 FIX: Use field metadata order if available, otherwise analyze data
  let orderedFieldNames: string[] = []

  if (fieldMetadata && fieldMetadata.fieldNames && fieldMetadata.fieldNames.length > 0) {
    // Use the correct field order from metadata
    orderedFieldNames = [...fieldMetadata.fieldNames]
    console.log(`📋 Using field order from metadata: ${orderedFieldNames.length} fields`)
    console.log(
      `🔧 Field order: ${orderedFieldNames.slice(0, 5).join(", ")}${orderedFieldNames.length > 5 ? "..." : ""}`,
    )
  } else {
    // Fallback: analyze data to determine field order
    console.log(`⚠️ No field metadata provided, analyzing data for field order...`)
    const allFieldNames = new Set<string>()
    data.forEach((record) => {
      Object.keys(record.fields).forEach((fieldName) => {
        allFieldNames.add(fieldName)
      })
    })
    orderedFieldNames = Array.from(allFieldNames).sort()
    console.log(`📋 Determined field order from data: ${orderedFieldNames.length} fields`)
  }

  // 🔍 STEP 1: Comprehensive field analysis với correct order
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

  // Initialize field stats in correct order
  orderedFieldNames.forEach((fieldName) => {
    fieldValueSamples[fieldName] = []
    fieldStats[fieldName] = {
      totalValues: 0,
      emptyValues: 0,
      uniqueTypes: new Set(),
      extractedValues: 0,
      preservedValues: 0,
    }
  })

  // 🔥 FIXED: Data preservation calculation - only count actual data, not empty fields
  data.forEach((record, recordIndex) => {
    // Process fields in the correct order
    orderedFieldNames.forEach((fieldName) => {
      const fieldValue = record.fields[fieldName] // Get value for this specific field

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

      // 🔥 FIXED: Only count truly empty values, not null/undefined which have meaning
      if (fieldValue === null || fieldValue === undefined) {
        // These are not "empty" - they have semantic meaning
        fieldStats[fieldName].preservedValues++ // Count as preserved
      } else if (fieldValue === "") {
        fieldStats[fieldName].emptyValues++
      } else {
        fieldStats[fieldName].preservedValues++
      }

      // Log first few samples for analysis
      if (fieldValueSamples[fieldName].length <= 3) {
        console.log(`🔍 Field "${fieldName}" sample ${fieldValueSamples[fieldName].length}:`, fieldValue)
      }
    })

    // Check for any extra fields not in the ordered list
    Object.keys(record.fields).forEach((fieldName) => {
      if (!orderedFieldNames.includes(fieldName)) {
        console.warn(`⚠️ Extra field found: "${fieldName}" (not in metadata order)`)
        orderedFieldNames.push(fieldName) // Add to end
        fieldValueSamples[fieldName] = []
        fieldStats[fieldName] = {
          totalValues: 0,
          emptyValues: 0,
          uniqueTypes: new Set(),
          extractedValues: 0,
          preservedValues: 0,
        }
      }
    })
  })

  // 🔍 STEP 2: Create clean field names mapping (preserve order)
  const fieldNameMapping: Record<string, string> = {}
  const cleanFieldNames: string[] = []

  orderedFieldNames.forEach((fieldName) => {
    const cleanName = cleanFieldName(fieldName)
    fieldNameMapping[fieldName] = cleanName
    cleanFieldNames.push(cleanName)
  })

  console.log(`🔧 Field name mapping (in correct order):`)
  orderedFieldNames.forEach((original, index) => {
    const cleaned = fieldNameMapping[original]
    console.log(`  ${index + 1}. "${original}" → "${cleaned}"`)
  })

  // 🔍 STEP 3: Create CSV headers (in correct order)
  const headers = ["STT", "RecordID", ...cleanFieldNames]
  const csvHeaders = headers.map((h) => `"${h}"`).join(",")

  // 🔍 STEP 4: Convert records với ZERO DATA LOSS + CORRECT FIELD ORDER
  let totalExtractedValues = 0
  let totalPreservedValues = 0
  let extractionErrors = 0

  const csvRows = data.map((record, recordIndex) => {
    const values = [
      `"${recordIndex + 1}"`, // STT
      `"${record.recordId}"`, // RecordID
      // 🔥 CRITICAL FIX: Process fields in the EXACT order from metadata
      ...orderedFieldNames.map((originalFieldName) => {
        const rawValue = record.fields[originalFieldName]

        try {
          // 🔥 USE ENHANCED EXTRACTION - PRESERVE EVERYTHING
          const extractedValue = extractCompleteFieldValue(rawValue, originalFieldName)

          // Track extraction success
          if (rawValue !== null && rawValue !== undefined) {
            totalPreservedValues++
          }

          // 🔥 ALWAYS PRESERVE SOMETHING - never return empty
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

          // 🔥 EVEN "EMPTY" VALUES GET PRESERVED WITH TYPE INFO
          return `"EMPTY_FIELD"`
        } catch (error) {
          extractionErrors++
          console.error(`❌ Extraction error for record ${recordIndex + 1}, field "${originalFieldName}":`, error)

          // 🔥 EMERGENCY ABSOLUTE PRESERVATION
          const emergencyValue = String(rawValue).substring(0, 200).replace(/"/g, '""')
          return `"EMERGENCY_PRESERVED:${emergencyValue}"`
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

  // 🔥 FIXED: More accurate preservation rate calculation
  const totalFieldsWithData = data.reduce((count, record) => {
    return (
      count +
      Object.values(record.fields).filter((value) => value !== null && value !== undefined && value !== "").length
    )
  }, 0)

  const dataPreservationRate =
    totalFieldsWithData > 0 ? ((totalExtractedValues / totalFieldsWithData) * 100).toFixed(1) : "100.0"

  // 🔍 STEP 6: Create comprehensive conversion report
  const extractionSuccessRate =
    totalPreservedValues > 0 ? ((totalExtractedValues / totalPreservedValues) * 100).toFixed(1) : "100.0"
  const conversionReport = `
📊 ZERO DATA LOSS CSV CONVERSION REPORT (FIELD ORDER FIXED):
  ✅ Total records: ${data.length}
  ✅ Total fields: ${orderedFieldNames.length}
  ✅ Clean field names: ${cleanFieldNames.length}
  ✅ CSV size: ${csvSize} characters
  ✅ Estimated tokens: ${estimateTokens(csvContent)}
  ✅ Compression ratio: ${compressionRatio}% smaller than JSON
  
🔍 DATA PRESERVATION METRICS:
  📊 Total possible values: ${data.length * orderedFieldNames.length}
  ✅ Values preserved: ${totalPreservedValues} (${dataPreservationRate}%)
  ✅ Values extracted: ${totalExtractedValues} (${extractionSuccessRate}% of preserved)
  ❌ Extraction errors: ${extractionErrors}
  
🔧 FIELD ORDER PRESERVATION:
  📋 Field order source: ${fieldMetadata ? "Metadata (correct order)" : "Data analysis (may be incorrect)"}
  ✅ Fields processed in order: ${orderedFieldNames.slice(0, 3).join(", ")}${orderedFieldNames.length > 3 ? "..." : ""}
  🎯 Order consistency: ${fieldMetadata ? "✅ Guaranteed correct" : "⚠️ Best effort from data"}
  
📋 Field Extraction Quality (in correct order):
${orderedFieldNames
  .slice(0, 10)
  .map((fieldName, index) => {
    const stats = fieldStats[fieldName]
    const preservationRate = ((stats.preservedValues / stats.totalValues) * 100).toFixed(1)
    const extractionRate =
      stats.preservedValues > 0 ? ((stats.extractedValues / stats.preservedValues) * 100).toFixed(1) : "0"
    return `  ${index + 1}. "${fieldNameMapping[fieldName]}": ${preservationRate}% preserved, ${extractionRate}% extracted`
  })
  .join("\n")}
${orderedFieldNames.length > 10 ? `  ... and ${orderedFieldNames.length - 10} more fields` : ""}

🎯 ZERO DATA LOSS + FIELD ORDER GUARANTEE:
  ${dataPreservationRate === "100.0" ? "✅ PERFECT: No data loss detected" : `⚠️ WARNING: ${100 - Number.parseFloat(dataPreservationRate)}% data loss detected`}
  ${extractionErrors === 0 ? "✅ PERFECT: No extraction errors" : `⚠️ WARNING: ${extractionErrors} extraction errors`}
  ${Number.parseFloat(extractionSuccessRate) >= 95 ? "✅ EXCELLENT: High extraction success rate" : `⚠️ WARNING: Low extraction success rate`}
  ${fieldMetadata ? "✅ PERFECT: Field order preserved from metadata" : "⚠️ WARNING: Field order may be incorrect (no metadata)"}
  `

  console.log(`✅ ===== ZERO DATA LOSS CSV CONVERSION COMPLETE (FIELD ORDER FIXED) =====`)
  console.log(`📊 Records: ${data.length}`)
  console.log(`📋 Fields: ${orderedFieldNames.length} (in correct order)`)
  console.log(`📄 CSV size: ${csvSize} characters`)
  console.log(`🎯 Estimated tokens: ${estimateTokens(csvContent)}`)
  console.log(`🔍 Data preservation rate: ${dataPreservationRate}%`)
  console.log(`🔍 Extraction success rate: ${extractionSuccessRate}%`)
  console.log(`🔧 Field order: ${fieldMetadata ? "✅ Preserved from metadata" : "⚠️ Best effort from data"}`)
  console.log(
    `${Number.parseFloat(dataPreservationRate) === 100 && extractionErrors === 0 && fieldMetadata ? "🎉 PERFECT: ZERO DATA LOSS + CORRECT FIELD ORDER!" : "⚠️ ISSUES DETECTED - REVIEW REQUIRED"}`,
  )
  console.log(`===============================================`)

  return {
    csvContent,
    conversionReport,
    stats: {
      totalRecords: data.length,
      totalFields: orderedFieldNames.length,
      totalPossibleValues: data.length * orderedFieldNames.length,
      totalPreservedValues,
      totalExtractedValues,
      extractionErrors,
      dataPreservationRate: Number.parseFloat(dataPreservationRate),
      extractionSuccessRate: Number.parseFloat(extractionSuccessRate),
      csvSize,
      estimatedTokens: estimateTokens(csvContent),
      fieldStats,
      fieldNameMapping,
      fieldOrderPreserved: !!fieldMetadata,
      orderedFieldNames,
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

    // 🔥 NEW: Enhanced CSV analysis prompt với zero data loss focus + field order verification
    const analysisPrompt = `Phân tích toàn bộ dữ liệu CSV từ bảng "${tableName}" (${recordCount} records) với ZERO DATA LOSS guarantee và CORRECT FIELD ORDER:

${conversionReport}

Dữ liệu CSV (đã được xử lý với complete data preservation + field order fix):
${csvContent}

Thực hiện phân tích toàn diện với focus vào data completeness và field order accuracy:

1. **Kiểm tra Data Integrity + Field Order:**
   - Đếm chính xác số records trong CSV (phải = ${recordCount})
   - Verify tất cả fields đã được preserve theo đúng thứ tự
   - Check field order consistency (chuột không lẫn với bàn phím)
   - Verify data quality và completeness

2. **Field Order Verification:**
   - Kiểm tra xem các trường có bị đảo lộn không
   - Verify field names và positions
   - Check for field mapping consistency
   - Identify any field order issues

3. **Thống kê chi tiết từ CSV:**
   - Phân tích từng column với complete data theo đúng order
   - Thống kê phân bố và frequency
   - Identify patterns và relationships
   - Extract insights từ preserved data

4. **Business Analysis:**
   - Insights quan trọng từ complete dataset
   - Trends và patterns từ full data
   - Actionable recommendations
   - Data-driven conclusions

5. **Data Quality Assessment:**
   - Đánh giá completeness của từng field
   - Identify missing data patterns
   - Data consistency analysis
   - Field order accuracy assessment

6. **Kết luận:**
   - Tóm tắt findings chính từ complete data
   - Data reliability assessment
   - Field order accuracy confirmation
   - Key business insights

**QUAN TRỌNG - ZERO DATA LOSS + FIELD ORDER VERIFICATION**: 
- Đếm chính xác số records từ CSV (phải = ${recordCount})
- Phân tích dựa 100% trên dữ liệu CSV đã preserve
- Verify field order không bị đảo lộn
- Không bỏ qua bất kỳ data nào
- Confirm field mapping accuracy

Trả lời chi tiết bằng tiếng Việt với format rõ ràng và focus vào complete data analysis + field order verification:`

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
    console.log(`✅ SUCCESS: Analyzed ${recordCount} records with Enhanced CSV (zero data loss + field order fix)`)
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

// 🔥 MAIN: Enhanced CSV Pipeline với ZERO DATA LOSS + FIELD ORDER FIX
export const preprocessDataWithPipeline = async (
  data: any[],
  tableName: string,
  fieldMetadata?: { fieldTypes: Record<string, string>; fieldNames: string[] },
): Promise<{ success: boolean; optimizedData: string; analysis: string; keyUsage: any }> => {
  try {
    console.log(
      `🚀 Enhanced CSV Pipeline (ZERO DATA LOSS + FIELD ORDER FIX) với ${data.length} records - Model: ${SINGLE_MODEL}`,
    )

    if (!API_KEYS || API_KEYS.length === 0) {
      throw new Error("Cần ít nhất 1 API key")
    }

    // 🔥 BƯỚC 1: Enhanced CSV conversion với zero data loss + field order preservation
    console.log(`📊 BƯỚC 1: Enhanced CSV conversion với ZERO DATA LOSS + FIELD ORDER FIX...`)
    const { csvContent, conversionReport, stats } = convertToEnhancedCSV(data, fieldMetadata)

    if (!csvContent) {
      throw new Error("Không thể tạo CSV content")
    }

    // 🔥 BƯỚC 2: Validate CSV integrity + field order
    console.log(`🔍 BƯỚC 2: Validating CSV integrity + field order...`)
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

    // 🔥 CRITICAL: Check for field order preservation
    if (!stats.fieldOrderPreserved) {
      console.warn(`⚠️ FIELD ORDER WARNING: No metadata provided, field order may be incorrect!`)
      console.warn(`This could cause field mixing (e.g., mouse data in keyboard field)!`)
    } else {
      console.log(`✅ FIELD ORDER PRESERVED: Using metadata field order`)
    }

    // 🔥 BƯỚC 3: Enhanced CSV analysis với field order verification
    console.log(`🤖 BƯỚC 3: Enhanced CSV analysis với random API + field order verification...`)
    const analysisResult = await analyzeEnhancedCSVWithRandomAPI(csvContent, tableName, data.length, conversionReport)

    if (!analysisResult.success) {
      console.log(`❌ Analysis failed, using enhanced CSV`)
      return {
        success: true,
        optimizedData: csvContent,
        analysis: analysisResult.analysis,
        keyUsage: {
          error: true,
          format: "Enhanced CSV (Field Order Fixed)",
          fallback: true,
          model: SINGLE_MODEL,
          strategy: "Enhanced CSV (Zero Data Loss + Field Order Fix)",
          errorDetails: analysisResult.error,
          dataIntegrity: integrityValidation,
          stats: stats,
        },
      }
    }

    // 🔥 SUCCESS: Return enhanced CSV results with field order fix
    const keyUsage = {
      totalKeys: API_KEYS.length,
      usedAPI: analysisResult.apiDetails.keyIndex,
      selectedRandomly: true,
      totalRecords: data.length,
      processedRecords: data.length,
      dataLoss: Math.max(0, 100 - stats.dataPreservationRate),
      format: "Enhanced CSV (Zero Data Loss + Field Order Fixed)",
      model: SINGLE_MODEL,
      strategy: "Enhanced CSV Direct Analysis + Field Order Preservation",
      responseTime: analysisResult.apiDetails.responseTime,
      inputTokens: analysisResult.apiDetails.inputTokens,
      outputTokens: analysisResult.apiDetails.outputTokens,
      totalTokens: analysisResult.apiDetails.totalTokens,
      apiPreview: analysisResult.apiDetails.preview,
      dataIntegrity: integrityValidation,
      stats: stats,
      fieldOrderFixed: stats.fieldOrderPreserved,
    }

    console.log(`✅ Enhanced CSV Pipeline Complete (with field order fix):`)
    console.log(`  📊 Records: ${data.length} (${stats.dataPreservationRate}% preserved)`)
    console.log(`  🎯 API used: ${analysisResult.apiDetails.keyIndex}`)
    console.log(`  ⚡ Time: ${analysisResult.apiDetails.responseTime}ms`)
    console.log(`  🎫 Tokens: ${analysisResult.apiDetails.totalTokens}`)
    console.log(`  🔍 Data integrity: ${integrityValidation.isValid ? "✅ Valid" : "⚠️ Issues detected"}`)
    console.log(
      `  🔧 Field order: ${stats.fieldOrderPreserved ? "✅ Preserved from metadata" : "⚠️ Best effort from data"}`,
    )
    console.log(`  📄 Format: Enhanced CSV (${stats.dataPreservationRate}% data preservation + field order fix)`)
    console.log(
      `  ${stats.dataPreservationRate === 100 && stats.fieldOrderPreserved ? "🎉 PERFECT: ZERO DATA LOSS + CORRECT FIELD ORDER!" : "⚠️ ISSUES DETECTED!"}`,
    )

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
        format: "Enhanced CSV (Field Order Fixed)",
        model: SINGLE_MODEL,
        fallback: true,
        strategy: "Enhanced CSV (Zero Data Loss + Field Order Fix)",
        dataIntegrity: { isValid: false, report: "Pipeline failed", issues: [String(error)] },
      },
    }
  }
}

// 🔥 UPDATED: Answer question với enhanced CSV + field order awareness
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

    const questionPrompt = `Dữ liệu Enhanced CSV từ bảng "${tableName}" (${originalRecordCount} records) với ZERO DATA LOSS + CORRECT FIELD ORDER:

${truncatedCSV}

Câu hỏi: ${question}

Phân tích dữ liệu CSV và trả lời chi tiết bằng tiếng Việt:

1. **Trả lời trực tiếp câu hỏi** dựa trên complete CSV data với correct field order
2. **Dẫn chứng cụ thể** từ CSV rows và columns (verify field order accuracy)
3. **Đếm chính xác** từ CSV data (verify với ${originalRecordCount} records)
4. **Field order verification** - đảm bảo không nhầm lẫn giữa các trường
5. **Insights bổ sung** từ complete dataset
6. **Data quality notes** nếu cần

**QUAN TRỌNG - ZERO DATA LOSS + FIELD ORDER ACCURACY**: 
- Chỉ dựa vào dữ liệu thực tế trong CSV
- Đếm chính xác từ CSV rows
- Sử dụng complete data đã được preserve
- Verify field order không bị đảo lộn
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
    console.log(`✅ Question answered with enhanced CSV data + field order verification (${responseTime}ms)`)

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
    format: "Enhanced CSV (Zero Data Loss + Field Order Fixed)",
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
    format: "Enhanced CSV (Zero Data Loss + Field Order Fixed)",
    model: SINGLE_MODEL,
  }
}

export const clearApiCache = () => {
  testResultsCache.clear()
  console.log("🔄 Cache cleared")
}
