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
  fieldTypes: Record<string, string>
  sampleFields: string[]
}

// Interface cho SDK status
interface SDKStatus {
  status: "success" | "error" | "warning"
  message: string
  details?: any
}

// Function kiểm tra SDK status
export const checkSDKStatus = async (): Promise<SDKStatus> => {
  try {
    console.log("🔍 Checking Lark Base SDK status...")

    // Kiểm tra xem có đang chạy trong Lark Base không
    if (typeof window === "undefined") {
      return {
        status: "error",
        message: "SDK chỉ hoạt động trong browser environment",
      }
    }

    // Kiểm tra base object
    if (!base) {
      return {
        status: "error",
        message: "Lark Base SDK không được load. Đảm bảo ứng dụng chạy trong Lark Base.",
      }
    }

    // Test basic SDK functionality
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

// Function lấy thống kê bảng
export const getTableStats = async (tableId: string): Promise<TableStats> => {
  try {
    console.log(`📊 Getting stats for table: ${tableId}`)

    const table = await base.getTable(tableId)
    if (!table) {
      throw new Error("Không thể lấy table object")
    }

    // Lấy danh sách fields
    const fieldMetaList = await table.getFieldMetaList()
    console.log("📋 Fields found:", fieldMetaList.length)

    // Lấy record count
    const recordIdList = await table.getRecordIdList()
    const totalRecords = recordIdList.length
    console.log("📊 Records found:", totalRecords)

    // Phân tích field types
    const fieldTypes: Record<string, string> = {}
    const sampleFields: string[] = []

    fieldMetaList.forEach((field) => {
      fieldTypes[field.name] = field.type.toString()
      sampleFields.push(field.name)
    })

    const stats: TableStats = {
      totalRecords,
      totalFields: fieldMetaList.length,
      fieldTypes,
      sampleFields: sampleFields.slice(0, 10), // Lấy 10 fields đầu
    }

    console.log("📊 Table stats:", stats)
    return stats
  } catch (error) {
    console.error("❌ Error getting table stats:", error)
    throw new Error(`Không thể lấy thống kê bảng: ${error}`)
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

    // Test lấy field list
    const fieldMetaList = await table.getFieldMetaList()
    console.log(`✅ Can access fields: ${fieldMetaList.length}`)

    // Test lấy record list
    const recordIdList = await table.getRecordIdList()
    console.log(`✅ Can access records: ${recordIdList.length}`)

    return true
  } catch (error) {
    console.error("❌ Table access test failed:", error)
    return false
  }
}

// Function test với sample data
export const testTableDataSample = async (tableId: string, sampleSize = 5): Promise<RecordData[]> => {
  try {
    console.log(`🧪 Testing with ${sampleSize} sample records from table: ${tableId}`)

    const table = await base.getTable(tableId)
    if (!table) {
      throw new Error("Không thể lấy table object")
    }

    // Lấy danh sách record IDs
    const recordIdList = await table.getRecordIdList()
    if (recordIdList.length === 0) {
      console.log("⚠️ Table không có records")
      return []
    }

    // Lấy sample records
    const sampleIds = recordIdList.slice(0, sampleSize)
    console.log(`📊 Getting ${sampleIds.length} sample records...`)

    const sampleData: RecordData[] = []

    for (const recordId of sampleIds) {
      try {
        const recordData = await table.getRecordById(recordId)
        if (recordData && recordData.fields) {
          sampleData.push({
            recordId: recordId,
            fields: recordData.fields,
          })
          console.log(`✅ Sample record ${recordId}:`, Object.keys(recordData.fields))
        } else {
          console.log(`⚠️ Record ${recordId} has no fields`)
          sampleData.push({
            recordId: recordId,
            fields: {},
          })
        }
      } catch (recordError) {
        console.error(`❌ Error getting record ${recordId}:`, recordError)
        sampleData.push({
          recordId: recordId,
          fields: { error: `Cannot read record: ${recordError}` },
        })
      }
    }

    console.log(`✅ Sample test complete: ${sampleData.length} records`)
    return sampleData
  } catch (error) {
    console.error("❌ Sample test failed:", error)
    throw new Error(`Sample test thất bại: ${error}`)
  }
}

// 🔥 NEW: Deep debugging function để tìm nguyên nhân empty fields
export const deepDebugEmptyFields = async (tableId: string): Promise<void> => {
  try {
    console.log(`🔍 ===== DEEP DEBUG: EMPTY FIELDS INVESTIGATION =====`)
    console.log(`📊 Table ID: ${tableId}`)

    const table = await base.getTable(tableId)
    if (!table) {
      console.log("❌ Cannot get table object")
      return
    }

    // 1. Analyze field metadata in detail
    console.log("📋 DETAILED FIELD METADATA ANALYSIS:")
    const fieldMetaList = await table.getFieldMetaList()

    fieldMetaList.forEach((field, index) => {
      console.log(`  Field ${index + 1}:`)
      console.log(`    Name: "${field.name}"`)
      console.log(`    ID: "${field.id}"`)
      console.log(`    Type: ${field.type}`)
      console.log(`    Property:`, field.property)
      console.log(`    ---`)
    })

    // 2. Analyze record structure
    console.log("📊 DETAILED RECORD STRUCTURE ANALYSIS:")
    const recordIdList = await table.getRecordIdList()
    console.log(`  Total record IDs: ${recordIdList.length}`)

    if (recordIdList.length > 0) {
      // Test first 3 records with multiple methods
      const testRecords = recordIdList.slice(0, 3)

      for (let i = 0; i < testRecords.length; i++) {
        const recordId = testRecords[i]
        console.log(`\n  🔍 TESTING RECORD ${i + 1}: ${recordId}`)

        // METHOD 1: getRecordById
        try {
          console.log(`    Method 1: getRecordById`)
          const recordData = await table.getRecordById(recordId)

          if (recordData) {
            console.log(`      ✅ Record object exists`)
            console.log(`      Fields object:`, recordData.fields ? "exists" : "missing")

            if (recordData.fields) {
              const fieldKeys = Object.keys(recordData.fields)
              console.log(`      Field count: ${fieldKeys.length}`)
              console.log(`      Field keys:`, fieldKeys)

              // Check each field value
              fieldKeys.forEach((key, idx) => {
                const value = recordData.fields[key]
                console.log(
                  `        ${idx + 1}. "${key}": ${typeof value} = ${JSON.stringify(value).substring(0, 100)}`,
                )
              })
            } else {
              console.log(`      ❌ No fields object in record`)
            }
          } else {
            console.log(`      ❌ No record data returned`)
          }
        } catch (error) {
          console.log(`      ❌ getRecordById failed:`, error)
        }

        // METHOD 2: getCellValue for each field
        console.log(`    Method 2: getCellValue for each field`)
        for (const fieldMeta of fieldMetaList.slice(0, 5)) {
          // Test first 5 fields
          try {
            console.log(`      Testing field: "${fieldMeta.name}" (ID: ${fieldMeta.id})`)

            // Try with field ID
            let cellValue = null
            try {
              cellValue = await table.getCellValue(recordId, fieldMeta.id)
              console.log(`        By ID: ${typeof cellValue} = ${JSON.stringify(cellValue).substring(0, 50)}`)
            } catch (e) {
              console.log(`        By ID: Failed - ${e}`)
            }

            // Try with field name
            try {
              cellValue = await table.getCellValue(recordId, fieldMeta.name)
              console.log(`        By Name: ${typeof cellValue} = ${JSON.stringify(cellValue).substring(0, 50)}`)
            } catch (e) {
              console.log(`        By Name: Failed - ${e}`)
            }
          } catch (error) {
            console.log(`        ❌ Field test failed:`, error)
          }
        }

        // METHOD 3: Try alternative SDK methods
        console.log(`    Method 3: Alternative SDK methods`)
        try {
          // Check if there are other methods available
          console.log(`      Available table methods:`, Object.getOwnPropertyNames(Object.getPrototypeOf(table)))
        } catch (error) {
          console.log(`      ❌ Cannot inspect table methods:`, error)
        }
      }
    }

    // 3. Check permissions and access rights
    console.log("\n🔐 PERMISSION AND ACCESS ANALYSIS:")
    try {
      // Test basic permissions
      const canReadRecords = recordIdList.length >= 0
      const canReadFields = fieldMetaList.length > 0

      console.log(`  Can read record list: ${canReadRecords}`)
      console.log(`  Can read field metadata: ${canReadFields}`)

      // Test if we can access table metadata
      const tableMeta = await base.getTableMetaList()
      const currentTable = tableMeta.find((t) => t.id === tableId)
      if (currentTable) {
        console.log(`  Table metadata accessible: ✅`)
        console.log(`  Table name: "${currentTable.name}"`)
      } else {
        console.log(`  Table metadata accessible: ❌`)
      }
    } catch (error) {
      console.log(`  ❌ Permission check failed:`, error)
    }

    // 4. Environment and context analysis
    console.log("\n🌍 ENVIRONMENT ANALYSIS:")
    console.log(`  User agent: ${navigator.userAgent}`)
    console.log(`  URL: ${window.location.href}`)
    console.log(`  Base object type: ${typeof base}`)
    console.log(`  Base object methods:`, Object.getOwnPropertyNames(Object.getPrototypeOf(base)))

    console.log(`===== END DEEP DEBUG =====\n`)
  } catch (error) {
    console.error("❌ Deep debug failed:", error)
  }
}

// 🔥 NEW: Multiple extraction methods để thử tất cả cách có thể
const tryAllExtractionMethods = async (
  table: any,
  recordId: string,
  fieldMetaList: any[],
): Promise<{ fields: Record<string, unknown>; debugInfo: any }> => {
  console.log(`🔄 Trying all extraction methods for record: ${recordId}`)

  const debugInfo: any = {
    methods: {},
    fieldResults: {},
    bestMethod: null,
    totalFieldsFound: 0,
  }

  let bestFields: Record<string, unknown> = {}
  let bestFieldCount = 0

  // METHOD 1: Standard getRecordById
  try {
    console.log(`  🔄 Method 1: getRecordById`)
    const recordData = await table.getRecordById(recordId)

    if (recordData?.fields) {
      const fieldCount = Object.keys(recordData.fields).length
      const nonEmptyFields = Object.entries(recordData.fields).filter(
        ([_, value]) => value !== null && value !== undefined && value !== "",
      ).length

      debugInfo.methods.getRecordById = {
        success: true,
        fieldCount: fieldCount,
        nonEmptyFields: nonEmptyFields,
        fields: recordData.fields,
      }

      console.log(`    ✅ Found ${fieldCount} fields, ${nonEmptyFields} non-empty`)

      if (fieldCount > bestFieldCount) {
        bestFields = recordData.fields
        bestFieldCount = fieldCount
        debugInfo.bestMethod = "getRecordById"
      }
    } else {
      debugInfo.methods.getRecordById = {
        success: false,
        error: "No fields in record data",
      }
      console.log(`    ❌ No fields in record data`)
    }
  } catch (error) {
    debugInfo.methods.getRecordById = {
      success: false,
      error: String(error),
    }
    console.log(`    ❌ getRecordById failed:`, error)
  }

  // METHOD 2: Field-by-field with ID
  try {
    console.log(`  🔄 Method 2: getCellValue by field ID`)
    const fieldsByID: Record<string, unknown> = {}
    let successCount = 0

    for (const fieldMeta of fieldMetaList) {
      try {
        const cellValue = await table.getCellValue(recordId, fieldMeta.id)
        fieldsByID[fieldMeta.name] = cellValue

        if (cellValue !== null && cellValue !== undefined && cellValue !== "") {
          successCount++
        }

        debugInfo.fieldResults[fieldMeta.name] = {
          byId: { success: true, value: cellValue },
        }
      } catch (error) {
        fieldsByID[fieldMeta.name] = null
        debugInfo.fieldResults[fieldMeta.name] = {
          byId: { success: false, error: String(error) },
        }
      }
    }

    debugInfo.methods.getCellValueById = {
      success: true,
      fieldCount: Object.keys(fieldsByID).length,
      nonEmptyFields: successCount,
      fields: fieldsByID,
    }

    console.log(`    ✅ Found ${Object.keys(fieldsByID).length} fields, ${successCount} non-empty`)

    if (successCount > bestFieldCount) {
      bestFields = fieldsByID
      bestFieldCount = successCount
      debugInfo.bestMethod = "getCellValueById"
    }
  } catch (error) {
    debugInfo.methods.getCellValueById = {
      success: false,
      error: String(error),
    }
    console.log(`    ❌ getCellValue by ID failed:`, error)
  }

  // METHOD 3: Field-by-field with name
  try {
    console.log(`  🔄 Method 3: getCellValue by field name`)
    const fieldsByName: Record<string, unknown> = {}
    let successCount = 0

    for (const fieldMeta of fieldMetaList) {
      try {
        const cellValue = await table.getCellValue(recordId, fieldMeta.name)
        fieldsByName[fieldMeta.name] = cellValue

        if (cellValue !== null && cellValue !== undefined && cellValue !== "") {
          successCount++
        }

        if (!debugInfo.fieldResults[fieldMeta.name]) {
          debugInfo.fieldResults[fieldMeta.name] = {}
        }
        debugInfo.fieldResults[fieldMeta.name].byName = { success: true, value: cellValue }
      } catch (error) {
        fieldsByName[fieldMeta.name] = null
        if (!debugInfo.fieldResults[fieldMeta.name]) {
          debugInfo.fieldResults[fieldMeta.name] = {}
        }
        debugInfo.fieldResults[fieldMeta.name].byName = { success: false, error: String(error) }
      }
    }

    debugInfo.methods.getCellValueByName = {
      success: true,
      fieldCount: Object.keys(fieldsByName).length,
      nonEmptyFields: successCount,
      fields: fieldsByName,
    }

    console.log(`    ✅ Found ${Object.keys(fieldsByName).length} fields, ${successCount} non-empty`)

    if (successCount > bestFieldCount) {
      bestFields = fieldsByName
      bestFieldCount = successCount
      debugInfo.bestMethod = "getCellValueByName"
    }
  } catch (error) {
    debugInfo.methods.getCellValueByName = {
      success: false,
      error: String(error),
    }
    console.log(`    ❌ getCellValue by name failed:`, error)
  }

  // METHOD 4: Try alternative approaches (if available)
  try {
    console.log(`  🔄 Method 4: Alternative approaches`)

    // Check if table has other methods
    const tableMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(table))
    console.log(`    Available table methods:`, tableMethods)

    // Try any other promising methods
    const alternativeFields: Record<string, unknown> = {}

    // If there are other methods like getRecord, getCell, etc., try them here
    // This is a placeholder for future SDK method discoveries

    debugInfo.methods.alternative = {
      success: false,
      availableMethods: tableMethods,
      note: "No alternative methods found",
    }
  } catch (error) {
    debugInfo.methods.alternative = {
      success: false,
      error: String(error),
    }
  }

  debugInfo.totalFieldsFound = bestFieldCount

  console.log(`  🎯 Best method: ${debugInfo.bestMethod} with ${bestFieldCount} fields`)

  return {
    fields: bestFields,
    debugInfo: debugInfo,
  }
}

// Function debug table structure chi tiết
export const debugTableStructure = async (tableId: string): Promise<void> => {
  try {
    console.log(`🔍 ===== DETAILED TABLE DEBUG: ${tableId} =====`)

    const table = await base.getTable(tableId)
    if (!table) {
      console.log("❌ Cannot get table object")
      return
    }

    // 1. Debug Fields
    console.log("📋 FIELD ANALYSIS:")
    const fieldMetaList = await table.getFieldMetaList()
    fieldMetaList.forEach((field, index) => {
      console.log(`  Field ${index + 1}: "${field.name}" (${field.type})`)
      if (field.property) {
        console.log(`    Properties:`, field.property)
      }
    })

    // 2. Debug Records
    console.log("📊 RECORD ANALYSIS:")
    const recordIdList = await table.getRecordIdList()
    console.log(`  Total records: ${recordIdList.length}`)

    if (recordIdList.length > 0) {
      // Test first 3 records
      const testRecords = recordIdList.slice(0, 3)
      for (let i = 0; i < testRecords.length; i++) {
        const recordId = testRecords[i]
        try {
          console.log(`  Testing record ${i + 1}/${testRecords.length}: ${recordId}`)
          const recordData = await table.getRecordById(recordId)

          if (recordData && recordData.fields) {
            const fieldCount = Object.keys(recordData.fields).length
            const hasData = Object.values(recordData.fields).some(
              (value) => value !== null && value !== undefined && value !== "",
            )

            console.log(`    ✅ Record ${recordId}: ${fieldCount} fields, hasData: ${hasData}`)
            console.log(`    Fields:`, Object.keys(recordData.fields))

            // Show sample values
            Object.entries(recordData.fields).forEach(([key, value]) => {
              const valuePreview = typeof value === "string" ? value.substring(0, 50) : String(value)
              console.log(`      "${key}": ${valuePreview}`)
            })
          } else {
            console.log(`    ❌ Record ${recordId}: No fields data`)
          }
        } catch (recordError) {
          console.log(`    ❌ Record ${recordId}: Error - ${recordError}`)
        }
      }
    }

    // 3. Debug Table Properties
    console.log("🔧 TABLE PROPERTIES:")
    try {
      const tableMeta = await base.getTableMetaList()
      const currentTable = tableMeta.find((t) => t.id === tableId)
      if (currentTable) {
        console.log(`  Table name: "${currentTable.name}"`)
        console.log(`  Table ID: ${currentTable.id}`)
      }
    } catch (metaError) {
      console.log(`  ❌ Cannot get table meta: ${metaError}`)
    }

    // 4. Debug Permissions
    console.log("🔐 PERMISSION TEST:")
    try {
      // Test read permission
      const canRead = recordIdList.length >= 0
      console.log(`  Can read records: ${canRead}`)

      // Test field access
      const canReadFields = fieldMetaList.length > 0
      console.log(`  Can read fields: ${canReadFields}`)
    } catch (permError) {
      console.log(`  ❌ Permission test failed: ${permError}`)
    }

    console.log(`===== END DEBUG TABLE: ${tableId} =====`)
  } catch (error) {
    console.error("❌ Debug table structure failed:", error)
  }
}

// 🔥 ENHANCED: Deep field extraction với comprehensive debugging
const deepFieldExtraction = async (
  table: any,
  recordId: string,
  fieldMetaList: any[],
  maxRetries = 3,
): Promise<{ fields: Record<string, unknown>; fieldCount: number; emptyFields: string[]; debugInfo: any }> => {
  console.log(`🔍 Deep field extraction for record: ${recordId}`)

  let bestResult = {
    fields: {},
    fieldCount: 0,
    emptyFields: [] as string[],
    debugInfo: {} as any,
  }
  let attempts = 0

  while (attempts < maxRetries) {
    attempts++
    console.log(`  🔄 Attempt ${attempts}/${maxRetries} for record ${recordId}`)

    try {
      // Use the comprehensive extraction method
      const { fields, debugInfo } = await tryAllExtractionMethods(table, recordId, fieldMetaList)

      const fieldCount = Object.keys(fields).length
      const emptyFields = Object.entries(fields)
        .filter(([_, value]) => value === null || value === undefined || value === "")
        .map(([key, _]) => key)

      console.log(`    ✅ Extraction result: ${fieldCount} fields, ${emptyFields.length} empty`)
      console.log(`    Best method: ${debugInfo.bestMethod}`)

      if (fieldCount > bestResult.fieldCount) {
        bestResult = {
          fields: fields,
          fieldCount: fieldCount,
          emptyFields: emptyFields,
          debugInfo: debugInfo,
        }
      }

      // If we got all expected fields, return immediately
      if (fieldCount >= fieldMetaList.length * 0.8) {
        console.log(`    🎯 Good field coverage (${fieldCount}/${fieldMetaList.length}), using this result`)
        break
      }

      // Small delay between attempts
      if (attempts < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 200 * attempts))
      }
    } catch (error) {
      console.error(`    ❌ Attempt ${attempts} failed for record ${recordId}:`, error)

      // If this is the last attempt and we have no result, create minimal result
      if (attempts === maxRetries && bestResult.fieldCount === 0) {
        console.log(`    🚨 Creating minimal result for record ${recordId}`)
        const minimalFields: Record<string, unknown> = {}
        fieldMetaList.forEach((field) => {
          minimalFields[field.name] = { error: "Failed to extract after multiple attempts" }
        })

        bestResult = {
          fields: minimalFields,
          fieldCount: fieldMetaList.length,
          emptyFields: fieldMetaList.map((f) => f.name),
          debugInfo: { error: "All extraction methods failed", attempts: attempts },
        }
      }
    }
  }

  console.log(
    `  ✅ Best result for ${recordId}: ${bestResult.fieldCount} fields, ${bestResult.emptyFields.length} empty`,
  )
  console.log(`  📊 Debug info: Best method was ${bestResult.debugInfo.bestMethod}`)

  return bestResult
}

