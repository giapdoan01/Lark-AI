import { bitable } from "@lark-base-open/js-sdk"

export interface TableRecord extends Record<string, unknown> {
  recordId: string
  fields: Record<string, unknown>
}

// Hàm chuyển giá trị thành chuỗi an toàn cho CSV
const escapeCSVValue = (value: unknown): string => {
  if (value === null || value === undefined) return ""
  const str = String(value)
  // Thoát dấu ngoặc kép và bọc giá trị chứa dấu phẩy hoặc ngoặc kép
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// Function lấy TẤT CẢ dữ liệu dưới dạng CSV
export const getTableDataAsCSV = async (tableId: string): Promise<string> => {
  try {
    console.log("🚀 === GETTING ALL TABLE DATA AS CSV ===")
    const table = await bitable.base.getTableById(tableId)

    // Lấy metadata của các fields
    const fieldMetaList = await table.getFieldMetaList()
    console.log("📊 Field metadata:", fieldMetaList)

    // Tạo header CSV
    const headers = ["recordId", ...fieldMetaList.map((field) => field.name)]
    let csvContent = headers.map(escapeCSVValue).join(",") + "\n"

    let pageToken: string | undefined = undefined
    let pageNumber = 1
    const pageSize = 1000
    let totalRecords = 0

    // Lặp qua tất cả các trang
    do {
      console.log(`📄 Đang lấy trang ${pageNumber}...`)

      const options: any = { pageSize }
      if (pageToken) {
        options.pageToken = pageToken
      }

      const result = await table.getRecords(options)
      const currentPageRecords = result.records

      console.log(`📊 Trang ${pageNumber}: ${currentPageRecords.length} records`)

      // Xử lý từng record
      for (const record of currentPageRecords) {
        const row: string[] = [record.recordId]
        for (const fieldMeta of fieldMetaList) {
          try {
            let cellValue = await table.getCellValue(fieldMeta.id, record.recordId)
            if (cellValue && typeof cellValue === "object" && (cellValue as any).text) {
              cellValue = (cellValue as any).text
            }
            row.push(escapeCSVValue(cellValue))
          } catch (cellError) {
            console.warn(`⚠️ Cannot get field ${fieldMeta.name} for record ${record.recordId}:`, cellError)
            row.push("")
          }
        }
        csvContent += row.join(",") + "\n"
        totalRecords++
      }

      pageToken = result.hasMore ? result.pageToken : undefined
      pageNumber++
      console.log(`📊 Đã xử lý: ${totalRecords} records tổng cộng`)

      if (result.hasMore) {
        console.log(`➡️ Còn dữ liệu, tiếp tục trang ${pageNumber}...`)
      } else {
        console.log(`✅ Đã lấy hết tất cả dữ liệu!`)
      }
    } while (pageToken)

    console.log(`🎉 HOÀN THÀNH: Đã lấy tổng cộng ${totalRecords} records dưới dạng CSV`)
    console.log(`📊 CSV size: ${csvContent.length} characters`)

    return csvContent
  } catch (error) {
    console.error("❌ getTableDataAsCSV failed:", error)
    throw error
  }
}

// Các hàm khác giữ nguyên (getTableStats, testTableDataSample, debugTableStructure, testTableAccess, checkSDKStatus)
export const getTableData = async (tableId: string): Promise<TableRecord[]> => {
  // ... (giữ nguyên code gốc)
}

export const getTableStats = async (tableId: string) => {
  // ... (giữ nguyên code gốc)
}

export const testTableDataSample = async (tableId: string, sampleSize = 5): Promise<TableRecord[]> => {
  // ... (giữ nguyên code gốc)
}

export const debugTableStructure = async (tableId: string) => {
  // ... (giữ nguyên code gốc)
}

export const testTableAccess = async (tableId: string) => {
  // ... (giữ nguyên code gốc)
}

export const checkSDKStatus = async () => {
  // ... (giữ nguyên code gốc)
}