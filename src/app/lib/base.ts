import { base } from "@lark-base-open/js-sdk"

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
  fieldNames: string[]
}

// Interface cho SDK status
interface SDKStatus {
  status: "success" | "error" | "warning"
  message: string
  details?: any
}

// Interface cho dữ liệu record đơn giản nhất
interface SimpleRecord {
  recordId: string
  fields: Record<string, any>
}

// Interface cho field metadata
interface FieldMeta {
  id: string
  name: string
  type: string | number
}

// Function kiểm tra SDK status đơn giản
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
      console.log("📞 Calling base.getTableMetaList()...")
      const tableList = await base.getTableMetaList()
      console.log("📋 RAW API RESPONSE - getTableMetaList():", tableList)
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

// Function lấy thống kê bảng đơn giản
export const getTableStats = async (tableId: string): Promise<TableStats> => {
  try {
    console.log(`📊 Getting stats for table: ${tableId}`)

    console.log("📞 Calling base.getTable()...")
    const table = await base.getTable(tableId)
    console.log("📋 RAW API RESPONSE - getTable():", table)

    if (!table) {
      throw new Error("Không thể lấy table object")
    }

    console.log("📞 Calling table.getFieldMetaList()...")
    const fieldMetaList = await table.getFieldMetaList()
    console.log("📋 RAW API RESPONSE - getFieldMetaList():", fieldMetaList)
    console.log("📋 Fields found:", fieldMetaList.length)

    console.log("📞 Calling table.getRecordIdList()...")
    const recordIdList = await table.getRecordIdList()
    console.log("📋 RAW API RESPONSE - getRecordIdList():", recordIdList)
    const totalRecords = recordIdList.length
    console.log("📊 Records found:", totalRecords)

    const fieldNames: string[] = fieldMetaList.map((f) => f.name)

    const stats: TableStats = {
      totalRecords,
      totalFields: fieldMetaList.length,
      fieldNames,
    }

    console.log("📊 Final table stats:", stats)
    return stats
  } catch (error) {
    console.error("❌ Error getting table stats:", error)
    throw new Error(`Không thể lấy thống kê bảng: ${error}`)
  }
}

