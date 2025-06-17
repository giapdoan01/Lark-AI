import { bitable } from "@lark-base-open/js-sdk"

export interface TableRecord extends Record<string, unknown> {
  recordId: string
  fields: Record<string, unknown>
}

// Phương pháp chính - sử dụng API đúng như code mẫu của bạn
export const getTableData = async (tableId: string): Promise<TableRecord[]> => {
  try {
    console.log("🚀 === GETTING TABLE DATA WITH CORRECT API ===")
    const table = await bitable.base.getTableById(tableId)

    // Lấy metadata của các fields
    const fieldMetaList = await table.getFieldMetaList()
    console.log("📊 Field metadata:", fieldMetaList)

    // Tạo map tên cột → ID cột (như trong code mẫu của bạn)
    const fieldMap: Record<string, string> = {}
    for (const field of fieldMetaList) {
      fieldMap[field.name] = field.id
    }
    console.log("🗺️ Field map:", fieldMap)

    // Lấy dữ liệu bằng getRecords (như code mẫu của bạn)
    console.log("📥 Getting records with getRecords...")
    const result = await table.getRecords({ pageSize: 1000 })
    const allRecords = result.records
    console.log(`📊 Found ${allRecords.length} records`)

    if (allRecords.length === 0) {
      console.log("⚠️ No records found")
      return []
    }

    const processedRecords: TableRecord[] = []

    // Xử lý từng record
    for (const record of allRecords) {
      console.log(`📝 Processing record: ${record.recordId}`)
      const fields: Record<string, unknown> = {}

      // Lấy giá trị từng field bằng table.getCellValue (như code mẫu của bạn)
      for (const fieldMeta of fieldMetaList) {
        try {
          const cellValue = await table.getCellValue(fieldMeta.id, record.recordId)

          // Xử lý giá trị như trong code mẫu của bạn
          let processedValue = cellValue
          if (cellValue && typeof cellValue === "object" && (cellValue as any).text) {
            processedValue = (cellValue as any).text
          }

          fields[fieldMeta.name] = processedValue

          // Log chi tiết cho record đầu tiên
          if (processedRecords.length === 0) {
            console.log(`  📊 Field "${fieldMeta.name}": ${JSON.stringify(processedValue)}`)
          }
        } catch (cellError) {
          console.warn(`⚠️ Cannot get field ${fieldMeta.name}:`, cellError)
          fields[fieldMeta.name] = null
        }
      }

      processedRecords.push({
        recordId: record.recordId,
        fields: fields,
      })

      // Log record đầu tiên để debug
      if (processedRecords.length === 1) {
        console.log("📊 First record sample:", JSON.stringify(processedRecords[0], null, 2))
      }

      // Giới hạn để tránh quá tải (có thể tăng sau)
      if (processedRecords.length >= 100) {
        console.log("⚠️ Limited to 100 records for performance")
        break
      }
    }

    console.log(`✅ Successfully processed ${processedRecords.length} records`)

    // Kiểm tra xem có dữ liệu thực không
    const hasRealData = processedRecords.some((record) => {
      return Object.values(record.fields).some((value) => value !== null && value !== undefined && value !== "")
    })

    console.log(`📊 Has real data: ${hasRealData}`)

    if (hasRealData) {
      console.log("✅ SUCCESS: Found records with real data!")
      return processedRecords
    } else {
      console.log("⚠️ WARNING: All fields are null/empty")
      return processedRecords // Vẫn trả về để debug
    }
  } catch (error) {
    console.error("❌ getTableData failed:", error)
    throw error
  }
}

