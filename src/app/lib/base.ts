import { bitable } from "@lark-base-open/js-sdk"

export interface TableRecord extends Record<string, unknown> {
  recordId: string
  fields: Record<string, unknown>
}

// Phương pháp 1: Sử dụng getCellValue cho từng field
export const getTableDataMethod1 = async (tableId: string): Promise<TableRecord[]> => {
  try {
    console.log("🔍 Method 1: Sử dụng getCellValue cho từng field...")
    const table = await bitable.base.getTableById(tableId)

    // Lấy metadata của các fields
    const fieldMetaList = await table.getFieldMetaList()
    console.log("📊 Field metadata:", fieldMetaList)

    // Lấy danh sách record IDs
    const recordIds = await table.getRecordIdList()
    console.log("📝 Record IDs:", recordIds.length)

    if (recordIds.length === 0) {
      return []
    }

    const records: TableRecord[] = []

    // Lấy từng record và từng field
    for (const recordId of recordIds.slice(0, 100)) {
      // Giới hạn 100 records
      try {
        const record = await table.getRecordById(recordId)
        const fields: Record<string, unknown> = {}

        // Lấy giá trị từng field
        for (const fieldMeta of fieldMetaList) {
          try {
            const cellValue = await record.getCellValue(fieldMeta.id)
            fields[fieldMeta.name] = cellValue
            console.log(`📋 Field ${fieldMeta.name}:`, cellValue)
          } catch (cellError) {
            console.warn(`⚠️ Không thể lấy field ${fieldMeta.name}:`, cellError)
            fields[fieldMeta.name] = null
          }
        }

        records.push({
          recordId: recordId,
          fields: fields,
        })

        console.log(`✅ Đã xử lý record ${recordId}:`, fields)
      } catch (recordError) {
        console.warn(`⚠️ Không thể lấy record ${recordId}:`, recordError)
      }
    }

    return records
  } catch (error) {
    console.error("❌ Method 1 failed:", error)
    throw error
  }
}

