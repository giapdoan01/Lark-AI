import { base } from "@lark-base-open/js-sdk"
import { emergencyDataRecovery } from "./baseRecovery"

// Interface cho record data
interface RecordData {
  recordId: string
  fields: Record<string, unknown>
  strategy?: string
  fieldCount?: number
  emptyFields?: string[]
  debugInfo?: any
}

// Interface cho table stats
interface TableStats {
  totalRecords: number
  totalFields: number
  fieldTypes: Record<string, string>
  sampleFields: string[]
}

// Interface cho SDK status
interface SDKStatus {
  status: "success" | "error" | "warning"
  message: string
  details?: any
}

// Function kiểm tra SDK status
export const checkSDKStatus = async (): Promise<SDKStatus> => {
  try {
    console.log("🔍 Checking Lark Base SDK status...")

    // Kiểm tra xem có đang chạy trong Lark Base không
    if (typeof window === "undefined") {
      return {
        status: "error",
        message: "SDK chỉ hoạt động trong browser environment",
      }
    }

    // Kiểm tra base object
    if (!base) {
      return {
        status: "error",
        message: "Lark Base SDK không được load. Đảm bảo ứng dụng chạy trong Lark Base.",
      }
    }

    // Test basic SDK functionality
    try {
      const tableList = await base.getTableMetaList()
      console.log("✅ SDK test successful, found tables:", tableList.length)

      return {
        status: "success",
        message: `SDK hoạt động bình thường. Tìm thấy ${tableList.length} bảng.`,
        details: { tableCount: tableList.length },
      }
    } catch (sdkError) {
      console.error("❌ SDK test failed:", sdkError)
      return {
        status: "error",
        message: `SDK test thất bại: ${sdkError}`,
        details: sdkError,
      }
    }
  } catch (error) {
    console.error("❌ SDK status check failed:", error)
    return {
      status: "error",
      message: `Không thể kiểm tra SDK: ${error}`,
      details: error,
    }
  }
}

// Function lấy thống kê bảng
export const getTableStats = async (tableId: string): Promise<TableStats> => {
  try {
    console.log(`📊 Getting stats for table: ${tableId}`)

    const table = await base.getTable(tableId)
    if (!table) {
      throw new Error("Không thể lấy table object")
    }

    // Lấy danh sách fields
    const fieldMetaList = await table.getFieldMetaList()
    console.log("📋 Fields found:", fieldMetaList.length)

    // Lấy record count
    const recordIdList = await table.getRecordIdList()
    const totalRecords = recordIdList.length
    console.log("📊 Records found:", totalRecords)

    // Phân tích field types
    const fieldTypes: Record<string, string> = {}
    const sampleFields: string[] = []

    fieldMetaList.forEach((field) => {
      fieldTypes[field.name] = field.type.toString()
      sampleFields.push(field.name)
    })

    const stats: TableStats = {
      totalRecords,
      totalFields: fieldMetaList.length,
      fieldTypes,
      sampleFields: sampleFields.slice(0, 10), // Lấy 10 fields đầu
    }

    console.log("📊 Table stats:", stats)
    return stats
  } catch (error) {
    console.error("❌ Error getting table stats:", error)
    throw new Error(`Không thể lấy thống kê bảng: ${error}`)
  }
}

// Function test table access
export const testTableAccess = async (tableId: string): Promise<boolean> => {
  try {
    console.log(`🧪 Testing access to table: ${tableId}`)

    const table = await base.getTable(tableId)
    if (!table) {
      console.log("❌ Cannot get table object")
      return false
    }

    // Test lấy field list
    const fieldMetaList = await table.getFieldMetaList()
    console.log(`✅ Can access fields: ${fieldMetaList.length}`)

    // Test lấy record list
    const recordIdList = await table.getRecordIdList()
    console.log(`✅ Can access records: ${recordIdList.length}`)

    return true
  } catch (error) {
    console.error("❌ Table access test failed:", error)
    return false
  }
}

