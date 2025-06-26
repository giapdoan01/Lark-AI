import { base } from "@lark-base-open/js-sdk"

// 🔥 SIMPLE DATA EXTRACTION - Back to Basics
// Mục tiêu: Lấy được DATA THỰC TẾ bằng cách đơn giản nhất

interface SimpleRecordData {
  recordId: string
  fields: Record<string, any>
  rawData?: any
  debugInfo?: any
}

// 🔥 METHOD 1: Cách cơ bản nhất - getRecordById
export const getSimpleRecordData = async (tableId: string, recordId: string): Promise<SimpleRecordData> => {
  console.log(`🔥 SIMPLE: Getting record ${recordId} from table ${tableId}`)

  try {
    const table = await base.getTable(tableId)
    console.log(`✅ Got table object:`, typeof table)

    const record = await table.getRecordById(recordId)
    console.log(`✅ Got record object:`, typeof record)
    console.log(`📊 Record structure:`, Object.keys(record || {}))

    if (record) {
      console.log(`📋 Record fields:`, record.fields ? Object.keys(record.fields) : "NO FIELDS")

      // Log từng field value
      if (record.fields) {
        Object.entries(record.fields).forEach(([key, value]) => {
          console.log(`  Field "${key}":`, typeof value, value)
        })
      }

      return {
        recordId,
        fields: record.fields || {},
        rawData: record,
        debugInfo: {
          hasFields: !!record.fields,
          fieldCount: record.fields ? Object.keys(record.fields).length : 0,
          recordKeys: Object.keys(record),
        },
      }
    } else {
      console.log(`❌ No record returned`)
      return {
        recordId,
        fields: {},
        debugInfo: { error: "No record returned" },
      }
    }
  } catch (error) {
    console.error(`❌ Error getting record:`, error)
    return {
      recordId,
      fields: {},
      debugInfo: { error: String(error) },
    }
  }
}

// 🔥 METHOD 2: Thử getCellValue trực tiếp
export const getSimpleCellData = async (
  tableId: string,
  recordId: string,
  fieldId: string,
  fieldName: string,
): Promise<any> => {
  console.log(`🔥 SIMPLE: Getting cell data for field "${fieldName}" (${fieldId})`)

  try {
    const table = await base.getTable(tableId)

    // Thử với field ID
    try {
      const cellValue = await table.getCellValue(recordId, fieldId)
      console.log(`✅ Cell value by ID:`, typeof cellValue, cellValue)
      return cellValue
    } catch (e) {
      console.log(`❌ getCellValue by ID failed:`, e)
    }

    // Thử với field name
    try {
      const cellValue = await table.getCellValue(recordId, fieldName)
      console.log(`✅ Cell value by name:`, typeof cellValue, cellValue)
      return cellValue
    } catch (e) {
      console.log(`❌ getCellValue by name failed:`, e)
    }

    return null
  } catch (error) {
    console.error(`❌ Error getting cell:`, error)
    return null
  }
}

// 🔥 METHOD 3: Test với 1 record đơn giản
export const testSingleRecord = async (tableId: string): Promise<any> => {
  console.log(`🔥 SIMPLE TEST: Testing single record from table ${tableId}`)

  try {
    const table = await base.getTable(tableId)
    console.log(`✅ Table object obtained`)

    // Lấy field metadata
    const fieldMetaList = await table.getFieldMetaList()
    console.log(`📋 Fields available:`, fieldMetaList.length)
    fieldMetaList.forEach((field, index) => {
      console.log(`  ${index + 1}. "${field.name}" (${field.type}) [ID: ${field.id}]`)
    })

    // Lấy record IDs
    const recordIdList = await table.getRecordIdList()
    console.log(`📊 Records available:`, recordIdList.length)

    if (recordIdList.length === 0) {
      return { error: "No records found" }
    }

    // Test record đầu tiên
    const firstRecordId = recordIdList[0]
    console.log(`🎯 Testing first record: ${firstRecordId}`)

    // Method 1: getRecordById
    console.log(`\n🔄 Method 1: getRecordById`)
    const recordData = await getSimpleRecordData(tableId, firstRecordId)

    // Method 2: getCellValue cho từng field
    console.log(`\n🔄 Method 2: getCellValue for each field`)
    const cellData: Record<string, any> = {}

    for (const field of fieldMetaList.slice(0, 5)) {
      // Test 5 fields đầu
      const cellValue = await getSimpleCellData(tableId, firstRecordId, field.id, field.name)
      cellData[field.name] = cellValue
      console.log(`  Field "${field.name}": ${typeof cellValue} = ${JSON.stringify(cellValue)?.substring(0, 100)}`)
    }

    return {
      tableId,
      recordId: firstRecordId,
      fieldCount: fieldMetaList.length,
      recordCount: recordIdList.length,
      method1_getRecordById: recordData,
      method2_getCellValue: cellData,
      fieldMetadata: fieldMetaList.slice(0, 5).map((f) => ({
        name: f.name,
        id: f.id,
        type: f.type,
      })),
    }
  } catch (error) {
    console.error(`❌ Test failed:`, error)
    return { error: String(error) }
  }
}

