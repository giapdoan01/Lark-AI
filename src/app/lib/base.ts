import { bitable } from "@lark-base-open/js-sdk"

export interface TableRecord {
  recordId: string
  fields: Record<string, unknown>
}

export const getTableData = async (tableId: string): Promise<TableRecord[]> => {
  try {
    // Lấy bảng theo ID
    const table = await bitable.base.getTableById(tableId)

    // Lấy danh sách view (chọn view đầu tiên)
    const views = await table.getViewList()
    if (views.length === 0) {
      throw new Error("Bảng không có view nào")
    }

    const view = views[0]

    // Lấy tất cả records từ view
    const records = await view.getRecords()

    // Chuyển đổi dữ liệu thành format dễ đọc
    return records.map((record) => ({
      recordId: record.recordId,
      fields: record.fields,
    }))
  } catch (error) {
    console.error("❌ Lỗi trong getTableData:", error)
    throw new Error(`Không thể lấy dữ liệu từ bảng: ${error}`)
  }
}
