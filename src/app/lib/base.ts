import { bitable } from "@lark-base-open/js-sdk"

export interface TableRecord extends Record<string, unknown> {
  recordId: string
  fields: Record<string, unknown>
}

// Phương pháp 1: Sử dụng getRecordList (API mới nhất)
export const getTableDataMethod1 = async (tableId: string): Promise<TableRecord[]> => {
  try {
    console.log("🔍 Method 1: Sử dụng getRecordList...")
    const table = await bitable.base.getTableById(tableId)

    // Thử sử dụng getRecordList với pagination
    if (typeof (table as any).getRecordList === "function") {
      const result = await (table as any).getRecordList({
        pageSize: 100, // Lấy tối đa 100 records
      })

      console.log("📊 getRecordList result:", result)

      if (result && result.records) {
        return result.records.map((record: any) => ({
          recordId: record.recordId || record.id,
          fields: record.fields || record,
        }))
      }
    }

    throw new Error("getRecordList không khả dụng")
  } catch (error) {
    console.error("❌ Method 1 failed:", error)
    throw error
  }
}

// Phương pháp 2: Sử dụng view để lấy dữ liệu
export const getTableDataMethod2 = async (tableId: string): Promise<TableRecord[]> => {
  try {
    console.log("🔍 Method 2: Sử dụng view...")
    const table = await bitable.base.getTableById(tableId)
    const views = await table.getViewList()

    if (views.length === 0) {
      throw new Error("Không có view nào")
    }

    const view = views[0]
    console.log("📊 Sử dụng view:", view)

    // Thử các cách khác nhau để lấy records từ view
    const methods = ["getRecordList", "getRecords", "getVisibleRecordIdList"]

    for (const method of methods) {
      if (typeof (view as any)[method] === "function") {
        console.log(`🔍 Thử ${method}...`)
        try {
          const result = await (view as any)[method]()
          console.log(`📊 ${method} result:`, result)

          if (Array.isArray(result)) {
            return result.map((record: any) => ({
              recordId: record.recordId || record.id || record,
              fields: record.fields || {},
            }))
          } else if (result && result.records) {
            return result.records.map((record: any) => ({
              recordId: record.recordId || record.id,
              fields: record.fields || record,
            }))
          }
        } catch (methodError) {
          console.log(`❌ ${method} failed:`, methodError)
        }
      }
    }

    throw new Error("Không thể lấy records từ view")
  } catch (error) {
    console.error("❌ Method 2 failed:", error)
    throw error
  }
}

// Phương pháp 3: Sử dụng getRecordIdList và lấy từng record
export const getTableDataMethod3 = async (tableId: string): Promise<TableRecord[]> => {
  try {
    console.log("🔍 Method 3: Sử dụng getRecordIdList...")
    const table = await bitable.base.getTableById(tableId)

    // Lấy danh sách ID records
    const recordIds = await table.getRecordIdList()
    console.log("📊 Record IDs:", recordIds)

    if (recordIds.length === 0) {
      return []
    }

    // Lấy từng record theo ID
    const records: TableRecord[] = []
    for (const recordId of recordIds.slice(0, 50)) {
      // Giới hạn 50 records đầu tiên
      try {
        const record = await table.getRecordById(recordId)
        console.log(`📝 Record ${recordId}:`, record)

        // Thử các cách khác nhau để lấy fields
        let fields = {}

        if (typeof record.getFieldValueList === "function") {
          fields = await record.getFieldValueList()
        } else if (record.fields) {
          fields = record.fields
        } else if (typeof record.getCellValueList === "function") {
          fields = await record.getCellValueList()
        }

        records.push({
          recordId: recordId,
          fields: fields,
        })
      } catch (recordError) {
        console.warn(`⚠️ Không thể lấy record ${recordId}:`, recordError)
      }
    }

    return records
  } catch (error) {
    console.error("❌ Method 3 failed:", error)
    throw error
  }
}