// Function test với sample data
export const testTableDataSample = async (tableId: string, sampleSize = 5): Promise<RecordData[]> => {
  try {
    console.log(`🧪 Testing with ${sampleSize} sample records from table: ${tableId}`)

    const table = await base.getTable(tableId)
    if (!table) {
      throw new Error("Không thể lấy table object")
    }

    // Lấy danh sách record IDs
    const recordIdList = await table.getRecordIdList()
    if (recordIdList.length === 0) {
      console.log("⚠️ Table không có records")
      return []
    }

    // Lấy sample records
    const sampleIds = recordIdList.slice(0, sampleSize)
    console.log(`📊 Getting ${sampleIds.length} sample records...`)

    const sampleData: RecordData[] = []

    for (const recordId of sampleIds) {
      try {
        const recordData = await table.getRecordById(recordId)
        if (recordData && recordData.fields) {
          sampleData.push({
            recordId: recordId,
            fields: recordData.fields,
          })
          console.log(`✅ Sample record ${recordId}:`, Object.keys(recordData.fields))
        } else {
          console.log(`⚠️ Record ${recordId} has no fields`)
          sampleData.push({
            recordId: recordId,
            fields: {},
          })
        }
      } catch (recordError) {
        console.error(`❌ Error getting record ${recordId}:`, recordError)
        sampleData.push({
          recordId: recordId,
          fields: { error: `Cannot read record: ${recordError}` },
        })
      }
    }

    console.log(`✅ Sample test complete: ${sampleData.length} records`)
    return sampleData
  } catch (error) {
    console.error("❌ Sample test failed:", error)
    throw new Error(`Sample test thất bại: ${error}`)
  }
}

// Function debug table structure chi tiết
export const debugTableStructure = async (tableId: string): Promise<void> => {
  try {
    console.log(`🔍 ===== DETAILED TABLE DEBUG: ${tableId} =====`)

    const table = await base.getTable(tableId)
    if (!table) {
      console.log("❌ Cannot get table object")
      return
    }

    // 1. Debug Fields
    console.log("📋 FIELD ANALYSIS:")
    const fieldMetaList = await table.getFieldMetaList()
    fieldMetaList.forEach((field, index) => {
      console.log(`  Field ${index + 1}: "${field.name}" (${field.type})`)
      if (field.property) {
        console.log(`    Properties:`, field.property)
      }
    })

    // 2. Debug Records
    console.log("📊 RECORD ANALYSIS:")
    const recordIdList = await table.getRecordIdList()
    console.log(`  Total records: ${recordIdList.length}`)

    if (recordIdList.length > 0) {
      // Test first 3 records
      const testRecords = recordIdList.slice(0, 3)
      for (let i = 0; i < testRecords.length; i++) {
        const recordId = testRecords[i]
        try {
          console.log(`  Testing record ${i + 1}/${testRecords.length}: ${recordId}`)
          const recordData = await table.getRecordById(recordId)

          if (recordData && recordData.fields) {
            const fieldCount = Object.keys(recordData.fields).length
            const hasData = Object.values(recordData.fields).some(
              (value) => value !== null && value !== undefined && value !== "",
            )

            console.log(`    ✅ Record ${recordId}: ${fieldCount} fields, hasData: ${hasData}`)
            console.log(`    Fields:`, Object.keys(recordData.fields))

            // Show sample values
            Object.entries(recordData.fields).forEach(([key, value]) => {
              const valuePreview = typeof value === "string" ? value.substring(0, 50) : String(value)
              console.log(`      "${key}": ${valuePreview}`)
            })
          } else {
            console.log(`    ❌ Record ${recordId}: No fields data`)
          }
        } catch (recordError) {
          console.log(`    ❌ Record ${recordId}: Error - ${recordError}`)
        }
      }
    }

    // 3. Debug Table Properties
    console.log("🔧 TABLE PROPERTIES:")
    try {
      const tableMeta = await base.getTableMetaList()
      const currentTable = tableMeta.find((t) => t.id === tableId)
      if (currentTable) {
        console.log(`  Table name: "${currentTable.name}"`)
        console.log(`  Table ID: ${currentTable.id}`)
      }
    } catch (metaError) {
      console.log(`  ❌ Cannot get table meta: ${metaError}`)
    }

    // 4. Debug Permissions
    console.log("🔐 PERMISSION TEST:")
    try {
      // Test read permission
      const canRead = recordIdList.length >= 0
      console.log(`  Can read records: ${canRead}`)

      // Test field access
      const canReadFields = fieldMetaList.length > 0
      console.log(`  Can read fields: ${canReadFields}`)
    } catch (permError) {
      console.log(`  ❌ Permission test failed: ${permError}`)
    }

    console.log(`===== END DEBUG TABLE: ${tableId} =====`)
  } catch (error) {
    console.error("❌ Debug table structure failed:", error)
  }
}