export const getSimpleTableData = async (tableId: string): Promise<SimpleRecord[]> => {
  console.log(`🔥 SIMPLE: Getting data from table ${tableId}`)

  try {
    console.log("📞 Calling base.getTable()...")
    const table = await base.getTable(tableId)
    console.log("📋 RAW API RESPONSE - getTable():", table)

    console.log("📞 Calling table.getRecordIdList()...")
    const recordIdList = await table.getRecordIdList()
    console.log("📋 RAW API RESPONSE - getRecordIdList():", recordIdList)
    console.log("📊 Record IDs sample:", recordIdList.slice(0, 5))

    console.log("📞 Calling table.getFieldMetaList()...")
    const fieldMetaList: FieldMeta[] = await table.getFieldMetaList()
    console.log("📋 RAW API RESPONSE - getFieldMetaList():", fieldMetaList)
    console.log("📋 Field metadata sample:", fieldMetaList.slice(0, 3))

    console.log(`📊 Found ${recordIdList.length} records, ${fieldMetaList.length} fields`)

    const allData: SimpleRecord[] = []

    // Lấy từng record một cách đơn giản
    for (let i = 0; i < Math.min(recordIdList.length, 10); i++) {
      // Chỉ test 10 records đầu để debug
      const recordId = recordIdList[i]

      try {
        console.log(`\n📄 Processing record ${i + 1}/${recordIdList.length}: ${recordId}`)

        // Method 1: getRecordById
        console.log("📞 Calling table.getRecordById()...")
        const record: any = await table.getRecordById(recordId)
        console.log("📋 RAW API RESPONSE - getRecordById():", record)

        if (record && record.fields) {
          console.log(`📋 Record fields structure:`, Object.keys(record.fields))
          console.log(`📋 Record fields sample:`, Object.entries(record.fields).slice(0, 3))
          console.log(`✅ Record ${i + 1}: Got ${Object.keys(record.fields).length} fields`)

          allData.push({
            recordId,
            fields: record.fields,
          })
        } else {
          console.log(`⚠️ Record ${i + 1}: No fields in getRecordById response`)

          // Method 2: getCellValue fallback
          console.log(`🔄 Record ${i + 1}: Trying getCellValue fallback`)
          const fields: Record<string, any> = {}

          for (const field of fieldMetaList.slice(0, 3)) {
            // Test first 3 fields only
            try {
              console.log(`📞 Calling table.getCellValue(${recordId}, ${field.id})...`)
              const cellValue = await table.getCellValue(recordId, field.id)
              console.log(`📋 RAW API RESPONSE - getCellValue(${field.name}):`, cellValue)

              if (cellValue !== null && cellValue !== undefined) {
                fields[field.name] = cellValue
                console.log(
                  `✅ Field "${field.name}": ${typeof cellValue} = ${JSON.stringify(cellValue)?.substring(0, 100)}`,
                )
              } else {
                console.log(`⚠️ Field "${field.name}": null/undefined`)
              }
            } catch (e) {
              console.log(`❌ getCellValue by ID failed for "${field.name}":`, e)

              // Try with field name
              try {
                console.log(`📞 Calling table.getCellValue(${recordId}, ${field.name})...`)
                const cellValue = await table.getCellValue(recordId, field.name)
                console.log(`📋 RAW API RESPONSE - getCellValue by name(${field.name}):`, cellValue)

                if (cellValue !== null && cellValue !== undefined) {
                  fields[field.name] = cellValue
                  console.log(
                    `✅ Field "${field.name}" (by name): ${typeof cellValue} = ${JSON.stringify(cellValue)?.substring(0, 100)}`,
                  )
                }
              } catch (e2) {
                console.log(`❌ getCellValue by name also failed for "${field.name}":`, e2)
              }
            }
          }

          console.log(`📊 Fallback method extracted ${Object.keys(fields).length} fields:`, Object.keys(fields))
          allData.push({ recordId, fields })
        }

        // Progress log
        if ((i + 1) % 5 === 0) {
          console.log(`📊 Progress: ${i + 1}/${Math.min(recordIdList.length, 10)}`)
        }
      } catch (error) {
        console.error(`❌ Error processing record ${i + 1}:`, error)
        allData.push({ recordId, fields: {} })
      }
    }

    // Summary
    const recordsWithData = allData.filter(
      (r: SimpleRecord) =>
        Object.keys(r.fields).length > 0 &&
        Object.values(r.fields).some((v) => v !== null && v !== undefined && v !== ""),
    ).length

    console.log(`\n📊 SIMPLE EXTRACTION SUMMARY:`)
    console.log(`  Total records processed: ${allData.length}`)
    console.log(`  Records with data: ${recordsWithData}`)
    console.log(`  Success rate: ${((recordsWithData / allData.length) * 100).toFixed(1)}%`)
    console.log(`  Sample data:`, allData.slice(0, 2))

    // If we only processed 10 records, get the rest without detailed logging
    if (recordIdList.length > 10) {
      console.log(`\n🚀 Processing remaining ${recordIdList.length - 10} records (fast mode)...`)

      for (let i = 10; i < recordIdList.length; i++) {
        const recordId = recordIdList[i]

        try {
          const record: any = await table.getRecordById(recordId)

          if (record && record.fields) {
            allData.push({
              recordId,
              fields: record.fields,
            })
          } else {
            allData.push({ recordId, fields: {} })
          }

          // Progress log every 25 records
          if ((i + 1) % 25 === 0) {
            console.log(`📊 Fast mode progress: ${i + 1}/${recordIdList.length}`)
          }
        } catch (error) {
          allData.push({ recordId, fields: {} })
        }
      }
    }

    const finalRecordsWithData = allData.filter(
      (r: SimpleRecord) =>
        Object.keys(r.fields).length > 0 &&
        Object.values(r.fields).some((v) => v !== null && v !== undefined && v !== ""),
    ).length

    console.log(`\n📊 FINAL EXTRACTION SUMMARY:`)
    console.log(`  Total records: ${allData.length}`)
    console.log(`  Records with data: ${finalRecordsWithData}`)
    console.log(`  Final success rate: ${((finalRecordsWithData / allData.length) * 100).toFixed(1)}%`)

    return allData
  } catch (error) {
    console.error(`❌ Simple data extraction failed:`, error)
    throw error
  }
}

