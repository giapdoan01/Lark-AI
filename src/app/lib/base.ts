import { bitable } from "@lark-base-open/js-sdk"

export interface TableRecord extends Record<string, unknown> {
  recordId: string
  fields: Record<string, unknown>
}

export const getTableData = async (tableId: string): Promise<TableRecord[]> => {
  try {
    console.log("🔍 Bắt đầu lấy dữ liệu từ tableId:", tableId)

    // Kiểm tra xem bitable có sẵn không
    if (!bitable) {
      throw new Error("Lark Base SDK chưa được khởi tạo")
    }

    console.log("✅ Lark Base SDK đã sẵn sàng")

    // Lấy bảng theo ID
    console.log("📋 Đang lấy bảng...")
    const table = await bitable.base.getTableById(tableId)

    if (!table) {
      throw new Error(`Không tìm thấy bảng với ID: ${tableId}`)
    }

    console.log("✅ Đã lấy được bảng")

    // Lấy danh sách view
    console.log("👁️ Đang lấy danh sách view...")
    const views = await table.getViewList()

    console.log("📊 Số lượng views:", views.length)

    if (views.length === 0) {
      throw new Error("Bảng không có view nào")
    }

    const view = views[0]
    console.log("✅ Sử dụng view đầu tiên")

    // Lấy tất cả records từ table (không phải view)
    console.log("📝 Đang lấy records...")
    const recordIds = await table.getRecordIdList()
    console.log("📊 Số lượng record IDs:", recordIds.length)

    if (recordIds.length === 0) {
      console.log("⚠️ Bảng không có dữ liệu")
      return []
    }

    // Lấy từng record theo ID
    const records: TableRecord[] = []
    for (const recordId of recordIds) {
      try {
        const record = await table.getRecordById(recordId)
        const fields = await record.getFieldValueList()

        records.push({
          recordId: recordId,
          fields: fields,
        })
      } catch (recordError) {
        console.warn(`⚠️ Không thể lấy record ${recordId}:`, recordError)
        // Tiếp tục với record tiếp theo
      }
    }

    console.log("✅ Đã xử lý xong dữ liệu:", records.length, "records")
    return records
  } catch (error) {
    console.error("❌ Chi tiết lỗi trong getTableData:", error)

    // Log thêm thông tin về lỗi
    if (error instanceof Error) {
      console.error("❌ Error message:", error.message)
      console.error("❌ Error stack:", error.stack)
    }

    throw new Error(`Không thể lấy dữ liệu từ bảng: ${error}`)
  }
}

// Phương pháp thay thế sử dụng getRecords nếu có
export const getTableDataAlternative = async (tableId: string): Promise<TableRecord[]> => {
  try {
    console.log("🔍 Thử phương pháp thay thế...")

    const table = await bitable.base.getTableById(tableId)

    // Thử sử dụng getRecords trực tiếp từ table
    if (typeof table.getRecords === "function") {
      console.log("📝 Sử dụng table.getRecords...")
      const records = await table.getRecords()

      return records.map((record: any) => ({
        recordId: record.recordId || record.id,
        fields: record.fields || record,
      }))
    }

    // Fallback về phương pháp chính
    return await getTableData(tableId)
  } catch (error) {
    console.error("❌ Lỗi phương pháp thay thế:", error)
    throw error
  }
}

// Thêm function để kiểm tra SDK
export const checkSDKStatus = async () => {
  try {
    console.log("🔍 Kiểm tra trạng thái SDK...")

    if (!bitable) {
      return { status: "error", message: "SDK chưa được load" }
    }

    // Thử lấy danh sách bảng
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

// Thêm function debug để test các API methods
export const debugTableAPI = async (tableId: string) => {
  try {
    const table = await bitable.base.getTableById(tableId)

    console.log("🔍 Debug Table API:")
    console.log("- table object:", table)
    console.log("- available methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(table)))

    // Test các methods khác nhau
    const methods = ["getRecordIdList", "getRecords", "getFieldMetaList", "getViewList"]

    for (const method of methods) {
      if (typeof (table as any)[method] === "function") {
        console.log(`✅ ${method} available`)
        try {
          const result = await (table as any)[method]()
          console.log(`📊 ${method} result:`, result)
        } catch (err) {
          console.log(`❌ ${method} error:`, err)
        }
      } else {
        console.log(`❌ ${method} not available`)
      }
    }
  } catch (error) {
    console.error("❌ Debug error:", error)
  }
}