// 🚨 EMERGENCY STRATEGY: Use the emergency data recovery system
const emergencyRecoveryStrategy = async (tableId: string): Promise<RecordData[]> => {
  console.log(`🚨 EMERGENCY RECOVERY STRATEGY - LAST RESORT`)
  console.log(`🎯 Goal: Extract ACTUAL DATA using all possible methods`)

  try {
    const table = await base.getTable(tableId)
    if (!table) throw new Error("Cannot get table object")

    // Get metadata
    const fieldMetaList = await table.getFieldMetaList()
    const recordIdList = await table.getRecordIdList()

    console.log(`📊 Emergency recovery for ${recordIdList.length} records, ${fieldMetaList.length} fields`)

    // Use emergency data recovery system
    const recoveryResult = await emergencyDataRecovery(tableId, recordIdList, fieldMetaList)

    console.log(`🚨 Emergency recovery completed:`)
    console.log(`  📊 Records processed: ${recoveryResult.recoveredData.length}`)
    console.log(`  ✅ Total data found: ${recoveryResult.totalDataFound}`)
    console.log(`  🎯 Best method: ${recoveryResult.bestMethod}`)

    // Convert emergency data to standard format
    const standardData: RecordData[] = recoveryResult.recoveredData.map((emergencyRecord) => ({
      recordId: emergencyRecord.recordId,
      fields: emergencyRecord.fields,
      strategy: "emergency-recovery",
      fieldCount: Object.keys(emergencyRecord.fields).length,
      emptyFields: Object.entries(emergencyRecord.fields)
        .filter(([_, value]) => value === null || value === undefined || value === "")
        .map(([key, _]) => key),
      debugInfo: {
        extractionMethod: emergencyRecord.extractionMethod,
        dataFound: emergencyRecord.dataFound,
        emergencyDebugInfo: emergencyRecord.debugInfo,
      },
    }))

    return standardData
  } catch (error) {
    console.error(`❌ Emergency recovery strategy failed:`, error)
    throw error
  }
}

// 🔥 MULTIPLE EXTRACTION STRATEGIES với emergency recovery
export interface ExtractionStrategy {
  name: string
  description: string
  extract: (tableId: string) => Promise<RecordData[]>
}

// 🚨 STRATEGY 1: Emergency Recovery (NEW - Highest Priority)
const emergencyStrategy: ExtractionStrategy = {
  name: "Emergency Data Recovery",
  description: "Comprehensive data extraction using all possible SDK methods and approaches",
  extract: emergencyRecoveryStrategy,
}

// 🔥 STRATEGY 2: Parallel extraction với controlled concurrency
const parallelExtractionStrategy = async (tableId: string): Promise<RecordData[]> => {
  console.log(`🔄 STRATEGY: Parallel extraction với controlled concurrency...`)

  try {
    const table = await base.getTable(tableId)
    if (!table) throw new Error("Cannot get table")

    const recordIdList = await table.getRecordIdList()
    console.log(`📊 Parallel processing ${recordIdList.length} records...`)

    const concurrencyLimit = 5 // Control concurrency to avoid overwhelming the API
    const allData: RecordData[] = []

    // Process in chunks with controlled concurrency
    for (let i = 0; i < recordIdList.length; i += concurrencyLimit) {
      const chunk = recordIdList.slice(i, i + concurrencyLimit)

      const chunkPromises = chunk.map(async (recordId, index) => {
        try {
          const recordData = await table.getRecordById(recordId)
          return {
            recordId: recordId,
            fields: recordData?.fields || {},
            strategy: "parallel",
          }
        } catch (error) {
          console.warn(`⚠️ Parallel extraction failed for record ${i + index + 1}:`, error)
          return {
            recordId: recordId,
            fields: { error: `Parallel extraction failed: ${error}` },
            strategy: "parallel",
          }
        }
      })

      const chunkResults = await Promise.all(chunkPromises)
      allData.push(...chunkResults)

      // Progress logging
      console.log(
        `📊 Parallel progress: ${Math.min(i + concurrencyLimit, recordIdList.length)}/${recordIdList.length} records`,
      )

      // Small delay between chunks
      if (i + concurrencyLimit < recordIdList.length) {
        await new Promise((resolve) => setTimeout(resolve, 300))
      }
    }

    console.log(`✅ Parallel extraction completed: ${allData.length}/${recordIdList.length} records`)
    return allData
  } catch (error) {
    console.error(`❌ Parallel extraction strategy failed:`, error)
    throw error
  }
}