// Function test table access
export const testTableAccess = async (tableId: string): Promise<boolean> => {
  try {
    console.log(`🧪 Testing access to table: ${tableId}`)

    console.log("📞 Calling base.getTable()...")
    const table = await base.getTable(tableId)
    console.log("📋 RAW API RESPONSE - getTable():", table)

    if (!table) {
      console.log("❌ Cannot get table object")
      return false
    }

    console.log("📞 Calling table.getFieldMetaList()...")
    const fieldMetaList = await table.getFieldMetaList()
    console.log("📋 RAW API RESPONSE - getFieldMetaList():", fieldMetaList)
    console.log(`✅ Can access fields: ${fieldMetaList.length}`)

    console.log("📞 Calling table.getRecordIdList()...")
    const recordIdList = await table.getRecordIdList()
    console.log("📋 RAW API RESPONSE - getRecordIdList():", recordIdList)
    console.log(`✅ Can access records: ${recordIdList.length}`)

    return true
  } catch (error) {
    console.error("❌ Table access test failed:", error)
    return false
  }
}

// 🔥 NEW: Debug single record với detailed logging
export const debugSingleRecord = async (tableId: string, recordIndex = 0): Promise<any> => {
  try {
    console.log(`🔍 ===== DEBUG SINGLE RECORD =====`)
    console.log(`📊 Table: ${tableId}, Record index: ${recordIndex}`)

    const table = await base.getTable(tableId)
    const recordIdList = await table.getRecordIdList()
    const fieldMetaList = await table.getFieldMetaList()

    if (recordIndex >= recordIdList.length) {
      throw new Error(`Record index ${recordIndex} out of range (max: ${recordIdList.length - 1})`)
    }

    const recordId = recordIdList[recordIndex]
    console.log(`🎯 Target record: ${recordId}`)

    // Method 1: getRecordById
    console.log(`\n📞 Method 1: getRecordById`)
    const record = await table.getRecordById(recordId)
    console.log("📋 Complete record object:", record)
    console.log("📋 Record type:", typeof record)
    console.log("📋 Record keys:", record ? Object.keys(record) : "null")

    if (record && record.fields) {
      console.log("📋 Fields object:", record.fields)
      console.log("📋 Fields type:", typeof record.fields)
      console.log("📋 Fields keys:", Object.keys(record.fields))

      Object.entries(record.fields).forEach(([key, value]) => {
        console.log(`  📋 Field "${key}": ${typeof value} = ${JSON.stringify(value)}`)
      })
    }

    // Method 2: getCellValue for each field
    console.log(`\n📞 Method 2: getCellValue for each field`)
    const cellValues: Record<string, any> = {}

    for (const field of fieldMetaList) {
      console.log(`\n📞 Testing field: "${field.name}" (${field.type}) [ID: ${field.id}]`)

      // Try by field ID
      try {
        const cellValue = await table.getCellValue(recordId, field.id)
        console.log(`  ✅ By ID: ${typeof cellValue} = ${JSON.stringify(cellValue)}`)
        cellValues[`${field.name}_by_id`] = cellValue
      } catch (e) {
        console.log(`  ❌ By ID failed:`, e)
      }

      // Try by field name
      try {
        const cellValue = await table.getCellValue(recordId, field.name)
        console.log(`  ✅ By name: ${typeof cellValue} = ${JSON.stringify(cellValue)}`)
        cellValues[`${field.name}_by_name`] = cellValue
      } catch (e) {
        console.log(`  ❌ By name failed:`, e)
      }
    }

    const result = {
      recordId,
      method1_getRecordById: record,
      method2_getCellValues: cellValues,
      fieldMetadata: fieldMetaList,
      summary: {
        recordHasFields: !!(record && record.fields),
        recordFieldCount: record && record.fields ? Object.keys(record.fields).length : 0,
        cellValueCount: Object.keys(cellValues).length,
        fieldsWithData: Object.values(cellValues).filter((v) => v !== null && v !== undefined && v !== "").length,
      },
    }

    console.log(`\n📊 DEBUG SUMMARY:`)
    console.log(`  Record has fields: ${result.summary.recordHasFields}`)
    console.log(`  Record field count: ${result.summary.recordFieldCount}`)
    console.log(`  Cell value tests: ${result.summary.cellValueCount}`)
    console.log(`  Fields with data: ${result.summary.fieldsWithData}`)
    console.log(`===== END DEBUG =====\n`)

    return result
  } catch (error) {
    console.error(`❌ Debug single record failed:`, error)
    throw error
  }
}

// Function chính lấy TẤT CẢ dữ liệu từ bảng
export const getTableData = getSimpleTableData

// Export all functions
export type { RecordData, TableStats, SDKStatus, SimpleRecord }
