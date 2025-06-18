import { bitable } from "@lark-base-open/js-sdk"

export interface TableRecord extends Record<string, unknown> {
  recordId: string
  fields: Record<string, unknown>
}

// Function lấy TẤT CẢ dữ liệu với pagination
export const getTableData = async (tableId: string): Promise<TableRecord[]> => {
  try {
    console.log("🚀 === GETTING ALL TABLE DATA WITH PAGINATION ===")
    const table = await bitable.base.getTableById(tableId)

    // Lấy metadata của các fields
    const fieldMetaList = await table.getFieldMetaList()
    console.log("📊 Field metadata:", fieldMetaList)

    // Tạo map tên cột → ID cột
    const fieldMap: Record<string, string> = {}
    for (const field of fieldMetaList) {
      fieldMap[field.name] = field.id
    }
    console.log("🗺️ Field map:", fieldMap)

    const allProcessedRecords: TableRecord[] = []
    let pageToken: string | undefined = undefined
    let pageNumber = 1
    const pageSize = 1000 // Kích thước trang tối đa

    // Lặp qua tất cả các trang
    do {
      console.log(`📄 Đang lấy trang ${pageNumber}...`)

      // Tạo options cho getRecords
      const options: any = { pageSize }
      if (pageToken) {
        options.pageToken = pageToken
      }

      // Lấy dữ liệu trang hiện tại
      const result = await table.getRecords(options)
      const currentPageRecords = result.records

      console.log(`📊 Trang ${pageNumber}: ${currentPageRecords.length} records`)

      // Xử lý từng record trong trang hiện tại
      for (const record of currentPageRecords) {
        const fields: Record<string, unknown> = {}

        // Lấy giá trị từng field
        for (const fieldMeta of fieldMetaList) {
          try {
            const cellValue = await table.getCellValue(fieldMeta.id, record.recordId)

            // Xử lý giá trị như trong code mẫu
            let processedValue = cellValue
            if (cellValue && typeof cellValue === "object" && (cellValue as any).text) {
              processedValue = (cellValue as any).text
            }

            fields[fieldMeta.name] = processedValue
          } catch (cellError) {
            console.warn(`⚠️ Cannot get field ${fieldMeta.name} for record ${record.recordId}:`, cellError)
            fields[fieldMeta.name] = null
          }
        }

        allProcessedRecords.push({
          recordId: record.recordId,
          fields: fields,
        })
      }

      // Cập nhật pageToken cho trang tiếp theo
      pageToken = result.hasMore ? result.pageToken : undefined
      pageNumber++

      // Log tiến trình
      console.log(`📊 Đã xử lý: ${allProcessedRecords.length} records tổng cộng`)

      // Kiểm tra xem còn trang nào không
      if (result.hasMore) {
        console.log(`➡️ Còn dữ liệu, tiếp tục trang ${pageNumber}...`)
      } else {
        console.log(`✅ Đã lấy hết tất cả dữ liệu!`)
      }
    } while (pageToken) // Tiếp tục nếu còn pageToken

    console.log(`🎉 HOÀN THÀNH: Đã lấy tổng cộng ${allProcessedRecords.length} records từ ${pageNumber - 1} trang`)

    // Kiểm tra xem có dữ liệu thực không
    const hasRealData = allProcessedRecords.some((record) => {
      return Object.values(record.fields).some((value) => value !== null && value !== undefined && value !== "")
    })

    console.log(`📊 Has real data: ${hasRealData}`)

    // Log sample data từ record đầu tiên
    if (allProcessedRecords.length > 0) {
      console.log("📊 First record sample:", JSON.stringify(allProcessedRecords[0], null, 2))
    }

    if (hasRealData) {
      console.log("✅ SUCCESS: Found records with real data!")
      return allProcessedRecords
    } else {
      console.log("⚠️ WARNING: All fields are null/empty")
      return allProcessedRecords // Vẫn trả về để debug
    }
  } catch (error) {
    console.error("❌ getTableData failed:", error)
    throw error
  }
}

// Function lấy thống kê tổng quan về bảng
export const getTableStats = async (tableId: string) => {
  try {
    console.log("📊 === GETTING TABLE STATISTICS ===")
    const table = await bitable.base.getTableById(tableId)

    // Lấy tổng số records
    const recordIds = await table.getRecordIdList()
    const totalRecords = recordIds.length

    // Lấy field metadata
    const fieldMetaList = await table.getFieldMetaList()
    const totalFields = fieldMetaList.length

    console.log(`📊 Table Statistics:`)
    console.log(`  - Total Records: ${totalRecords}`)
    console.log(`  - Total Fields: ${totalFields}`)
    console.log(`  - Fields:`)
    fieldMetaList.forEach((field, index) => {
      console.log(`    ${index + 1}. ${field.name} (${field.type})`)
    })

    return {
      totalRecords,
      totalFields,
      fields: fieldMetaList.map((f) => ({ name: f.name, type: f.type, id: f.id })),
    }
  } catch (error) {
    console.error("❌ getTableStats failed:", error)
    throw error
  }
}

// Function test với sample nhỏ trước khi lấy hết
export const testTableDataSample = async (tableId: string, sampleSize = 5): Promise<TableRecord[]> => {
  try {
    console.log(`🧪 === TESTING WITH ${sampleSize} SAMPLE RECORDS ===`)
    const table = await bitable.base.getTableById(tableId)

    // Lấy metadata của các fields
    const fieldMetaList = await table.getFieldMetaList()
    console.log("📊 Field metadata:", fieldMetaList)

    // Lấy sample records
    const result = await table.getRecords({ pageSize: sampleSize })
    const sampleRecords = result.records
    console.log(`📊 Sample: ${sampleRecords.length} records`)

    const processedRecords: TableRecord[] = []

    for (const record of sampleRecords) {
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
    }

    console.log("🧪 Sample data:", JSON.stringify(processedRecords, null, 2))
    return processedRecords
  } catch (error) {
    console.error("❌ testTableDataSample failed:", error)
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

    // Debug records với sample nhỏ
    const result = await table.getRecords({ pageSize: 3 }) // Chỉ lấy 3 records để test
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

    // Kiểm tra pagination info
    console.log(`\n📄 Pagination info:`)
    console.log(`  - hasMore: ${result.hasMore}`)
    console.log(`  - pageToken: ${result.pageToken}`)

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
    console.log(`📄 Has more pages: ${result.hasMore}`)

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
