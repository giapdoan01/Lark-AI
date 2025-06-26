import { base } from "@lark-base-open/js-sdk"
import {testSingleRecord, getSimpleTableData, debugSDKMethods} from "../lib/baseRecovery"

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

// 🔥 SIMPLE STRATEGY: Sử dụng cách đơn giản nhất
const simpleExtractionStrategy = async (tableId: string): Promise<RecordData[]> => {
  console.log(`🔥 SIMPLE EXTRACTION STRATEGY`)
  console.log(`🎯 Goal: Get actual data using the simplest possible method`)

  try {
    // Sử dụng simple extraction
    const simpleData = await getSimpleTableData(tableId)

    // Convert sang format chuẩn
    const standardData: RecordData[] = simpleData.map((record) => ({
      recordId: record.recordId,
      fields: record.fields,
      strategy: "simple-extraction",
      fieldCount: Object.keys(record.fields).length,
      emptyFields: Object.entries(record.fields)
        .filter(([_, value]) => value === null || value === undefined || value === "")
        .map(([key, _]) => key),
      debugInfo: record.debugInfo,
    }))

    return standardData
  } catch (error) {
    console.error(`❌ Simple extraction strategy failed:`, error)
    throw error
  }
}

// Function test với sample data - SIMPLIFIED
export const testTableDataSample = async (tableId: string, sampleSize = 5): Promise<RecordData[]> => {
  try {
    console.log(`🧪 SIMPLE: Testing with ${sampleSize} sample records from table: ${tableId}`)

    // Sử dụng simple test
    const testResult = await testSingleRecord(tableId)
    console.log(`🔍 Single record test result:`, testResult)

    // Nếu test thành công, lấy sample data
    if (!testResult.error) {
      const simpleData = await getSimpleTableData(tableId)
      const sampleData = simpleData.slice(0, sampleSize)

      return sampleData.map((record) => ({
        recordId: record.recordId,
        fields: record.fields,
        strategy: "simple-sample",
        fieldCount: Object.keys(record.fields).length,
        debugInfo: record.debugInfo,
      }))
    } else {
      throw new Error(testResult.error)
    }
  } catch (error) {
    console.error("❌ Simple sample test failed:", error)
    throw new Error(`Simple sample test thất bại: ${error}`)
  }
}

// Function debug table structure - SIMPLIFIED
export const debugTableStructure = async (tableId: string): Promise<void> => {
  try {
    console.log(`🔍 SIMPLE DEBUG: ${tableId}`)

    const debugResult = await debugSDKMethods(tableId)
    console.log(`🔍 SDK Debug Result:`, debugResult)

    const testResult = await testSingleRecord(tableId)
    console.log(`🔍 Single Record Test:`, testResult)
  } catch (error) {
    console.error("❌ Simple debug failed:", error)
  }
}

// 🔥 MAIN: Simple multi-strategy extraction
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
  console.log(`🔥 ===== SIMPLE MULTI-STRATEGY EXTRACTION =====`)
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

    // Chỉ dùng simple strategy
    const strategies = [
      {
        name: "Simple Extraction",
        description: "Basic getRecordById with getCellValue fallback",
        extract: simpleExtractionStrategy,
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
        const dataQuality = calculateSimpleDataQuality(strategyData, expectedFieldCount)

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
      throw new Error("Simple extraction failed")
    }

    const dataLossPercentage = ((expectedRecordCount - bestResult.data.length) / expectedRecordCount) * 100
    const finalDataQuality = calculateSimpleDataQuality(bestResult.data, expectedFieldCount)

    const extractionReport = `
🔥 SIMPLE EXTRACTION REPORT:
  📊 Expected records: ${expectedRecordCount}
  ✅ Extracted records: ${bestResult.data.length}
  📉 Record loss: ${dataLossPercentage.toFixed(1)}%
  📋 Expected fields per record: ${expectedFieldCount}
  📈 Field completeness: ${finalDataQuality.fieldCompletenessRate.toFixed(1)}%
  🎯 Strategy: ${bestResult.strategy}

🎯 RESULT:
${
  finalDataQuality.fieldCompletenessRate > 0
    ? `✅ SUCCESS: Found ${finalDataQuality.fieldsWithData} fields with actual data!`
    : `❌ FAILED: No actual field data found - this is a fundamental issue`
}

${
  finalDataQuality.fieldCompletenessRate === 0
    ? `
🚨 DIAGNOSIS:
  - SDK can access table structure (${expectedRecordCount} records, ${expectedFieldCount} fields)
  - But cannot access actual field values
  - This suggests permission or SDK version issues
  - Check if app has proper read permissions in Lark Base
`
    : ""
}
    `

    console.log(extractionReport)
    console.log(`===== END SIMPLE EXTRACTION =====\n`)

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
    console.error(`❌ Simple multi-strategy extraction failed:`, error)
    throw new Error(`Simple extraction failed: ${error}`)
  }
}

// Helper function tính data quality đơn giản
const calculateSimpleDataQuality = (
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
  console.log(`📥 getTableData called - using simple extraction`)
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
    console.log(`📥 Getting table data with simple field metadata: ${tableId}`)

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
    console.error("❌ Error getting table data with simple metadata:", error)
    throw error
  }
}

// Export all functions
export type { RecordData, TableStats, SDKStatus }
