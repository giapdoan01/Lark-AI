import { base } from "@lark-base-open/js-sdk"
import { getAllRecordsProper, testProperExtraction } from "../lib/baseRecovery"

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

    if (typeof window === "undefined") {
      return {
        status: "error",
        message: "SDK chỉ hoạt động trong browser environment",
      }
    }

    if (!base) {
      return {
        status: "error",
        message: "Lark Base SDK không được load. Đảm bảo ứng dụng chạy trong Lark Base.",
      }
    }

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

    const fieldMetaList = await table.getFieldMetaList()
    console.log("📋 Fields found:", fieldMetaList.length)

    const recordIdList = await table.getRecordIdList()
    const totalRecords = recordIdList.length
    console.log("📊 Records found:", totalRecords)

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
      sampleFields: sampleFields.slice(0, 10),
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

    const fieldMetaList = await table.getFieldMetaList()
    console.log(`✅ Can access fields: ${fieldMetaList.length}`)

    const recordIdList = await table.getRecordIdList()
    console.log(`✅ Can access records: ${recordIdList.length}`)

    return true
  } catch (error) {
    console.error("❌ Table access test failed:", error)
    return false
  }
}

// Function test với sample data - PROPER METHOD
export const testTableDataSample = async (tableId: string, sampleSize = 5): Promise<RecordData[]> => {
  try {
    console.log(`🧪 PROPER: Testing with sample data from table: ${tableId}`)

    // Use proper extraction method
    const testResult = await testProperExtraction(tableId)
    console.log(`🔍 Proper extraction test result:`, testResult)

    if (testResult.error) {
      throw new Error(testResult.error)
    }

    // If test successful, get sample data
    const allRecords = await getAllRecordsProper(tableId)
    const sampleData = allRecords.slice(0, sampleSize)

    return sampleData.map((record) => ({
      recordId: record.recordId,
      fields: record.fields,
      strategy: "proper-extraction",
      fieldCount: Object.keys(record.fields).length,
      debugInfo: {
        hasRealData: Object.values(record.fields).some((v) => v !== null && v !== undefined && v !== ""),
      },
    }))
  } catch (error) {
    console.error("❌ Proper sample test failed:", error)
    throw new Error(`Proper sample test thất bại: ${error}`)
  }
}

// Function debug table structure - PROPER METHOD
export const debugTableStructure = async (tableId: string): Promise<void> => {
  try {
    console.log(`🔍 PROPER DEBUG: ${tableId}`)

    const testResult = await testProperExtraction(tableId)
    console.log(`🔍 Proper Extraction Test Result:`, testResult)

    if (testResult.success) {
      console.log(`✅ Proper extraction working!`)
      console.log(`📊 Fields with data: ${testResult.fieldsWithData}/${testResult.extractedFields}`)
    } else {
      console.log(`❌ Proper extraction failed:`, testResult.error)
    }
  } catch (error) {
    console.error("❌ Proper debug failed:", error)
  }
}

// 🔥 MAIN: Proper extraction strategy
const properExtractionStrategy = async (tableId: string): Promise<RecordData[]> => {
  console.log(`🔥 PROPER EXTRACTION STRATEGY`)
  console.log(`🎯 Goal: Get actual data using proper Lark Base SDK methods`)

  try {
    // Use the proper extraction method
    const properData = await getAllRecordsProper(tableId)

    // Convert to standard format
    const standardData: RecordData[] = properData.map((record) => ({
      recordId: record.recordId,
      fields: record.fields,
      strategy: "proper-extraction",
      fieldCount: Object.keys(record.fields).length,
      emptyFields: Object.entries(record.fields)
        .filter(([_, value]) => value === null || value === undefined || value === "")
        .map(([key, _]) => key),
      debugInfo: {
        hasRealData: Object.values(record.fields).some((v) => v !== null && v !== undefined && v !== ""),
        createdTime: record.createdTime,
        lastModifiedTime: record.lastModifiedTime,
      },
    }))

    return standardData
  } catch (error) {
    console.error(`❌ Proper extraction strategy failed:`, error)
    throw error
  }
}

