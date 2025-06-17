import { bitable } from "@lark-base-open/js-sdk"

export interface TableRecord extends Record<string, unknown> {
  recordId: string
  fields: Record<string, unknown>
}

// Phương pháp debug để kiểm tra dữ liệu thực tế
export const debugSingleRecord = async (tableId: string, recordId: string) => {
  try {
    console.log(`🔍 === DEBUG SINGLE RECORD ${recordId} ===`)
    const table = await bitable.base.getTableById(tableId)
    const record = await table.getRecordById(recordId)

    console.log("📝 Record object:", record)
    console.log("📝 Record methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(record)))

    // Lấy field metadata
    const fieldMetaList = await table.getFieldMetaList()
    console.log("📊 Available fields:", fieldMetaList)

    // Thử từng field một cách chi tiết
    for (const fieldMeta of fieldMetaList.slice(0, 5)) {
      // Chỉ test 5 fields đầu
      console.log(`\n🔍 Testing field: ${fieldMeta.name} (ID: ${fieldMeta.id}, Type: ${fieldMeta.type})`)

      try {
        // Method 1: getCellValue
        if (typeof record.getCellValue === "function") {
          const cellValue = await record.getCellValue(fieldMeta.id)
          console.log(`📊 getCellValue result:`, cellValue)
        }

        // Method 2: getCellString (nếu có)
        if (typeof (record as any).getCellString === "function") {
          const cellString = await (record as any).getCellString(fieldMeta.id)
          console.log(`📊 getCellString result:`, cellString)
        }

        // Method 3: getCellDisplayString (nếu có)
        if (typeof (record as any).getCellDisplayString === "function") {
          const cellDisplay = await (record as any).getCellDisplayString(fieldMeta.id)
          console.log(`📊 getCellDisplayString result:`, cellDisplay)
        }
      } catch (fieldError) {
        console.log(`❌ Error getting field ${fieldMeta.name}:`, fieldError)
      }
    }

    // Thử getCellValueList
    try {
      if (typeof record.getCellValueList === "function") {
        const allValues = await record.getCellValueList()
        console.log("📊 getCellValueList result:", allValues)
      }
    } catch (err) {
      console.log("❌ getCellValueList error:", err)
    }

    console.log("🔍 === END DEBUG SINGLE RECORD ===")
  } catch (error) {
    console.error("❌ Debug single record failed:", error)
  }
}

// Phương pháp 1: Sử dụng getCellValue với error handling tốt hơn
export const getTableDataMethod1 = async (tableId: string): Promise<TableRecord[]> => {
  try {
    console.log("🔍 Method 1: Enhanced getCellValue...")
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

    // Debug record đầu tiên
    if (recordIds.length > 0) {
      await debugSingleRecord(tableId, recordIds[0])
    }

    const records: TableRecord[] = []

    // Lấy từng record và từng field
    for (const recordId of recordIds.slice(0, 10)) {
      // Giới hạn 10 records để test
      try {
        const record = await table.getRecordById(recordId)
        const fields: Record<string, unknown> = {}

        // Lấy giá trị từng field với nhiều cách khác nhau
        for (const fieldMeta of fieldMetaList) {
          let cellValue = null

          try {
            // Thử getCellValue trước
            cellValue = await record.getCellValue(fieldMeta.id)

            // Nếu null, thử các method khác
            if (cellValue === null || cellValue === undefined) {
              if (typeof (record as any).getCellString === "function") {
                cellValue = await (record as any).getCellString(fieldMeta.id)
              }

              if (
                (cellValue === null || cellValue === undefined) &&
                typeof (record as any).getCellDisplayString === "function"
              ) {
                cellValue = await (record as any).getCellDisplayString(fieldMeta.id)
              }
            }

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

        // Log record đầu tiên để debug
        if (records.length === 1) {
          console.log("📊 First record sample:", records[0])
        }
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

// Phương pháp 2: Sử dụng view với filter
export const getTableDataMethod2 = async (tableId: string): Promise<TableRecord[]> => {
  try {
    console.log("🔍 Method 2: View with filter...")
    const table = await bitable.base.getTableById(tableId)
    const views = await table.getViewList()

    if (views.length === 0) {
      throw new Error("Không có view nào")
    }

    const view = views[0]
    console.log("📊 Using view:", view)

    // Lấy metadata của các fields
    const fieldMetaList = await table.getFieldMetaList()

    // Thử lấy records từ view với các options khác nhau
    const methods = [
      { name: "getRecords", options: { pageSize: 10 } },
      { name: "getRecords", options: {} },
      { name: "getVisibleRecordIdList", options: {} },
    ]

    for (const method of methods) {
      try {
        console.log(`🔍 Trying view.${method.name} with options:`, method.options)

        if (typeof (view as any)[method.name] === "function") {
          const result = await (view as any)[method.name](method.options)
          console.log(`📊 ${method.name} result:`, result)

          if (method.name === "getRecords" && result && result.records) {
            return result.records.map((record: any) => {
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
          } else if (method.name === "getVisibleRecordIdList" && Array.isArray(result)) {
            // Lấy từng record theo ID
            const records: TableRecord[] = []
            for (const recordId of result.slice(0, 10)) {
              try {
                const record = await table.getRecordById(recordId)
                const fields: Record<string, unknown> = {}

                for (const fieldMeta of fieldMetaList) {
                  try {
                    const cellValue = await record.getCellValue(fieldMeta.id)
                    fields[fieldMeta.name] = cellValue
                  } catch (cellError) {
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
          }
        }
      } catch (methodError) {
        console.log(`❌ ${method.name} failed:`, methodError)
      }
    }

    throw new Error("Không thể lấy records từ view")
  } catch (error) {
    console.error("❌ Method 2 failed:", error)
    throw error
  }
}

// Phương pháp 3: Kiểm tra quyền và trạng thái bảng
export const getTableDataMethod3 = async (tableId: string): Promise<TableRecord[]> => {
  try {
    console.log("🔍 Method 3: Permission and table state check...")
    const table = await bitable.base.getTableById(tableId)

    // Kiểm tra quyền
    console.log("🔐 Checking permissions...")
    try {
      const permission = await (table as any).getPermission?.()
      console.log("🔐 Table permission:", permission)
    } catch (permError) {
      console.log("⚠️ Cannot check permission:", permError)
    }

    // Kiểm tra metadata bảng
    const tableMeta = await (table as any).getMeta?.()
    console.log("📋 Table meta:", tableMeta)

    // Lấy field metadata với thông tin chi tiết
    const fieldMetaList = await table.getFieldMetaList()
    console.log("📊 Detailed field info:")
    fieldMetaList.forEach((field, index) => {
      console.log(`  Field ${index + 1}: ${field.name} (${field.type}) - ID: ${field.id}`)
    })

    // Lấy records với logging chi tiết
    const recordIds = await table.getRecordIdList()
    console.log(`📝 Found ${recordIds.length} records`)

    if (recordIds.length === 0) {
      console.log("⚠️ Table is empty")
      return []
    }

    // Kiểm tra record đầu tiên chi tiết
    const firstRecordId = recordIds[0]
    console.log(`🔍 Detailed check of first record: ${firstRecordId}`)

    const firstRecord = await table.getRecordById(firstRecordId)
    console.log("📝 First record object:", firstRecord)

    // Thử tất cả methods có thể trên record đầu tiên
    const recordMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(firstRecord))
    console.log("📝 Available record methods:", recordMethods)

    // Test từng field trên record đầu tiên
    const testFields: Record<string, unknown> = {}
    for (const fieldMeta of fieldMetaList.slice(0, 3)) {
      // Test 3 fields đầu
      console.log(`\n🧪 Testing field: ${fieldMeta.name}`)

      try {
        const value = await firstRecord.getCellValue(fieldMeta.id)
        console.log(`  ✅ Value:`, value)
        testFields[fieldMeta.name] = value
      } catch (err) {
        console.log(`  ❌ Error:`, err)
        testFields[fieldMeta.name] = null
      }
    }

    console.log("🧪 Test result for first record:", testFields)

    // Nếu test thành công, lấy tất cả records
    const records: TableRecord[] = []
    for (const recordId of recordIds.slice(0, 5)) {
      // Chỉ lấy 5 records đầu
      try {
        const record = await table.getRecordById(recordId)
        const fields: Record<string, unknown> = {}

        for (const fieldMeta of fieldMetaList) {
          try {
            const cellValue = await record.getCellValue(fieldMeta.id)
            fields[fieldMeta.name] = cellValue
          } catch (cellError) {
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

// Function chính với logging chi tiết hơn
export const getTableData = async (tableId: string): Promise<TableRecord[]> => {
  console.log(`🚀 === STARTING DATA EXTRACTION FOR TABLE ${tableId} ===`)

  const methods = [
    { name: "Method 1 (Enhanced getCellValue)", fn: getTableDataMethod1 },
    { name: "Method 2 (View with filter)", fn: getTableDataMethod2 },
    { name: "Method 3 (Permission check)", fn: getTableDataMethod3 },
  ]

  for (const method of methods) {
    try {
      console.log(`\n🚀 === TRYING ${method.name.toUpperCase()} ===`)
      const result = await method.fn(tableId)

      if (result && result.length > 0) {
        // Kiểm tra xem có fields thực sự không
        const hasRealData = result.some((record) => {
          return Object.values(record.fields).some((value) => value !== null && value !== undefined && value !== "")
        })

        console.log(`📊 ${method.name} returned ${result.length} records`)
        console.log(`📊 Has real data: ${hasRealData}`)

        if (hasRealData) {
          console.log(`✅ ${method.name} SUCCESS with real data!`)
          console.log("📊 Sample data:", JSON.stringify(result[0], null, 2))
          return result
        } else {
          console.log(`⚠️ ${method.name} returned records but all fields are null`)
          console.log("📊 Sample record:", JSON.stringify(result[0], null, 2))
        }
      } else {
        console.log(`⚠️ ${method.name} returned empty data`)
      }
    } catch (error) {
      console.log(`❌ ${method.name} FAILED:`, error)
    }
  }

  console.log("❌ === ALL METHODS FAILED OR RETURNED NULL DATA ===")
  return []
}

// Function debug chi tiết hơn
export const debugTableStructure = async (tableId: string) => {
  try {
    console.log("🔍 === COMPREHENSIVE DEBUG TABLE STRUCTURE ===")
    const table = await bitable.base.getTableById(tableId)

    console.log("📋 Table object:", table)
    console.log("📋 Table methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(table)))

    // Debug field metadata chi tiết
    try {
      const fieldMetaList = await table.getFieldMetaList()
      console.log("📊 Fields count:", fieldMetaList.length)
      console.log("📊 Field details:")
      fieldMetaList.forEach((field, index) => {
        console.log(`  ${index + 1}. ${field.name}`)
        console.log(`     - ID: ${field.id}`)
        console.log(`     - Type: ${field.type}`)
        console.log(`     - Full object:`, field)
      })
    } catch (e) {
      console.log("❌ Cannot get field metadata:", e)
    }

    // Debug records với sample data
    try {
      const recordIds = await table.getRecordIdList()
      console.log("📝 Total record IDs:", recordIds.length)

      if (recordIds.length > 0) {
        console.log("📝 First 5 record IDs:", recordIds.slice(0, 5))

        // Debug record đầu tiên chi tiết
        await debugSingleRecord(tableId, recordIds[0])
      }
    } catch (e) {
      console.log("❌ Cannot get record IDs:", e)
    }

    console.log("🔍 === END COMPREHENSIVE DEBUG ===")
  } catch (error) {
    console.error("❌ Comprehensive debug failed:", error)
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