// Phương pháp 2: Sử dụng getCellValueList
export const getTableDataMethod2 = async (tableId: string): Promise<TableRecord[]> => {
  try {
    console.log("🔍 Method 2: Sử dụng getCellValueList...")
    const table = await bitable.base.getTableById(tableId)

    // Lấy metadata của các fields
    const fieldMetaList = await table.getFieldMetaList()
    console.log("📊 Field metadata:", fieldMetaList)

    // Lấy danh sách record IDs
    const recordIds = await table.getRecordIdList()
    console.log("📝 Record IDs:", recordIds.length)

    if (recordIds.length === 0) {
      return []
    }

    const records: TableRecord[] = []

    for (const recordId of recordIds.slice(0, 100)) {
      try {
        const record = await table.getRecordById(recordId)

        // Thử getCellValueList
        let cellValues = {}
        if (typeof record.getCellValueList === "function") {
          cellValues = await record.getCellValueList()
          console.log(`📋 Cell values for ${recordId}:`, cellValues)
        }

        // Chuyển đổi từ field ID sang field name
        const fields: Record<string, unknown> = {}
        for (const fieldMeta of fieldMetaList) {
          if (cellValues && (cellValues as any)[fieldMeta.id] !== undefined) {
            fields[fieldMeta.name] = (cellValues as any)[fieldMeta.id]
          } else {
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
    console.error("❌ Method 2 failed:", error)
    throw error
  }
}

// Phương pháp 3: Sử dụng view để lấy records
export const getTableDataMethod3 = async (tableId: string): Promise<TableRecord[]> => {
  try {
    console.log("🔍 Method 3: Sử dụng view...")
    const table = await bitable.base.getTableById(tableId)
    const views = await table.getViewList()

    if (views.length === 0) {
      throw new Error("Không có view nào")
    }

    const view = views[0]
    console.log("📊 Sử dụng view:", view)

    // Lấy metadata của các fields
    const fieldMetaList = await table.getFieldMetaList()
    console.log("📊 Field metadata:", fieldMetaList)

    // Thử lấy visible record IDs từ view
    let recordIds: string[] = []
    if (typeof view.getVisibleRecordIdList === "function") {
      recordIds = await view.getVisibleRecordIdList()
      console.log("📝 Visible record IDs from view:", recordIds.length)
    } else {
      // Fallback về table
      recordIds = await table.getRecordIdList()
      console.log("📝 Record IDs from table:", recordIds.length)
    }

    if (recordIds.length === 0) {
      return []
    }

    const records: TableRecord[] = []

    for (const recordId of recordIds.slice(0, 100)) {
      try {
        const record = await table.getRecordById(recordId)
        const fields: Record<string, unknown> = {}

        // Lấy giá trị từng field
        for (const fieldMeta of fieldMetaList) {
          try {
            const cellValue = await record.getCellValue(fieldMeta.id)
            fields[fieldMeta.name] = cellValue
          } catch (cellError) {
            console.warn(`⚠️ Không thể lấy field ${fieldMeta.name}:`, cellError)
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
    console.error("❌ Method 3 failed:", error)
    throw error
  }
}

// Phương pháp 4: Sử dụng batch processing
export const getTableDataMethod4 = async (tableId: string): Promise<TableRecord[]> => {
  try {
    console.log("🔍 Method 4: Batch processing...")
    const table = await bitable.base.getTableById(tableId)

    // Lấy metadata của các fields
    const fieldMetaList = await table.getFieldMetaList()
    console.log("📊 Field metadata:", fieldMetaList)

    // Lấy danh sách record IDs
    const recordIds = await table.getRecordIdList()
    console.log("📝 Record IDs:", recordIds.length)

    if (recordIds.length === 0) {
      return []
    }

    // Thử sử dụng getRecords nếu có
    if (typeof table.getRecords === "function") {
      console.log("📝 Sử dụng table.getRecords...")
      const rawRecords = await table.getRecords({
        pageSize: 100,
      })

      console.log("📊 Raw records:", rawRecords)

      if (rawRecords && Array.isArray(rawRecords.records)) {
        return rawRecords.records.map((record: any) => {
          const fields: Record<string, unknown> = {}

          // Chuyển đổi fields từ ID sang name
          for (const fieldMeta of fieldMetaList) {
            if (record.fields && record.fields[fieldMeta.id] !== undefined) {
              fields[fieldMeta.name] = record.fields[fieldMeta.id]
            } else {
              fields[fieldMeta.name] = null
            }
          }

          return {
            recordId: record.recordId || record.id,
            fields: fields,
          }
        })
      }
    }

    // Fallback về method 1
    return await getTableDataMethod1(tableId)
  } catch (error) {
    console.error("❌ Method 4 failed:", error)
    throw error
  }
}

// Function chính thử tất cả các phương pháp
export const getTableData = async (tableId: string): Promise<TableRecord[]> => {
  const methods = [
    { name: "Method 1 (getCellValue)", fn: getTableDataMethod1 },
    { name: "Method 2 (getCellValueList)", fn: getTableDataMethod2 },
    { name: "Method 3 (view)", fn: getTableDataMethod3 },
    { name: "Method 4 (batch)", fn: getTableDataMethod4 },
  ]

  for (const method of methods) {
    try {
      console.log(`🚀 Thử ${method.name}...`)
      const result = await method.fn(tableId)

      if (result && result.length > 0) {
        // Kiểm tra xem có fields thực sự không
        const hasRealData = result.some((record) => Object.keys(record.fields).length > 0)

        if (hasRealData) {
          console.log(`✅ ${method.name} thành công! Lấy được ${result.length} records với dữ liệu thực`)
          return result
        } else {
          console.log(`⚠️ ${method.name} trả về records nhưng không có fields data`)
        }
      } else {
        console.log(`⚠️ ${method.name} trả về dữ liệu rỗng`)
      }
    } catch (error) {
      console.log(`❌ ${method.name} thất bại:`, error)
    }
  }

  // Nếu tất cả đều thất bại, trả về mảng rỗng
  console.log("❌ Tất cả phương pháp đều thất bại hoặc không có dữ liệu thực")
  return []
}

// Function debug chi tiết hơn
export const debugTableStructure = async (tableId: string) => {
  try {
    console.log("🔍 === DETAILED DEBUG TABLE STRUCTURE ===")
    const table = await bitable.base.getTableById(tableId)

    console.log("📋 Table object:", table)
    console.log("📋 Table methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(table)))

    // Debug field metadata chi tiết
    try {
      const fieldMetaList = await table.getFieldMetaList()
      console.log("📊 Fields count:", fieldMetaList.length)
      fieldMetaList.forEach((field, index) => {
        console.log(`📊 Field ${index + 1}:`, {
          id: field.id,
          name: field.name,
          type: field.type,
        })
      })
    } catch (e) {
      console.log("❌ Cannot get field metadata:", e)
    }

    // Debug views chi tiết
    try {
      const views = await table.getViewList()
      console.log("👁️ Views count:", views.length)
      views.forEach((view, index) => {
        console.log(`👁️ View ${index + 1}:`, view)
      })

      if (views.length > 0) {
        const view = views[0]
        console.log("👁️ First view methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(view)))
      }
    } catch (e) {
      console.log("❌ Cannot get views:", e)
    }

    // Debug records chi tiết
    try {
      const recordIds = await table.getRecordIdList()
      console.log("📝 Total record IDs:", recordIds.length)

      if (recordIds.length > 0) {
        const firstRecordId = recordIds[0]
        console.log("📝 First record ID:", firstRecordId)

        const record = await table.getRecordById(firstRecordId)
        console.log("📝 First record object:", record)
        console.log("📝 First record methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(record)))

        // Thử các methods khác nhau trên record đầu tiên
        const recordMethods = ["getCellValue", "getCellValueList", "getFieldValueList"]
        for (const method of recordMethods) {
          if (typeof (record as any)[method] === "function") {
            console.log(`✅ Record method ${method} available`)
            try {
              if (method === "getCellValue") {
                // Cần field ID để test
                const fieldMetaList = await table.getFieldMetaList()
                if (fieldMetaList.length > 0) {
                  const result = await (record as any)[method](fieldMetaList[0].id)
                  console.log(`📊 ${method} result for first field:`, result)
                }
              } else {
                const result = await (record as any)[method]()
                console.log(`📊 ${method} result:`, result)
              }
            } catch (err) {
              console.log(`❌ ${method} error:`, err)
            }
          } else {
            console.log(`❌ Record method ${method} not available`)
          }
        }
      }
    } catch (e) {
      console.log("❌ Cannot get record IDs:", e)
    }

    console.log("🔍 === END DETAILED DEBUG ===")
  } catch (error) {
    console.error("❌ Detailed debug failed:", error)
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