// 🔥 MAIN: Multi-strategy extraction with proper method first
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
  console.log(`🔥 ===== PROPER MULTI-STRATEGY EXTRACTION =====`)
  console.log(`📊 Table ID: ${tableId}`)

  try {
    const table = await base.getTable(tableId)
    if (!table) throw new Error("Cannot get table object")

    const recordIdList = await table.getRecordIdList()
    const fieldMetaList = await table.getFieldMetaList()
    const expectedRecordCount = recordIdList.length
    const expectedFieldCount = fieldMetaList.length

    console.log(`📊 Expected records: ${expectedRecordCount}`)
    console.log(`📋 Expected fields per record: ${expectedFieldCount}`)

    // Only use proper strategy now
    const strategies = [
      {
        name: "Proper Lark Base Extraction",
        description: "Research-based proper SDK usage with error handling and rate limiting",
        extract: properExtractionStrategy,
      },
    ]

    let bestResult: { data: RecordData[]; strategy: string } | null = null
    const strategyResults: Array<{
      name: string
      success: boolean
      recordCount: number
      fieldCompleteness?: number
      error?: string
    }> = []

    for (const strategy of strategies) {
      console.log(`\n🔄 Trying strategy: ${strategy.name}`)

      try {
        const startTime = Date.now()
        const strategyData = await strategy.extract(tableId)
        const extractionTime = Date.now() - startTime

        const recordCount = strategyData.length
        const dataQuality = calculateProperDataQuality(strategyData, expectedFieldCount)

        console.log(`✅ ${strategy.name} completed:`)
        console.log(`  📊 Records: ${recordCount}/${expectedRecordCount}`)
        console.log(`  📋 Field completeness: ${dataQuality.fieldCompletenessRate.toFixed(1)}%`)
        console.log(`  ⏱️ Time: ${extractionTime}ms`)

        strategyResults.push({
          name: strategy.name,
          success: true,
          recordCount: recordCount,
          fieldCompleteness: dataQuality.fieldCompletenessRate,
        })

        bestResult = { data: strategyData, strategy: strategy.name }
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

    if (!bestResult) {
      throw new Error("Proper extraction failed")
    }

    const dataLossPercentage = ((expectedRecordCount - bestResult.data.length) / expectedRecordCount) * 100
    const finalDataQuality = calculateProperDataQuality(bestResult.data, expectedFieldCount)

    const extractionReport = `
🔥 PROPER EXTRACTION REPORT:
  📊 Expected records: ${expectedRecordCount}
  ✅ Extracted records: ${bestResult.data.length}
  📉 Record loss: ${dataLossPercentage.toFixed(1)}%
  📋 Expected fields per record: ${expectedFieldCount}
  📈 Field completeness: ${finalDataQuality.fieldCompletenessRate.toFixed(1)}%
  🎯 Strategy: ${bestResult.strategy}

🎯 RESULT:
${
  finalDataQuality.fieldsWithData > 0
    ? `✅ SUCCESS: Found ${finalDataQuality.fieldsWithData} fields with actual data!`
    : `❌ FAILED: No actual field data found - check permissions or SDK setup`
}

${
  finalDataQuality.fieldCompletenessRate === 0
    ? `
🚨 DIAGNOSIS:
  - SDK can access table structure (${expectedRecordCount} records, ${expectedFieldCount} fields)
  - But cannot access actual field values
  - Check app permissions in Lark Base
  - Verify SDK version compatibility
  - Ensure app is running inside Lark Base environment
`
    : finalDataQuality.fieldCompletenessRate > 80
      ? `
🎉 EXCELLENT:
  - High data extraction rate (${finalDataQuality.fieldCompletenessRate.toFixed(1)}%)
  - Proper SDK methods working correctly
  - Ready for data analysis
`
      : `
⚠️ PARTIAL SUCCESS:
  - Some data extracted (${finalDataQuality.fieldCompletenessRate.toFixed(1)}%)
  - May have permission limitations on certain fields
  - Check field-level permissions
`
}
    `

    console.log(extractionReport)
    console.log(`===== END PROPER EXTRACTION =====\n`)

    return {
      data: bestResult.data,
      strategy: bestResult.strategy,
      extractionReport: extractionReport,
      dataQuality: {
        totalExpected: expectedRecordCount,
        totalExtracted: bestResult.data.length,
        dataLossPercentage: dataLossPercentage,
        fieldCompletenessRate: finalDataQuality.fieldCompletenessRate,
        strategies: strategyResults,
      },
    }
  } catch (error) {
    console.error(`❌ Proper multi-strategy extraction failed:`, error)
    throw new Error(`Proper extraction failed: ${error}`)
  }
}

// Helper function tính data quality
const calculateProperDataQuality = (
  data: RecordData[],
  expectedFieldCount: number,
): { qualityScore: number; fieldCompletenessRate: number; fieldsWithData: number; stats: any } => {
  if (data.length === 0) return { qualityScore: 0, fieldCompletenessRate: 0, fieldsWithData: 0, stats: {} }

  let totalFields = 0
  let fieldsWithData = 0
  const totalExpectedFields = data.length * expectedFieldCount

  data.forEach((record) => {
    Object.entries(record.fields).forEach(([fieldName, value]) => {
      totalFields++
      if (value !== null && value !== undefined && value !== "") {
        fieldsWithData++
      }
    })
  })

  const qualityScore = totalFields > 0 ? (fieldsWithData / totalFields) * 100 : 0
  const fieldCompletenessRate = totalExpectedFields > 0 ? (totalFields / totalExpectedFields) * 100 : 0

  return {
    qualityScore,
    fieldCompletenessRate,
    fieldsWithData,
    stats: {
      totalFields,
      fieldsWithData,
      expectedFields: totalExpectedFields,
    },
  }
}

// Function chính lấy TẤT CẢ dữ liệu từ bảng
export const getTableData = async (tableId: string): Promise<RecordData[]> => {
  console.log(`📥 getTableData called - using proper extraction`)
  const result = await getTableDataWithMultipleStrategies(tableId)
  return result.data
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
    console.log(`📥 Getting table data with proper field metadata: ${tableId}`)

    const table = await base.getTable(tableId)
    if (!table) {
      throw new Error("Không thể lấy table object")
    }

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

    const result = await getTableDataWithMultipleStrategies(tableId)

    return {
      data: result.data,
      fieldTypes,
      fieldNames,
      fieldMetadata,
    }
  } catch (error) {
    console.error("❌ Error getting table data with proper metadata:", error)
    throw error
  }
}

// Export all functions
export type { RecordData, TableStats, SDKStatus }
