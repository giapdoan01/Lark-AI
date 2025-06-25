import { base } from "@lark-base-open/js-sdk"

// Interface cho record data
interface RecordData {
  recordId: string
  fields: Record<string, unknown>
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

// Function chính lấy TẤT CẢ dữ liệu từ bảng
export const getTableData = async (tableId: string): Promise<RecordData[]> => {
  try {
    console.log(`📥 Getting ALL data from table: ${tableId}`)

    const table = await base.getTable(tableId)
    if (!table) {
      throw new Error("Không thể lấy table object")
    }

    // Lấy tất cả record IDs
    const recordIdList = await table.getRecordIdList()
    console.log(`📊 Found ${recordIdList.length} records in table`)

    if (recordIdList.length === 0) {
      console.log("⚠️ Table không có records")
      return []
    }

    // Lấy tất cả records
    const allData: RecordData[] = []
    let successCount = 0
    let errorCount = 0

    console.log(`📥 Loading ${recordIdList.length} records...`)

    // Process records in batches để tránh overload
    const batchSize = 50
    for (let i = 0; i < recordIdList.length; i += batchSize) {
      const batch = recordIdList.slice(i, i + batchSize)
      console.log(
        `📦 Processing batch ${Math.floor(i / batchSize) + 1}: records ${i + 1}-${Math.min(i + batchSize, recordIdList.length)}`,
      )

      const batchPromises = batch.map(async (recordId) => {
        try {
          const recordData = await table.getRecordById(recordId)
          if (recordData && recordData.fields) {
            successCount++
            return {
              recordId: recordId,
              fields: recordData.fields,
            }
          } else {
            console.warn(`⚠️ Record ${recordId} has no fields`)
            return {
              recordId: recordId,
              fields: {},
            }
          }
        } catch (recordError) {
          errorCount++
          console.error(`❌ Error getting record ${recordId}:`, recordError)
          return {
            recordId: recordId,
            fields: { error: `Cannot read record: ${recordError}` },
          }
        }
      })

      const batchResults = await Promise.all(batchPromises)
      allData.push(...batchResults)

      // Small delay between batches
      if (i + batchSize < recordIdList.length) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    console.log(`✅ Data loading complete:`)
    console.log(`  📊 Total records: ${recordIdList.length}`)
    console.log(`  ✅ Successfully loaded: ${successCount}`)
    console.log(`  ❌ Errors: ${errorCount}`)
    console.log(`  📄 Final data array length: ${allData.length}`)

    // Analyze data quality
    const recordsWithData = allData.filter((record) =>
      Object.values(record.fields).some((value) => value !== null && value !== undefined && value !== ""),
    )

    console.log(`📊 Data quality analysis:`)
    console.log(`  Records with actual data: ${recordsWithData.length}/${allData.length}`)
    console.log(`  Empty records: ${allData.length - recordsWithData.length}`)

    if (recordsWithData.length > 0) {
      // Show sample of field names
      const sampleRecord = recordsWithData[0]
      const fieldNames = Object.keys(sampleRecord.fields)
      console.log(`  Sample fields (${fieldNames.length}):`, fieldNames.slice(0, 10))
    }

    return allData
  } catch (error) {
    console.error("❌ Error getting table data:", error)
    throw new Error(`Không thể lấy dữ liệu bảng: ${error}`)
  }
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
}> => {
  try {
    console.log(`📥 Getting table data with field types: ${tableId}`)

    const table = await base.getTable(tableId)
    if (!table) {
      throw new Error("Không thể lấy table object")
    }

    // Lấy field metadata
    const fieldMetaList = await table.getFieldMetaList()
    const fieldTypes: Record<string, string> = {}
    const fieldNames: string[] = []

    fieldMetaList.forEach((field) => {
      fieldTypes[field.name] = field.type.toString()
      fieldNames.push(field.name)
    })

    // Lấy data
    const data = await getTableData(tableId)

    return {
      data,
      fieldTypes,
      fieldNames,
    }
  } catch (error) {
    console.error("❌ Error getting table data with types:", error)
    throw error
  }
}

// Export all functions
export { type RecordData, type TableStats, type SDKStatus, formatFieldValue }