// Phương pháp 4: Sử dụng getCellValueList với field metadata
export const getTableDataMethod4 = async (tableId: string): Promise<TableRecord[]> => {
  try {
    console.log("🔍 Method 4: Sử dụng field metadata...")
    const table = await bitable.base.getTableById(tableId)

    // Lấy metadata của các fields
    const fieldMetaList = await table.getFieldMetaList()
    console.log("📊 Field metadata:", fieldMetaList)

    // Lấy danh sách record IDs
    const recordIds = await table.getRecordIdList()
    console.log("📊 Record IDs:", recordIds)

    if (recordIds.length === 0) {
      return []
    }

    const records: TableRecord[] = []

    for (const recordId of recordIds.slice(0, 20)) {
      // Giới hạn 20 records
      try {
        const record = await table.getRecordById(recordId)
        const fields: Record<string, unknown> = {}

        // Lấy giá trị từng field
        for (const fieldMeta of fieldMetaList) {
          try {
            const cellValue = await record.getCellValue(fieldMeta.id)
            fields[fieldMeta.name] = cellValue
          } catch (cellError) {
            console.warn(`⚠️ Không thể lấy cell ${fieldMeta.name}:`, cellError)
            fields[fieldMeta.name] = null
          }
        }

        records.push({
          recordId: recordId,
          fields: fields,
        })
      } catch (recordError) {
        console.warn(`⚠️ Không thể lấy record ${recordId}:`, recordError)
      }
    }

    return records
  } catch (error) {
    console.error("❌ Method 4 failed:", error)
    throw error
  }
}

// Function chính thử tất cả các phương pháp
export const getTableData = async (tableId: string): Promise<TableRecord[]> => {
  const methods = [
    { name: "Method 1 (getRecordList)", fn: getTableDataMethod1 },
    { name: "Method 2 (view)", fn: getTableDataMethod2 },
    { name: "Method 3 (getRecordIdList)", fn: getTableDataMethod3 },
    { name: "Method 4 (field metadata)", fn: getTableDataMethod4 },
  ]

  for (const method of methods) {
    try {
      console.log(`🚀 Thử ${method.name}...`)
      const result = await method.fn(tableId)

      if (result && result.length > 0) {
        console.log(`✅ ${method.name} thành công! Lấy được ${result.length} records`)
        return result
      } else {
        console.log(`⚠️ ${method.name} trả về dữ liệu rỗng`)
      }
    } catch (error) {
      console.log(`❌ ${method.name} thất bại:`, error)
    }
  }

  // Nếu tất cả đều thất bại, trả về mảng rỗng với thông tin debug
  console.log("❌ Tất cả phương pháp đều thất bại")
  return []
}

// Function debug chi tiết
export const debugTableStructure = async (tableId: string) => {
  try {
    console.log("🔍 === DEBUG TABLE STRUCTURE ===")
    const table = await bitable.base.getTableById(tableId)

    console.log("📋 Table object:", table)
    console.log("📋 Table methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(table)))

    // Debug field metadata
    try {
      const fieldMetaList = await table.getFieldMetaList()
      console.log("📊 Fields:", fieldMetaList)
    } catch (e) {
      console.log("❌ Cannot get field metadata:", e)
    }

    // Debug views
    try {
      const views = await table.getViewList()
      console.log("👁️ Views:", views)

      if (views.length > 0) {
        const view = views[0]
        console.log("👁️ First view methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(view)))
      }
    } catch (e) {
      console.log("❌ Cannot get views:", e)
    }

    // Debug record IDs
    try {
      const recordIds = await table.getRecordIdList()
      console.log("📝 Record IDs:", recordIds)
      console.log("📝 Total records:", recordIds.length)

      if (recordIds.length > 0) {
        const firstRecordId = recordIds[0]
        const record = await table.getRecordById(firstRecordId)
        console.log("📝 First record:", record)
        console.log("📝 First record methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(record)))
      }
    } catch (e) {
      console.log("❌ Cannot get record IDs:", e)
    }

    console.log("🔍 === END DEBUG ===")
  } catch (error) {
    console.error("❌ Debug failed:", error)
  }
}

export const checkSDKStatus = async () => {
  try {
    console.log("🔍 Kiểm tra trạng thái SDK...")

    if (!bitable) {
      return { status: "error", message: "SDK chưa được load" }
    }

    const tables = await bitable.base.getTableMetaList()
    console.log("📋 Danh sách bảng:", tables)

    return {
      status: "success",
      message: `SDK hoạt động bình thường. Tìm thấy ${tables.length} bảng.`,
      tables,
    }
  } catch (error) {
    console.error("❌ Lỗi khi kiểm tra SDK:", error)
    return {
      status: "error",
      message: `SDK có lỗi: ${error}`,
    }
  }
}