// Phương pháp backup - sử dụng getActiveTable nếu có thể
export const getActiveTableData = async (): Promise<TableRecord[]> => {
  try {
    console.log("🚀 === TRYING ACTIVE TABLE METHOD ===")

    // Thử lấy active table
    const table = await bitable.base.getActiveTable()
    console.log("📋 Got active table:", table)

    // Lấy metadata của các fields
    const fieldMetaList = await table.getFieldMetaList()
    console.log("📊 Field metadata:", fieldMetaList)

    // Tạo map tên cột → ID cột
    const fieldMap: Record<string, string> = {}
    for (const field of fieldMetaList) {
      fieldMap[field.name] = field.id
    }

    // Lấy dữ liệu
    const result = await table.getRecords({ pageSize: 1000 })
    const allRecords = result.records
    console.log(`📊 Found ${allRecords.length} records`)

    const processedRecords: TableRecord[] = []

    for (const record of allRecords) {
      const fields: Record<string, unknown> = {}

      for (const fieldMeta of fieldMetaList) {
        try {
          const cellValue = await table.getCellValue(fieldMeta.id, record.recordId)

          // Xử lý giá trị
          let processedValue = cellValue
          if (cellValue && typeof cellValue === "object" && (cellValue as any).text) {
            processedValue = (cellValue as any).text
          }

          fields[fieldMeta.name] = processedValue
        } catch (cellError) {
          fields[fieldMeta.name] = null
        }
      }

      processedRecords.push({
        recordId: record.recordId,
        fields: fields,
      })

      if (processedRecords.length >= 100) break
    }

    return processedRecords
  } catch (error) {
    console.error("❌ getActiveTableData failed:", error)
    throw error
  }
}

// Function debug với API đúng
export const debugTableStructure = async (tableId: string) => {
  try {
    console.log("🔍 === DEBUG WITH CORRECT API ===")
    const table = await bitable.base.getTableById(tableId)

    // Debug field metadata
    const fieldMetaList = await table.getFieldMetaList()
    console.log("📊 Fields:")
    fieldMetaList.forEach((field, index) => {
      console.log(`  ${index + 1}. "${field.name}" (ID: ${field.id}, Type: ${field.type})`)
    })

    // Debug records
    const result = await table.getRecords({ pageSize: 5 }) // Chỉ lấy 5 records để test
    console.log(`📝 Sample records (${result.records.length}):`)

    for (const record of result.records) {
      console.log(`\n📝 Record ID: ${record.recordId}`)

      for (const field of fieldMetaList.slice(0, 5)) {
        // Test 5 fields đầu
        try {
          const value = await table.getCellValue(field.id, record.recordId)
          console.log(`  📊 ${field.name}: ${JSON.stringify(value)}`)
        } catch (err) {
          console.log(`  ❌ ${field.name}: Error - ${err}`)
        }
      }
    }

    console.log("🔍 === END DEBUG ===")
  } catch (error) {
    console.error("❌ Debug failed:", error)
  }
}

// Function test với sample data như code của bạn
export const testTableAccess = async (tableId: string) => {
  try {
    console.log("🧪 === TESTING TABLE ACCESS ===")
    const table = await bitable.base.getTableById(tableId)

    // Test giống như code mẫu của bạn
    const fields = await table.getFieldMetaList()
    console.log(`📊 Found ${fields.length} fields`)

    // Tạo field map
    const fieldMap: Record<string, string> = {}
    for (const f of fields) {
      fieldMap[f.name] = f.id
      console.log(`🗺️ Field: "${f.name}" → ${f.id}`)
    }

    // Lấy records
    const result = await table.getRecords({ pageSize: 10 })
    console.log(`📝 Found ${result.records.length} records`)

    // Test lấy data từ record đầu tiên
    if (result.records.length > 0) {
      const firstRecord = result.records[0]
      console.log(`\n🧪 Testing first record: ${firstRecord.recordId}`)

      for (const fieldName of Object.keys(fieldMap).slice(0, 5)) {
        try {
          const value = await table.getCellValue(fieldMap[fieldName], firstRecord.recordId)
          console.log(`  ✅ ${fieldName}: ${JSON.stringify(value)}`)
        } catch (err) {
          console.log(`  ❌ ${fieldName}: ${err}`)
        }
      }
    }

    console.log("🧪 === END TEST ===")
    return true
  } catch (error) {
    console.error("❌ Test failed:", error)
    return false
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
