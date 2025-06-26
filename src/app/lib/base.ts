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

// Function lấy thống kê bảng đơn giản
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

    const fieldNames: string[] = fieldMetaList.map((f) => f.name)

    const stats: TableStats = {
      totalRecords,
      totalFields: fieldMetaList.length,
      fieldNames,
    }

    console.log("📊 Table stats:", stats)
    return stats
  } catch (error) {
    console.error("❌ Error getting table stats:", error)
    throw new Error(`Không thể lấy thống kê bảng: ${error}`)
  }
}

export const getSimpleTableData = async (tableId: string): Promise<SimpleRecord[]> => {
  console.log(`🔥 SIMPLE: Getting data from table ${tableId}`)

  try {
    const table = await base.getTable(tableId)
    const recordIdList = await table.getRecordIdList()
    const fieldMetaList: FieldMeta[] = await table.getFieldMetaList()

    console.log(`📊 Found ${recordIdList.length} records, ${fieldMetaList.length} fields`)

    const allData: SimpleRecord[] = []

    // Lấy từng record một cách đơn giản
    for (let i = 0; i < recordIdList.length; i++) {
      const recordId = recordIdList[i]

      try {
        // Method 1: getRecordById
        const record: any = await table.getRecordById(recordId)

        if (record && record.fields) {
          console.log(`✅ Record ${i + 1}: Got ${Object.keys(record.fields).length} fields`)
          allData.push({
            recordId,
            fields: record.fields,
          })
        } else {
          // Method 2: getCellValue fallback
          console.log(`🔄 Record ${i + 1}: Trying getCellValue fallback`)
          const fields: Record<string, any> = {}

          for (const field of fieldMetaList) {
            try {
              const cellValue = await table.getCellValue(recordId, field.id)
              if (cellValue !== null && cellValue !== undefined) {
                fields[field.name] = cellValue
              }
            } catch (e) {
              // Try with field name
              try {
                const cellValue = await table.getCellValue(recordId, field.name)
                if (cellValue !== null && cellValue !== undefined) {
                  fields[field.name] = cellValue
                }
              } catch (e2) {
                // Silent fail
              }
            }
          }

          allData.push({ recordId, fields })
        }

        // Progress log
        if ((i + 1) % 10 === 0) {
          console.log(`📊 Progress: ${i + 1}/${recordIdList.length}`)
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

    console.log(`📊 SIMPLE EXTRACTION SUMMARY:`)
    console.log(`  Total records: ${allData.length}`)
    console.log(`  Records with data: ${recordsWithData}`)
    console.log(`  Success rate: ${((recordsWithData / allData.length) * 100).toFixed(1)}%`)

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

// Function chính lấy TẤT CẢ dữ liệu từ bảng
export const getTableData = getSimpleTableData

// Export all functions
export type { RecordData, TableStats, SDKStatus, SimpleRecord }