// 🔥 METHOD 4: Lấy tất cả data bằng cách đơn giản nhất
export const getSimpleTableData = async (tableId: string): Promise<SimpleRecordData[]> => {
  console.log(`🔥 SIMPLE: Getting all data from table ${tableId}`)

  try {
    const table = await base.getTable(tableId)
    const recordIdList = await table.getRecordIdList()
    const fieldMetaList = await table.getFieldMetaList()

    console.log(`📊 Processing ${recordIdList.length} records with ${fieldMetaList.length} fields`)

    const allData: SimpleRecordData[] = []

    // Lấy từng record một cách đơn giản
    for (let i = 0; i < recordIdList.length; i++) {
      const recordId = recordIdList[i]

      try {
        console.log(`📊 Processing record ${i + 1}/${recordIdList.length}: ${recordId}`)

        // Cách 1: getRecordById
        const record = await table.getRecordById(recordId)

        if (record && record.fields) {
          const fieldCount = Object.keys(record.fields).length
          const hasRealData = Object.values(record.fields).some(
            (value) => value !== null && value !== undefined && value !== "",
          )

          console.log(`  ✅ Record ${i + 1}: ${fieldCount} fields, hasData: ${hasRealData}`)

          allData.push({
            recordId,
            fields: record.fields,
            rawData: record,
            debugInfo: {
              method: "getRecordById",
              fieldCount,
              hasRealData,
              recordIndex: i + 1,
            },
          })
        } else {
          console.log(`  ❌ Record ${i + 1}: No fields data`)

          // Fallback: thử getCellValue cho từng field
          const fallbackFields: Record<string, any> = {}

          for (const field of fieldMetaList) {
            try {
              const cellValue = await table.getCellValue(recordId, field.id)
              if (cellValue !== null && cellValue !== undefined) {
                fallbackFields[field.name] = cellValue
              }
            } catch (e) {
              // Silent fail
            }
          }

          const fallbackFieldCount = Object.keys(fallbackFields).length
          console.log(`  🔄 Fallback method: ${fallbackFieldCount} fields recovered`)

          allData.push({
            recordId,
            fields: fallbackFields,
            debugInfo: {
              method: "getCellValue_fallback",
              fieldCount: fallbackFieldCount,
              hasRealData: fallbackFieldCount > 0,
              recordIndex: i + 1,
            },
          })
        }

        // Delay nhỏ để tránh overwhelm
        if (i % 10 === 0 && i > 0) {
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      } catch (error) {
        console.error(`❌ Error processing record ${i + 1}:`, error)
        allData.push({
          recordId,
          fields: {},
          debugInfo: {
            method: "error",
            error: String(error),
            recordIndex: i + 1,
          },
        })
      }
    }

    // Summary
    const recordsWithData = allData.filter(
      (r) =>
        Object.keys(r.fields).length > 0 &&
        Object.values(r.fields).some((v) => v !== null && v !== undefined && v !== ""),
    ).length

    console.log(`\n📊 SIMPLE EXTRACTION SUMMARY:`)
    console.log(`  Total records: ${allData.length}`)
    console.log(`  Records with data: ${recordsWithData}`)
    console.log(`  Success rate: ${((recordsWithData / allData.length) * 100).toFixed(1)}%`)

    return allData
  } catch (error) {
    console.error(`❌ Simple table data extraction failed:`, error)
    throw error
  }
}

// 🔥 METHOD 5: Debug SDK methods có sẵn
export const debugSDKMethods = async (tableId: string): Promise<any> => {
  console.log(`🔍 DEBUG: Exploring available SDK methods`)

  try {
    const table = await base.getTable(tableId)

    // Check table methods
    const tableMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(table))
    console.log(`📋 Table methods (${tableMethods.length}):`, tableMethods)

    // Check base methods
    const baseMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(base))
    console.log(`📋 Base methods (${baseMethods.length}):`, baseMethods)

    // Test một số methods phổ biến
    const testResults: Record<string, any> = {}

    // Test getRecordIdList
    try {
      const recordIds = await table.getRecordIdList()
      testResults.getRecordIdList = { success: true, count: recordIds.length }
    } catch (e) {
      testResults.getRecordIdList = { success: false, error: String(e) }
    }

    // Test getFieldMetaList
    try {
      const fields = await table.getFieldMetaList()
      testResults.getFieldMetaList = { success: true, count: fields.length }
    } catch (e) {
      testResults.getFieldMetaList = { success: false, error: String(e) }
    }

    // Test getRecordById với record đầu tiên
    try {
      const recordIds = await table.getRecordIdList()
      if (recordIds.length > 0) {
        const record = await table.getRecordById(recordIds[0])
        testResults.getRecordById = {
          success: true,
          hasFields: !!record?.fields,
          fieldCount: record?.fields ? Object.keys(record.fields).length : 0,
          recordStructure: Object.keys(record || {}),
        }
      }
    } catch (e) {
      testResults.getRecordById = { success: false, error: String(e) }
    }

    return {
      tableMethods,
      baseMethods,
      testResults,
    }
  } catch (error) {
    console.error(`❌ SDK debug failed:`, error)
    return { error: String(error) }
  }
}