// 🔥 STRATEGY 3: Batch extraction với retry
const batchExtractionStrategy = async (tableId: string): Promise<RecordData[]> => {
  console.log(`🔄 STRATEGY: Batch extraction với retry mechanism...`)

  try {
    const table = await base.getTable(tableId)
    if (!table) throw new Error("Cannot get table")

    const recordIdList = await table.getRecordIdList()
    console.log(`📊 Total record IDs found: ${recordIdList.length}`)

    const batchSize = 10 // Smaller batches for better reliability
    const maxRetries = 3
    const allData: RecordData[] = []

    for (let i = 0; i < recordIdList.length; i += batchSize) {
      const batch = recordIdList.slice(i, i + batchSize)
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}: ${batch.length} records`)

      let batchSuccess = false
      let retryCount = 0

      while (!batchSuccess && retryCount < maxRetries) {
        try {
          const batchPromises = batch.map(async (recordId) => {
            try {
              const recordData = await table.getRecordById(recordId)
              return {
                recordId: recordId,
                fields: recordData?.fields || {},
                strategy: "batch",
              }
            } catch (error) {
              console.warn(`⚠️ Failed to get record ${recordId}:`, error)
              return {
                recordId: recordId,
                fields: { error: `Failed to retrieve: ${error}` },
                strategy: "batch",
              }
            }
          })

          const batchResults = await Promise.all(batchPromises)
          allData.push(...batchResults)
          batchSuccess = true

          // Delay between batches
          await new Promise((resolve) => setTimeout(resolve, 200))
        } catch (batchError) {
          retryCount++
          console.warn(
            `⚠️ Batch ${Math.floor(i / batchSize) + 1} failed (retry ${retryCount}/${maxRetries}):`,
            batchError,
          )

          if (retryCount < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount))
          }
        }
      }

      if (!batchSuccess) {
        console.error(`❌ Batch ${Math.floor(i / batchSize) + 1} failed after ${maxRetries} retries`)
      }
    }

    console.log(`✅ Batch extraction completed: ${allData.length}/${recordIdList.length} records`)
    return allData
  } catch (error) {
    console.error(`❌ Batch extraction strategy failed:`, error)
    throw error
  }
}

// 🔥 STRATEGY 4: Sequential extraction với exponential backoff
const sequentialExtractionStrategy = async (tableId: string): Promise<RecordData[]> => {
  console.log(`🔄 STRATEGY: Sequential extraction với exponential backoff...`)

  try {
    const table = await base.getTable(tableId)
    if (!table) throw new Error("Cannot get table")

    const recordIdList = await table.getRecordIdList()
    console.log(`📊 Sequential processing ${recordIdList.length} records...`)

    const allData: RecordData[] = []
    let consecutiveFailures = 0
    const maxConsecutiveFailures = 5

    for (let i = 0; i < recordIdList.length; i++) {
      const recordId = recordIdList[i]

      try {
        const recordData = await table.getRecordById(recordId)
        allData.push({
          recordId: recordId,
          fields: recordData?.fields || {},
          strategy: "sequential",
        })

        consecutiveFailures = 0 // Reset on success

        // Progress logging
        if ((i + 1) % 50 === 0) {
          console.log(`📊 Sequential progress: ${i + 1}/${recordIdList.length} records`)
        }

        // Adaptive delay based on failure rate
        const delay = consecutiveFailures > 0 ? Math.min(1000 * Math.pow(2, consecutiveFailures), 5000) : 50
        await new Promise((resolve) => setTimeout(resolve, delay))
      } catch (error) {
        consecutiveFailures++
        console.warn(`⚠️ Failed to get record ${i + 1}/${recordIdList.length} (${recordId}):`, error)

        allData.push({
          recordId: recordId,
          fields: { error: `Sequential extraction failed: ${error}` },
          strategy: "sequential",
        })

        if (consecutiveFailures >= maxConsecutiveFailures) {
          console.error(`❌ Too many consecutive failures (${consecutiveFailures}), stopping sequential extraction`)
          break
        }

        // Exponential backoff on failure
        const backoffDelay = Math.min(1000 * Math.pow(2, consecutiveFailures), 10000)
        await new Promise((resolve) => setTimeout(resolve, backoffDelay))
      }
    }

    console.log(`✅ Sequential extraction completed: ${allData.length}/${recordIdList.length} records`)
    return allData
  } catch (error) {
    console.error(`❌ Sequential extraction strategy failed:`, error)
    throw error
  }
}

// 🔥 MAIN: Multi-strategy data extraction with emergency recovery
export const getTableDataWithMultipleStrategies = async (
  tableId: string,
): Promise<{
  data: RecordData[]
  strategy: string
  extractionReport: string
  dataQuality: {
    totalExpected: number
    totalExtracted: number
    dataLossPercentage: number
    fieldCompletenessRate: number
    strategies: Array<{
      name: string
      success: boolean
      recordCount: number
      fieldCompleteness?: number
      error?: string
    }>
  }
}> => {
  console.log(`🚨 ===== MULTI-STRATEGY DATA EXTRACTION (WITH EMERGENCY RECOVERY) =====`)
  console.log(`📊 Table ID: ${tableId}`)

  try {
    // Get expected record count and field metadata
    const table = await base.getTable(tableId)
    if (!table) throw new Error("Cannot get table object")

    const recordIdList = await table.getRecordIdList()
    const fieldMetaList = await table.getFieldMetaList()
    const expectedRecordCount = recordIdList.length
    const expectedFieldCount = fieldMetaList.length

    console.log(`📊 Expected records: ${expectedRecordCount}`)
    console.log(`📋 Expected fields per record: ${expectedFieldCount}`)

    // Define extraction strategies in order of preference (Emergency Recovery first)
    const strategies: ExtractionStrategy[] = [
      emergencyStrategy, // NEW: Emergency recovery with all methods
      {
        name: "Parallel Extraction",
        description: "Controlled parallel processing with error handling",
        extract: parallelExtractionStrategy,
      },
      {
        name: "Batch Extraction",
        description: "Small batch processing with retry mechanism",
        extract: batchExtractionStrategy,
      },
      {
        name: "Sequential Extraction",
        description: "Sequential processing with exponential backoff",
        extract: sequentialExtractionStrategy,
      },
    ]

    const strategyResults: Array<{
      name: string
      success: boolean
      recordCount: number
      fieldCompleteness?: number
      error?: string
      data?: RecordData[]
    }> = []
    let bestResult: { data: RecordData[]; strategy: string } | null = null
    let bestScore = 0 // Combined score of record count and field completeness

    // Try each strategy
    for (const strategy of strategies) {
      console.log(`\n🔄 Trying strategy: ${strategy.name}`)
      console.log(`📝 Description: ${strategy.description}`)

      try {
        const startTime = Date.now()
        const strategyData = await strategy.extract(tableId)
        const extractionTime = Date.now() - startTime

        const recordCount = strategyData.length
        const dataQuality = calculateEnhancedDataQuality(strategyData, expectedFieldCount)

        console.log(`✅ ${strategy.name} completed:`)
        console.log(`  📊 Records: ${recordCount}/${expectedRecordCount}`)
        console.log(`  📋 Field completeness: ${dataQuality.fieldCompletenessRate.toFixed(1)}%`)
        console.log(`  ⏱️ Time: ${extractionTime}ms`)
        console.log(`  📈 Overall quality: ${dataQuality.qualityScore.toFixed(1)}%`)

        // Calculate combined score (record completeness + field completeness)
        const recordCompleteness = (recordCount / expectedRecordCount) * 100
        const combinedScore = (recordCompleteness + dataQuality.fieldCompletenessRate) / 2

        strategyResults.push({
          name: strategy.name,
          success: true,
          recordCount: recordCount,
          fieldCompleteness: dataQuality.fieldCompletenessRate,
          data: strategyData,
        })

        // Keep the best result (highest combined score)
        if (combinedScore > bestScore) {
          bestResult = { data: strategyData, strategy: strategy.name }
          bestScore = combinedScore
        }

        // If we got excellent extraction, stop here
        if (recordCount === expectedRecordCount && dataQuality.fieldCompletenessRate > 90) {
          console.log(`🎯 Excellent extraction achieved with ${strategy.name}!`)
          break
        }

        // If emergency recovery found some data, stop here (it's comprehensive)
        if (strategy.name === "Emergency Data Recovery" && dataQuality.fieldCompletenessRate > 0) {
          console.log(`🚨 Emergency recovery found data, stopping here for comprehensive results`)
          break
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error(`❌ ${strategy.name} failed: ${errorMsg}`)

        strategyResults.push({
          name: strategy.name,
          success: false,
          recordCount: 0,
          fieldCompleteness: 0,
          error: errorMsg,
        })
      }
    }

    // Use the best result
    if (!bestResult) {
      throw new Error("All extraction strategies failed")
    }

    const dataLossPercentage = ((expectedRecordCount - bestResult.data.length) / expectedRecordCount) * 100
    const finalDataQuality = calculateEnhancedDataQuality(bestResult.data, expectedFieldCount)

    const extractionReport = `
🚨 EMERGENCY MULTI-STRATEGY EXTRACTION REPORT:
  📊 Expected records: ${expectedRecordCount}
  ✅ Extracted records: ${bestResult.data.length}
  📉 Record loss: ${dataLossPercentage.toFixed(1)}%
  📋 Expected fields per record: ${expectedFieldCount}
  📈 Field completeness: ${finalDataQuality.fieldCompletenessRate.toFixed(1)}%
  🎯 Best strategy: ${bestResult.strategy}
  
📋 Strategy Performance:
${strategyResults
  .map(
    (s) =>
      `  ${s.success ? "✅" : "❌"} ${s.name}: ${s.recordCount} records${s.fieldCompleteness ? ` (${s.fieldCompleteness.toFixed(1)}% fields)` : ""}${s.error ? ` - ${s.error}` : ""}`,
  )
  .join("\n")}

🎯 QUALITY ASSESSMENT:
${
  dataLossPercentage === 0 && finalDataQuality.fieldCompletenessRate > 95
    ? "🎉 PERFECT EXTRACTION! Zero data loss + Complete fields"
    : dataLossPercentage === 0 && finalDataQuality.fieldCompletenessRate > 80
      ? "✅ EXCELLENT! Zero record loss + Good field completeness"
      : dataLossPercentage < 5 && finalDataQuality.fieldCompletenessRate > 80
        ? "✅ GOOD! Minimal record loss + Good field completeness"
        : dataLossPercentage < 10 && finalDataQuality.fieldCompletenessRate > 60
          ? "⚠️ ACCEPTABLE! Moderate losses but usable data"
          : finalDataQuality.fieldCompletenessRate === 0
            ? "🚨 CRITICAL: NO FIELD DATA EXTRACTED - SDK/Permission Issue!"
            : finalDataQuality.fieldCompletenessRate > 0
              ? "🚨 PARTIAL SUCCESS: Some data recovered via emergency methods"
              : "❌ POOR! Significant data loss - Manual review required"
}

🔧 EXTRACTION METHOD: ${bestResult.strategy === "Emergency Data Recovery" ? "✅ Comprehensive emergency recovery used" : "⚠️ Standard methods used"}

${
  finalDataQuality.fieldCompletenessRate === 0
    ? `
🚨 CRITICAL ISSUE DETECTED:
  - All fields are empty (0% completeness)
  - This indicates a fundamental SDK or permission issue
  - Emergency recovery system was deployed
  - Check debug logs for detailed extraction attempts
  - Verify Lark Base permissions and SDK version
`
    : finalDataQuality.fieldCompletenessRate > 0 && finalDataQuality.fieldCompletenessRate < 50
      ? `
⚠️ PARTIAL DATA RECOVERY:
  - ${finalDataQuality.fieldCompletenessRate.toFixed(1)}% of expected data recovered
  - Emergency recovery system found some data
  - Check extraction method details in debug info
  - Some fields/records may still be inaccessible
`
      : ""
}
    `

    console.log(extractionReport)
    console.log(`===== END EMERGENCY MULTI-STRATEGY EXTRACTION =====\n`)

    return {
      data: bestResult.data,
      strategy: bestResult.strategy,
      extractionReport: extractionReport,
      dataQuality: {
        totalExpected: expectedRecordCount,
        totalExtracted: bestResult.data.length,
        dataLossPercentage: dataLossPercentage,
        fieldCompletenessRate: finalDataQuality.fieldCompletenessRate,
        strategies: strategyResults.map((s) => ({
          name: s.name,
          success: s.success,
          recordCount: s.recordCount,
          fieldCompleteness: s.fieldCompleteness,
          error: s.error,
        })),
      },
    }
  } catch (error) {
    console.error(`❌ Emergency multi-strategy extraction failed:`, error)
    throw new Error(`Emergency multi-strategy extraction failed: ${error}`)
  }
}

// Helper function to calculate enhanced data quality with field completeness
const calculateEnhancedDataQuality = (
  data: RecordData[],
  expectedFieldCount: number,
): { qualityScore: number; fieldCompletenessRate: number; stats: any } => {
  if (data.length === 0) return { qualityScore: 0, fieldCompletenessRate: 0, stats: {} }

  let totalFields = 0
  let fieldsWithData = 0
  let errorFields = 0
  const totalExpectedFields = data.length * expectedFieldCount

  data.forEach((record) => {
    Object.entries(record.fields).forEach(([fieldName, value]) => {
      totalFields++

      if (typeof value === "object" && value !== null && "error" in value) {
        errorFields++
      } else if (value !== null && value !== undefined && value !== "") {
        fieldsWithData++
      }
    })
  })

  const qualityScore = totalFields > 0 ? (fieldsWithData / totalFields) * 100 : 0
  const errorRate = totalFields > 0 ? (errorFields / totalFields) * 100 : 0
  const fieldCompletenessRate = totalExpectedFields > 0 ? (totalFields / totalExpectedFields) * 100 : 0

  return {
    qualityScore: qualityScore,
    fieldCompletenessRate: fieldCompletenessRate,
    stats: {
      totalFields,
      fieldsWithData,
      errorFields,
      errorRate: errorRate,
      dataFillRate: qualityScore,
      expectedFields: totalExpectedFields,
      fieldCoverageRate: fieldCompletenessRate,
    },
  }
}

// Function chính lấy TẤT CẢ dữ liệu từ bảng (backward compatibility)
export const getTableData = async (tableId: string): Promise<RecordData[]> => {
  console.log(`📥 getTableData called - using emergency multi-strategy extraction`)
  const result = await getTableDataWithMultipleStrategies(tableId)
  return result.data
}

// Helper function để format field value
const formatFieldValue = (value: unknown, fieldType?: string): string => {
  if (value === null || value === undefined) {
    return ""
  }

  if (typeof value === "object") {
    return JSON.stringify(value)
  }

  return String(value)
}

// Function lấy dữ liệu với field type information
export const getTableDataWithTypes = async (
  tableId: string,
): Promise<{
  data: RecordData[]
  fieldTypes: Record<string, string>
  fieldNames: string[]
  fieldMetadata: Array<{ id: string; name: string; type: string }>
}> => {
  try {
    console.log(`📥 Getting table data with enhanced field metadata: ${tableId}`)

    const table = await base.getTable(tableId)
    if (!table) {
      throw new Error("Không thể lấy table object")
    }

    // Lấy field metadata chi tiết
    const fieldMetaList = await table.getFieldMetaList()
    const fieldTypes: Record<string, string> = {}
    const fieldNames: string[] = []
    const fieldMetadata: Array<{ id: string; name: string; type: string }> = []

    fieldMetaList.forEach((field) => {
      fieldTypes[field.name] = field.type.toString()
      fieldNames.push(field.name)
      fieldMetadata.push({
        id: field.id || field.name,
        name: field.name,
        type: field.type.toString(),
      })
    })

    console.log(`📋 Field metadata collected:`)
    fieldMetadata.forEach((field) => {
      console.log(`  "${field.name}" (${field.type}) [ID: ${field.id}]`)
    })

    // Lấy data với emergency extraction
    const result = await getTableDataWithMultipleStrategies(tableId)

    return {
      data: result.data,
      fieldTypes,
      fieldNames,
      fieldMetadata,
    }
  } catch (error) {
    console.error("❌ Error getting table data with enhanced metadata:", error)
    throw error
  }
}

// Export all functions
export { type RecordData, type TableStats, type SDKStatus, formatFieldValue }