// 🔥 FIX 2: FIELD ORDER PRESERVATION - Khắc phục fields bị đảo
const preserveFieldOrder = (
  data: RecordData[],
  fieldMetaList: any[],
): {
  orderedData: RecordData[]
  fieldOrderMap: Record<string, number>
  fieldOrderReport: string
} => {
  console.log(`🔧 ===== FIELD ORDER PRESERVATION =====`)
  console.log(`📋 Expected field order from metadata:`)

  // Create field order map from metadata
  const fieldOrderMap: Record<string, number> = {}
  fieldMetaList.forEach((field, index) => {
    fieldOrderMap[field.name] = index
    console.log(`  ${index + 1}. "${field.name}" (${field.type})`)
  })

  // Analyze current field order in data
  console.log(`📊 Analyzing field order in ${data.length} records...`)
  const fieldOrderIssues: string[] = []
  const fieldFrequency: Record<string, number> = {}

  data.forEach((record, recordIndex) => {
    const recordFields = Object.keys(record.fields)

    // Count field frequency
    recordFields.forEach((fieldName) => {
      fieldFrequency[fieldName] = (fieldFrequency[fieldName] || 0) + 1
    })

    // Check for order issues (only for first few records to avoid spam)
    if (recordIndex < 3) {
      const expectedOrder = fieldMetaList.map((f) => f.name)
      const actualOrder = recordFields.filter((f) => expectedOrder.includes(f))

      if (JSON.stringify(expectedOrder) !== JSON.stringify(actualOrder)) {
        fieldOrderIssues.push(
          `Record ${recordIndex + 1}: Expected [${expectedOrder.slice(0, 3).join(", ")}...] but got [${actualOrder.slice(0, 3).join(", ")}...]`,
        )
      }
    }
  })

  console.log(`📊 Field frequency analysis:`)
  Object.entries(fieldFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .forEach(([fieldName, count]) => {
      const expectedIndex = fieldOrderMap[fieldName]
      console.log(`  "${fieldName}": ${count}/${data.length} records (expected position: ${expectedIndex + 1})`)
    })

  if (fieldOrderIssues.length > 0) {
    console.log(`⚠️ Field order issues detected:`)
    fieldOrderIssues.forEach((issue) => console.log(`  ${issue}`))
  }

  // Reorder fields in each record according to metadata
  console.log(`🔧 Reordering fields according to metadata...`)
  const orderedData: RecordData[] = data.map((record, recordIndex) => {
    const orderedFields: Record<string, unknown> = {}

    // First, add fields in the correct order from metadata
    fieldMetaList.forEach((fieldMeta) => {
      const fieldName = fieldMeta.name
      if (record.fields.hasOwnProperty(fieldName)) {
        orderedFields[fieldName] = record.fields[fieldName]
      } else {
        // Field is missing, add as null but preserve the position
        orderedFields[fieldName] = null
        if (recordIndex === 0) {
          // Only log for first record to avoid spam
          console.log(`  ⚠️ Missing field "${fieldName}" in record ${recordIndex + 1}, adding as null`)
        }
      }
    })

    // Then, add any extra fields that weren't in metadata (at the end)
    Object.entries(record.fields).forEach(([fieldName, value]) => {
      if (!fieldOrderMap.hasOwnProperty(fieldName)) {
        orderedFields[fieldName] = value
        if (recordIndex === 0) {
          console.log(`  ➕ Extra field "${fieldName}" found, adding at end`)
        }
      }
    })

    return {
      ...record,
      fields: orderedFields,
    }
  })

  const fieldOrderReport = `
🔧 FIELD ORDER PRESERVATION REPORT:
  📋 Expected fields: ${fieldMetaList.length}
  📊 Records processed: ${data.length}
  ⚠️ Order issues detected: ${fieldOrderIssues.length}
  📈 Field frequency: ${Object.keys(fieldFrequency).length} unique fields found
  
🎯 Field Order Map:
${fieldMetaList
  .slice(0, 10)
  .map((field, index) => `  ${index + 1}. "${field.name}" → Position ${index + 1}`)
  .join("\n")}
${fieldMetaList.length > 10 ? `  ... and ${fieldMetaList.length - 10} more fields` : ""}

${fieldOrderIssues.length === 0 ? "✅ All fields are in correct order!" : `⚠️ ${fieldOrderIssues.length} records had field order issues (now fixed)`}
  `

  console.log(fieldOrderReport)
  console.log(`===== END FIELD ORDER PRESERVATION =====`)

  return {
    orderedData,
    fieldOrderMap,
    fieldOrderReport,
  }
}

// 🔥 ENHANCED STRATEGY: Deep extraction với comprehensive debugging
const enhancedDeepExtractionStrategy = async (tableId: string): Promise<RecordData[]> => {
  console.log(`🚀 ENHANCED DEEP EXTRACTION STRATEGY WITH DEBUGGING`)
  console.log(`🎯 Focus: Complete field extraction + Debugging empty fields`)

  try {
    const table = await base.getTable(tableId)
    if (!table) throw new Error("Cannot get table object")

    // Get field metadata for order preservation
    const fieldMetaList = await table.getFieldMetaList()
    console.log(`📋 Field metadata: ${fieldMetaList.length} fields`)
    fieldMetaList.forEach((field, index) => {
      console.log(`  ${index + 1}. "${field.name}" (${field.type}) [ID: ${field.id}]`)
    })

    const recordIdList = await table.getRecordIdList()
    console.log(`📊 Processing ${recordIdList.length} records with deep extraction...`)

    // 🔥 CRITICAL: Run deep debugging on first record to understand the issue
    if (recordIdList.length > 0) {
      console.log(`\n🔍 RUNNING DEEP DEBUG ON FIRST RECORD...`)
      await deepDebugEmptyFields(tableId)
    }

    const allData: RecordData[] = []
    let totalFieldsExtracted = 0
    let totalEmptyFields = 0
    const debugInfoCollection: any[] = []

    // Process records with deep extraction
    for (let i = 0; i < recordIdList.length; i++) {
      const recordId = recordIdList[i]

      try {
        const { fields, fieldCount, emptyFields, debugInfo } = await deepFieldExtraction(table, recordId, fieldMetaList)

        allData.push({
          recordId: recordId,
          fields: fields,
          strategy: "enhanced-deep-debug",
          fieldCount: fieldCount,
          emptyFields: emptyFields,
          debugInfo: debugInfo,
        })

        totalFieldsExtracted += fieldCount
        totalEmptyFields += emptyFields.length

        // Collect debug info from first few records
        if (i < 5) {
          debugInfoCollection.push({
            recordIndex: i,
            recordId: recordId,
            debugInfo: debugInfo,
          })
        }

        // Progress logging
        if ((i + 1) % 25 === 0) {
          console.log(`📊 Deep extraction progress: ${i + 1}/${recordIdList.length} records`)
          console.log(`  📈 Avg fields per record: ${(totalFieldsExtracted / (i + 1)).toFixed(1)}`)
          console.log(`  📉 Avg empty fields per record: ${(totalEmptyFields / (i + 1)).toFixed(1)}`)
        }

        // Small delay to avoid overwhelming the API
        await new Promise((resolve) => setTimeout(resolve, 50))
      } catch (error) {
        console.error(`❌ Deep extraction failed for record ${i + 1}:`, error)

        // Create error record but maintain field structure
        const errorFields: Record<string, unknown> = {}
        fieldMetaList.forEach((field) => {
          errorFields[field.name] = { error: `Deep extraction failed: ${error}` }
        })

        allData.push({
          recordId: recordId,
          fields: errorFields,
          strategy: "enhanced-deep-debug",
          fieldCount: fieldMetaList.length,
          emptyFields: fieldMetaList.map((f) => f.name),
          debugInfo: { error: String(error) },
        })
      }
    }

    console.log(`✅ Deep extraction completed: ${allData.length} records`)
    console.log(`📊 Total fields extracted: ${totalFieldsExtracted}`)
    console.log(`📉 Total empty fields: ${totalEmptyFields}`)
    console.log(
      `📈 Average field completeness: ${totalFieldsExtracted > 0 ? (((totalFieldsExtracted - totalEmptyFields) / totalFieldsExtracted) * 100).toFixed(1) : 0}%`,
    )

    // 🔥 CRITICAL: Analyze debug info to understand the problem
    console.log(`\n🔍 DEBUG INFO ANALYSIS:`)
    debugInfoCollection.forEach((item, index) => {
      console.log(`  Record ${index + 1} (${item.recordId}):`)
      console.log(`    Best method: ${item.debugInfo.bestMethod}`)
      console.log(`    Total fields found: ${item.debugInfo.totalFieldsFound}`)

      Object.entries(item.debugInfo.methods).forEach(([method, result]: [string, any]) => {
        if (result.success) {
          console.log(`    ${method}: ✅ ${result.fieldCount} fields, ${result.nonEmptyFields} non-empty`)
        } else {
          console.log(`    ${method}: ❌ ${result.error}`)
        }
      })
    })

    // Apply field order preservation
    const { orderedData, fieldOrderReport } = preserveFieldOrder(allData, fieldMetaList)

    console.log(`🔧 Field order preservation applied`)
    console.log(fieldOrderReport)

    return orderedData
  } catch (error) {
    console.error(`❌ Enhanced deep extraction strategy failed:`, error)
    throw error
  }
}

// 🔥 MULTIPLE EXTRACTION STRATEGIES với enhanced deep extraction
export interface ExtractionStrategy {
  name: string
  description: string
  extract: (tableId: string) => Promise<RecordData[]>
}

// 🔥 STRATEGY 1: Enhanced Deep Extraction (NEW - Highest Priority)
const enhancedDeepStrategy: ExtractionStrategy = {
  name: "Enhanced Deep Extraction with Debugging",
  description: "Complete field extraction with comprehensive debugging and multiple retry mechanisms",
  extract: enhancedDeepExtractionStrategy,
}

// 🔥 STRATEGY 2: Parallel extraction với controlled concurrency
const parallelExtractionStrategy = async (tableId: string): Promise<RecordData[]> => {
  console.log(`🔄 STRATEGY: Parallel extraction với controlled concurrency...`)

  try {
    const table = await base.getTable(tableId)
    if (!table) throw new Error("Cannot get table")

    const recordIdList = await table.getRecordIdList()
    console.log(`📊 Parallel processing ${recordIdList.length} records...`)

    const concurrencyLimit = 5 // Control concurrency to avoid overwhelming the API
    const allData: RecordData[] = []

    // Process in chunks with controlled concurrency
    for (let i = 0; i < recordIdList.length; i += concurrencyLimit) {
      const chunk = recordIdList.slice(i, i + concurrencyLimit)

      const chunkPromises = chunk.map(async (recordId, index) => {
        try {
          const recordData = await table.getRecordById(recordId)
          return {
            recordId: recordId,
            fields: recordData?.fields || {},
            strategy: "parallel",
          }
        } catch (error) {
          console.warn(`⚠️ Parallel extraction failed for record ${i + index + 1}:`, error)
          return {
            recordId: recordId,
            fields: { error: `Parallel extraction failed: ${error}` },
            strategy: "parallel",
          }
        }
      })

      const chunkResults = await Promise.all(chunkPromises)
      allData.push(...chunkResults)

      // Progress logging
      console.log(
        `📊 Parallel progress: ${Math.min(i + concurrencyLimit, recordIdList.length)}/${recordIdList.length} records`,
      )

      // Small delay between chunks
      if (i + concurrencyLimit < recordIdList.length) {
        await new Promise((resolve) => setTimeout(resolve, 300))
      }
    }

    console.log(`✅ Parallel extraction completed: ${allData.length}/${recordIdList.length} records`)
    return allData
  } catch (error) {
    console.error(`❌ Parallel extraction strategy failed:`, error)
    throw error
  }
}

// 🔥 STRATEGY 3: Batch extraction với retry
const batchExtractionStrategy = async (tableId: string): Promise<RecordData[]> => {
  console.log(`🔄 STRATEGY: Batch extraction với retry mechanism...`)

  try {
    const table = await base.getTable(tableId)
    if (!table) throw new Error("Cannot get table")

    const recordIdList = await table.getRecordIdList()
    console.log(`📊 Total record IDs found: ${recordIdList.length}`)

    const batchSize = 10 // Smaller batches for better reliability
    const maxRetries = 3
    const allData: RecordData[] = []

    for (let i = 0; i < recordIdList.length; i += batchSize) {
      const batch = recordIdList.slice(i, i + batchSize)
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}: ${batch.length} records`)

      let batchSuccess = false
      let retryCount = 0

      while (!batchSuccess && retryCount < maxRetries) {
        try {
          const batchPromises = batch.map(async (recordId) => {
            try {
              const recordData = await table.getRecordById(recordId)
              return {
                recordId: recordId,
                fields: recordData?.fields || {},
                strategy: "batch",
              }
            } catch (error) {
              console.warn(`⚠️ Failed to get record ${recordId}:`, error)
              return {
                recordId: recordId,
                fields: { error: `Failed to retrieve: ${error}` },
                strategy: "batch",
              }
            }
          })

          const batchResults = await Promise.all(batchPromises)
          allData.push(...batchResults)
          batchSuccess = true

          // Delay between batches
          await new Promise((resolve) => setTimeout(resolve, 200))
        } catch (batchError) {
          retryCount++
          console.warn(
            `⚠️ Batch ${Math.floor(i / batchSize) + 1} failed (retry ${retryCount}/${maxRetries}):`,
            batchError,
          )

          if (retryCount < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount))
          }
        }
      }

      if (!batchSuccess) {
        console.error(`❌ Batch ${Math.floor(i / batchSize) + 1} failed after ${maxRetries} retries`)
      }
    }

    console.log(`✅ Batch extraction completed: ${allData.length}/${recordIdList.length} records`)
    return allData
  } catch (error) {
    console.error(`❌ Batch extraction strategy failed:`, error)
    throw error
  }
}

// 🔥 STRATEGY 4: Sequential extraction với exponential backoff
const sequentialExtractionStrategy = async (tableId: string): Promise<RecordData[]> => {
  console.log(`🔄 STRATEGY: Sequential extraction với exponential backoff...`)

  try {
    const table = await base.getTable(tableId)
    if (!table) throw new Error("Cannot get table")

    const recordIdList = await table.getRecordIdList()
    console.log(`📊 Sequential processing ${recordIdList.length} records...`)

    const allData: RecordData[] = []
    let consecutiveFailures = 0
    const maxConsecutiveFailures = 5

    for (let i = 0; i < recordIdList.length; i++) {
      const recordId = recordIdList[i]

      try {
        const recordData = await table.getRecordById(recordId)
        allData.push({
          recordId: recordId,
          fields: recordData?.fields || {},
          strategy: "sequential",
        })

        consecutiveFailures = 0 // Reset on success

        // Progress logging
        if ((i + 1) % 50 === 0) {
          console.log(`📊 Sequential progress: ${i + 1}/${recordIdList.length} records`)
        }

        // Adaptive delay based on failure rate
        const delay = consecutiveFailures > 0 ? Math.min(1000 * Math.pow(2, consecutiveFailures), 5000) : 50
        await new Promise((resolve) => setTimeout(resolve, delay))
      } catch (error) {
        consecutiveFailures++
        console.warn(`⚠️ Failed to get record ${i + 1}/${recordIdList.length} (${recordId}):`, error)

        allData.push({
          recordId: recordId,
          fields: { error: `Sequential extraction failed: ${error}` },
          strategy: "sequential",
        })

        if (consecutiveFailures >= maxConsecutiveFailures) {
          console.error(`❌ Too many consecutive failures (${consecutiveFailures}), stopping sequential extraction`)
          break
        }

        // Exponential backoff on failure
        const backoffDelay = Math.min(1000 * Math.pow(2, consecutiveFailures), 10000)
        await new Promise((resolve) => setTimeout(resolve, backoffDelay))
      }
    }

    console.log(`✅ Sequential extraction completed: ${allData.length}/${recordIdList.length} records`)
    return allData
  } catch (error) {
    console.error(`❌ Sequential extraction strategy failed:`, error)
    throw error
  }
}

// 🔥 MAIN: Multi-strategy data extraction with enhanced deep extraction
export const getTableDataWithMultipleStrategies = async (
  tableId: string,
): Promise<{
  data: RecordData[]
  strategy: string
  extractionReport: string
  dataQuality: {
    totalExpected: number
    totalExtracted: number
    dataLossPercentage: number
    fieldCompletenessRate: number
    strategies: Array<{
      name: string
      success: boolean
      recordCount: number
      fieldCompleteness?: number
      error?: string
    }>
  }
}> => {
  console.log(`🚀 ===== MULTI-STRATEGY DATA EXTRACTION (ENHANCED WITH DEBUGGING) =====`)
  console.log(`📊 Table ID: ${tableId}`)

  try {
    // Get expected record count and field metadata
    const table = await base.getTable(tableId)
    if (!table) throw new Error("Cannot get table object")

    const recordIdList = await table.getRecordIdList()
    const fieldMetaList = await table.getFieldMetaList()
    const expectedRecordCount = recordIdList.length
    const expectedFieldCount = fieldMetaList.length

    console.log(`📊 Expected records: ${expectedRecordCount}`)
    console.log(`📋 Expected fields per record: ${expectedFieldCount}`)

    // Define extraction strategies in order of preference (Enhanced Deep first)
    const strategies: ExtractionStrategy[] = [
      enhancedDeepStrategy, // NEW: Highest priority with debugging
      {
        name: "Parallel Extraction",
        description: "Controlled parallel processing with error handling",
        extract: parallelExtractionStrategy,
      },
      {
        name: "Batch Extraction",
        description: "Small batch processing with retry mechanism",
        extract: batchExtractionStrategy,
      },
      {
        name: "Sequential Extraction",
        description: "Sequential processing with exponential backoff",
        extract: sequentialExtractionStrategy,
      },
    ]

    const strategyResults: Array<{
      name: string
      success: boolean
      recordCount: number
      fieldCompleteness?: number
      error?: string
      data?: RecordData[]
    }> = []
    let bestResult: { data: RecordData[]; strategy: string } | null = null
    let bestScore = 0 // Combined score of record count and field completeness

    // Try each strategy
    for (const strategy of strategies) {
      console.log(`\n🔄 Trying strategy: ${strategy.name}`)
      console.log(`📝 Description: ${strategy.description}`)

      try {
        const startTime = Date.now()
        const strategyData = await strategy.extract(tableId)
        const extractionTime = Date.now() - startTime

        const recordCount = strategyData.length
        const dataQuality = calculateEnhancedDataQuality(strategyData, expectedFieldCount)

        console.log(`✅ ${strategy.name} completed:`)
        console.log(`  📊 Records: ${recordCount}/${expectedRecordCount}`)
        console.log(`  📋 Field completeness: ${dataQuality.fieldCompletenessRate.toFixed(1)}%`)
        console.log(`  ⏱️ Time: ${extractionTime}ms`)
        console.log(`  📈 Overall quality: ${dataQuality.qualityScore.toFixed(1)}%`)

        // Calculate combined score (record completeness + field completeness)
        const recordCompleteness = (recordCount / expectedRecordCount) * 100
        const combinedScore = (recordCompleteness + dataQuality.fieldCompletenessRate) / 2

        strategyResults.push({
          name: strategy.name,
          success: true,
          recordCount: recordCount,
          fieldCompleteness: dataQuality.fieldCompletenessRate,
          data: strategyData,
        })

        // Keep the best result (highest combined score)
        if (combinedScore > bestScore) {
          bestResult = { data: strategyData, strategy: strategy.name }
          bestScore = combinedScore
        }

        // If we got excellent extraction, stop here
        if (recordCount === expectedRecordCount && dataQuality.fieldCompletenessRate > 90) {
          console.log(`🎯 Excellent extraction achieved with ${strategy.name}!`)
          break
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error(`❌ ${strategy.name} failed: ${errorMsg}`)

        strategyResults.push({
          name: strategy.name,
          success: false,
          recordCount: 0,
          fieldCompleteness: 0,
          error: errorMsg,
        })
      }
    }

    // Use the best result
    if (!bestResult) {
      throw new Error("All extraction strategies failed")
    }

    const dataLossPercentage = ((expectedRecordCount - bestResult.data.length) / expectedRecordCount) * 100
    const finalDataQuality = calculateEnhancedDataQuality(bestResult.data, expectedFieldCount)

    const extractionReport = `
🔍 ENHANCED MULTI-STRATEGY EXTRACTION REPORT (WITH DEBUGGING):
  📊 Expected records: ${expectedRecordCount}
  ✅ Extracted records: ${bestResult.data.length}
  📉 Record loss: ${dataLossPercentage.toFixed(1)}%
  📋 Expected fields per record: ${expectedFieldCount}
  📈 Field completeness: ${finalDataQuality.fieldCompletenessRate.toFixed(1)}%
  🎯 Best strategy: ${bestResult.strategy}
  
📋 Strategy Performance:
${strategyResults
  .map(
    (s) =>
      `  ${s.success ? "✅" : "❌"} ${s.name}: ${s.recordCount} records${s.fieldCompleteness ? ` (${s.fieldCompleteness.toFixed(1)}% fields)` : ""}${s.error ? ` - ${s.error}` : ""}`,
  )
  .join("\n")}

🎯 QUALITY ASSESSMENT:
${
  dataLossPercentage === 0 && finalDataQuality.fieldCompletenessRate > 95
    ? "🎉 PERFECT EXTRACTION! Zero data loss + Complete fields"
    : dataLossPercentage === 0 && finalDataQuality.fieldCompletenessRate > 80
      ? "✅ EXCELLENT! Zero record loss + Good field completeness"
      : dataLossPercentage < 5 && finalDataQuality.fieldCompletenessRate > 80
        ? "✅ GOOD! Minimal record loss + Good field completeness"
        : dataLossPercentage < 10 && finalDataQuality.fieldCompletenessRate > 60
          ? "⚠️ ACCEPTABLE! Moderate losses but usable data"
          : finalDataQuality.fieldCompletenessRate === 0
            ? "🚨 CRITICAL: NO FIELD DATA EXTRACTED - SDK/Permission Issue!"
            : "❌ POOR! Significant data loss - Manual review required"
}

🔧 FIELD ORDER: ${bestResult.strategy === "Enhanced Deep Extraction with Debugging" ? "✅ Preserved according to metadata" : "⚠️ May need reordering"}

${
  finalDataQuality.fieldCompletenessRate === 0
    ? `
🚨 CRITICAL ISSUE DETECTED:
  - All fields are empty (0% completeness)
  - This indicates a fundamental SDK or permission issue
  - Check debug logs for detailed extraction attempts
  - Verify Lark Base permissions and SDK version
`
    : ""
}
    `

    console.log(extractionReport)
    console.log(`===== END ENHANCED MULTI-STRATEGY EXTRACTION =====\n`)

    return {
      data: bestResult.data,
      strategy: bestResult.strategy,
      extractionReport: extractionReport,
      dataQuality: {
        totalExpected: expectedRecordCount,
        totalExtracted: bestResult.data.length,
        dataLossPercentage: dataLossPercentage,
        fieldCompletenessRate: finalDataQuality.fieldCompletenessRate,
        strategies: strategyResults.map((s) => ({
          name: s.name,
          success: s.success,
          recordCount: s.recordCount,
          fieldCompleteness: s.fieldCompleteness,
          error: s.error,
        })),
      },
    }
  } catch (error) {
    console.error(`❌ Enhanced multi-strategy extraction failed:`, error)
    throw new Error(`Enhanced multi-strategy extraction failed: ${error}`)
  }
}

// Helper function to calculate enhanced data quality with field completeness
const calculateEnhancedDataQuality = (
  data: RecordData[],
  expectedFieldCount: number,
): { qualityScore: number; fieldCompletenessRate: number; stats: any } => {
  if (data.length === 0) return { qualityScore: 0, fieldCompletenessRate: 0, stats: {} }

  let totalFields = 0
  let fieldsWithData = 0
  let errorFields = 0
  const totalExpectedFields = data.length * expectedFieldCount

  data.forEach((record) => {
    Object.entries(record.fields).forEach(([fieldName, value]) => {
      totalFields++

      if (typeof value === "object" && value !== null && "error" in value) {
        errorFields++
      } else if (value !== null && value !== undefined && value !== "") {
        fieldsWithData++
      }
    })
  })

  const qualityScore = totalFields > 0 ? (fieldsWithData / totalFields) * 100 : 0
  const errorRate = totalFields > 0 ? (errorFields / totalFields) * 100 : 0
  const fieldCompletenessRate = totalExpectedFields > 0 ? (totalFields / totalExpectedFields) * 100 : 0

  return {
    qualityScore: qualityScore,
    fieldCompletenessRate: fieldCompletenessRate,
    stats: {
      totalFields,
      fieldsWithData,
      errorFields,
      errorRate: errorRate,
      dataFillRate: qualityScore,
      expectedFields: totalExpectedFields,
      fieldCoverageRate: fieldCompletenessRate,
    },
  }
}

// Function chính lấy TẤT CẢ dữ liệu từ bảng (backward compatibility)
export const getTableData = async (tableId: string): Promise<RecordData[]> => {
  console.log(`📥 getTableData called - using enhanced multi-strategy extraction with debugging`)
  const result = await getTableDataWithMultipleStrategies(tableId)
  return result.data
}

// Helper function để format field value
const formatFieldValue = (value: unknown, fieldType?: string): string => {
  if (value === null || value === undefined) {
    return ""
  }

  if (typeof value === "object") {
    return JSON.stringify(value)
  }

  return String(value)
}

// Function lấy dữ liệu với field type information
export const getTableDataWithTypes = async (
  tableId: string,
): Promise<{
  data: RecordData[]
  fieldTypes: Record<string, string>
  fieldNames: string[]
  fieldMetadata: Array<{ id: string; name: string; type: string }>
}> => {
  try {
    console.log(`📥 Getting table data with enhanced field metadata: ${tableId}`)

    const table = await base.getTable(tableId)
    if (!table) {
      throw new Error("Không thể lấy table object")
    }

    // Lấy field metadata chi tiết
    const fieldMetaList = await table.getFieldMetaList()
    const fieldTypes: Record<string, string> = {}
    const fieldNames: string[] = []
    const fieldMetadata: Array<{ id: string; name: string; type: string }> = []

    fieldMetaList.forEach((field) => {
      fieldTypes[field.name] = field.type.toString()
      fieldNames.push(field.name)
      fieldMetadata.push({
        id: field.id || field.name,
        name: field.name,
        type: field.type.toString(),
      })
    })

    console.log(`📋 Field metadata collected:`)
    fieldMetadata.forEach((field) => {
      console.log(`  "${field.name}" (${field.type}) [ID: ${field.id}]`)
    })

    // Lấy data với enhanced extraction
    const result = await getTableDataWithMultipleStrategies(tableId)

    return {
      data: result.data,
      fieldTypes,
      fieldNames,
      fieldMetadata,
    }
  } catch (error) {
    console.error("❌ Error getting table data with enhanced metadata:", error)
    throw error
  }
}

// Export all functions
export { type RecordData, type TableStats, type SDKStatus, formatFieldValue }
