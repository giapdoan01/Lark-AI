import { base } from "@lark-base-open/js-sdk"

// 🔥 RESEARCH-BASED: Proper Lark Base SDK Usage
// Based on official Lark Base Open Platform documentation

interface LarkRecord {
  recordId: string
  fields: Record<string, any>
  createdTime?: number
  lastModifiedTime?: number
}

interface LarkField {
  id: string
  name: string
  type: number | string
  property?: any
}

// 🔥 STEP 1: Proper SDK Initialization and Ready Check (FIXED)
export const initializeLarkBaseSDK = async (): Promise<boolean> => {
  console.log(`🔄 Initializing Lark Base SDK...`)

  try {
    // Check if we're in the right environment
    if (typeof window === "undefined") {
      console.error(`❌ SDK requires browser environment`)
      return false
    }

    // Check if SDK is loaded
    if (!base) {
      console.error(`❌ Lark Base SDK not loaded`)
      return false
    }

    // 🔧 FIXED: Remove isReady check since it doesn't exist in type definition
    console.log(`✅ SDK object available, testing basic functionality...`)

    // Test basic functionality instead of isReady
    try {
      const tables = await base.getTableMetaList()
      console.log(`✅ SDK initialized successfully, found ${tables.length} tables`)
      return true
    } catch (error) {
      console.error(`❌ SDK basic functionality test failed:`, error)
      return false
    }
  } catch (error) {
    console.error(`❌ SDK initialization failed:`, error)
    return false
  }
}

// 🔥 STEP 2: Proper Table Access with Error Handling (FIXED)
export const getTableWithProperHandling = async (tableId: string) => {
  console.log(`📊 Getting table with proper handling: ${tableId}`)

  try {
    // Ensure SDK is ready first
    const sdkReady = await initializeLarkBaseSDK()
    if (!sdkReady) {
      throw new Error("SDK not ready")
    }

    // Get table with timeout
    const table = await Promise.race([
      base.getTable(tableId),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Table access timeout")), 10000)),
    ])

    if (!table) {
      throw new Error("Table object is null")
    }

    console.log(`✅ Table object obtained successfully`)
    return table
  } catch (error) {
    console.error(`❌ Failed to get table:`, error)
    throw error
  }
}

// 🔥 STEP 3: Proper Field Metadata Retrieval (FIXED)
export const getFieldMetadataProper = async (table: any): Promise<LarkField[]> => {
  console.log(`📋 Getting field metadata with proper handling...`)

  try {
    const fieldMetaList = await table.getFieldMetaList()

    if (!fieldMetaList || !Array.isArray(fieldMetaList)) {
      throw new Error("Invalid field metadata response")
    }

    console.log(`✅ Retrieved ${fieldMetaList.length} fields:`)
    fieldMetaList.forEach((field: any, index: number) => {
      console.log(`  ${index + 1}. "${field.name}" (Type: ${field.type}) [ID: ${field.id}]`)
    })

    return fieldMetaList
  } catch (error) {
    console.error(`❌ Failed to get field metadata:`, error)
    throw error
  }
}

// 🔥 STEP 4: Proper Record ID Retrieval (FIXED)
export const getRecordIdsProper = async (table: any): Promise<string[]> => {
  console.log(`📊 Getting record IDs with proper handling...`)

  try {
    const recordIdList = await table.getRecordIdList()

    if (!recordIdList || !Array.isArray(recordIdList)) {
      throw new Error("Invalid record ID list response")
    }

    console.log(`✅ Retrieved ${recordIdList.length} record IDs`)
    return recordIdList
  } catch (error) {
    console.error(`❌ Failed to get record IDs:`, error)
    throw error
  }
}

// 🔥 STEP 5: Proper Single Record Retrieval (FIXED)
export const getRecordProper = async (table: any, recordId: string): Promise<LarkRecord | null> => {
  console.log(`📄 Getting record with proper handling: ${recordId}`)

  try {
    // Method 1: Standard getRecordById
    const record = await table.getRecordById(recordId)

    if (!record) {
      console.warn(`⚠️ getRecordById returned null for ${recordId}`)
      return null
    }

    console.log(`✅ Record retrieved:`)
    console.log(`  Record ID: ${recordId}`)
    console.log(`  Record type: ${typeof record}`)
    console.log(`  Record keys: ${Object.keys(record)}`)

    if (record.fields) {
      console.log(`  Fields type: ${typeof record.fields}`)
      console.log(`  Fields keys: ${Object.keys(record.fields)}`)
      console.log(`  Field count: ${Object.keys(record.fields).length}`)

      // Log each field value for debugging
      Object.entries(record.fields).forEach(([fieldName, fieldValue]) => {
        console.log(`    "${fieldName}": ${typeof fieldValue} = ${JSON.stringify(fieldValue)?.substring(0, 100)}`)
      })
    } else {
      console.warn(`⚠️ Record has no fields property`)
    }

    return {
      recordId: recordId,
      fields: record.fields || {},
      createdTime: record.createdTime,
      lastModifiedTime: record.lastModifiedTime,
    }
  } catch (error) {
    console.error(`❌ Failed to get record ${recordId}:`, error)
    return null
  }
}

// 🔥 STEP 6: Alternative Cell Value Retrieval (FIXED)
export const getCellValueProper = async (
  table: any,
  recordId: string,
  fieldId: string,
  fieldName: string,
): Promise<any> => {
  console.log(`🔍 Getting cell value: Record ${recordId}, Field "${fieldName}" (${fieldId})`)

  try {
    // Try with field ID first
    let cellValue = await table.getCellValue(recordId, fieldId)

    if (cellValue !== null && cellValue !== undefined) {
      console.log(`✅ Cell value by ID: ${typeof cellValue} = ${JSON.stringify(cellValue)?.substring(0, 100)}`)
      return cellValue
    }

    // Try with field name as fallback
    cellValue = await table.getCellValue(recordId, fieldName)

    if (cellValue !== null && cellValue !== undefined) {
      console.log(`✅ Cell value by name: ${typeof cellValue} = ${JSON.stringify(cellValue)?.substring(0, 100)}`)
      return cellValue
    }

    console.warn(`⚠️ Cell value is null/undefined for field "${fieldName}"`)
    return null
  } catch (error) {
    console.error(`❌ Failed to get cell value for field "${fieldName}":`, error)
    return null
  }
}

// 🔥 STEP 7: Comprehensive Record Data Extraction (FIXED)
export const extractRecordDataProper = async (
  table: any,
  recordId: string,
  fieldMetaList: LarkField[],
): Promise<LarkRecord> => {
  console.log(`🔄 Extracting record data: ${recordId}`)

  try {
    // Method 1: Try getRecordById first
    const recordFromGetById = await getRecordProper(table, recordId)

    if (recordFromGetById && recordFromGetById.fields && Object.keys(recordFromGetById.fields).length > 0) {
      // Check if we have actual data (not just empty values)
      const hasRealData = Object.values(recordFromGetById.fields).some(
        (value) => value !== null && value !== undefined && value !== "",
      )

      if (hasRealData) {
        console.log(`✅ Method 1 (getRecordById) successful with real data`)
        return recordFromGetById
      } else {
        console.warn(`⚠️ Method 1 returned fields but all values are empty`)
      }
    }

    // Method 2: Fallback to getCellValue for each field
    console.log(`🔄 Fallback: Using getCellValue for each field...`)
    const fieldsFromCellValue: Record<string, any> = {}
    let successCount = 0

    for (const fieldMeta of fieldMetaList) {
      const cellValue = await getCellValueProper(table, recordId, fieldMeta.id, fieldMeta.name)

      if (cellValue !== null && cellValue !== undefined) {
        fieldsFromCellValue[fieldMeta.name] = cellValue
        successCount++
      }
    }

    console.log(`📊 Method 2 (getCellValue) extracted ${successCount}/${fieldMetaList.length} fields`)

    return {
      recordId: recordId,
      fields: fieldsFromCellValue,
    }
  } catch (error) {
    console.error(`❌ Failed to extract record data for ${recordId}:`, error)
    return {
      recordId: recordId,
      fields: {},
    }
  }
}

// 🔥 STEP 8: Batch Record Processing with Proper Error Handling (FIXED)
export const getAllRecordsProper = async (tableId: string): Promise<LarkRecord[]> => {
  console.log(`🚀 ===== PROPER LARK BASE DATA EXTRACTION =====`)
  console.log(`📊 Table ID: ${tableId}`)

  try {
    // Step 1: Initialize and get table
    const table = await getTableWithProperHandling(tableId)

    // Step 2: Get metadata
    const fieldMetaList = await getFieldMetadataProper(table)
    const recordIdList = await getRecordIdsProper(table)

    console.log(`📊 Processing ${recordIdList.length} records with ${fieldMetaList.length} fields`)

    if (recordIdList.length === 0) {
      console.warn(`⚠️ No records found in table`)
      return []
    }

    if (fieldMetaList.length === 0) {
      console.warn(`⚠️ No fields found in table`)
      return []
    }

    // Step 3: Process records with proper error handling and rate limiting
    const allRecords: LarkRecord[] = []
    const batchSize = 5 // Process in small batches to avoid overwhelming the API
    const delayBetweenBatches = 500 // 500ms delay between batches

    for (let i = 0; i < recordIdList.length; i += batchSize) {
      const batch = recordIdList.slice(i, i + batchSize)
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(recordIdList.length / batchSize)}`)

      // Process batch with Promise.all for efficiency
      const batchPromises = batch.map((recordId) => extractRecordDataProper(table, recordId, fieldMetaList))

      const batchResults = await Promise.all(batchPromises)
      allRecords.push(...batchResults)

      // Delay between batches to be respectful to the API
      if (i + batchSize < recordIdList.length) {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches))
      }
    }

    // Step 4: Analyze results
    const recordsWithData = allRecords.filter(
      (record) =>
        Object.keys(record.fields).length > 0 &&
        Object.values(record.fields).some((value) => value !== null && value !== undefined && value !== ""),
    )

    const totalFields = allRecords.reduce((sum, record) => sum + Object.keys(record.fields).length, 0)
    const fieldsWithData = allRecords.reduce(
      (sum, record) =>
        sum +
        Object.values(record.fields).filter((value) => value !== null && value !== undefined && value !== "").length,
      0,
    )

    console.log(`\n📊 ===== EXTRACTION RESULTS =====`)
    console.log(`✅ Total records processed: ${allRecords.length}`)
    console.log(`✅ Records with data: ${recordsWithData.length}`)
    console.log(`✅ Total fields extracted: ${totalFields}`)
    console.log(`✅ Fields with actual data: ${fieldsWithData}`)
    console.log(`📈 Data fill rate: ${totalFields > 0 ? ((fieldsWithData / totalFields) * 100).toFixed(1) : 0}%`)
    console.log(`📈 Record success rate: ${((recordsWithData.length / allRecords.length) * 100).toFixed(1)}%`)

    if (fieldsWithData === 0) {
      console.error(`🚨 CRITICAL: No actual field data extracted!`)
      console.error(`This indicates a fundamental issue with SDK permissions or data access.`)
    } else if (fieldsWithData < totalFields * 0.5) {
      console.warn(`⚠️ WARNING: Low data extraction rate (${((fieldsWithData / totalFields) * 100).toFixed(1)}%)`)
    } else {
      console.log(`🎉 SUCCESS: Good data extraction rate!`)
    }

    console.log(`===== END PROPER EXTRACTION =====\n`)

    return allRecords
  } catch (error) {
    console.error(`❌ Proper data extraction failed:`, error)
    throw new Error(`Proper data extraction failed: ${error}`)
  }
}

// 🔥 STEP 9: Simple Test Function (FIXED)
export const testProperExtraction = async (tableId: string): Promise<any> => {
  console.log(`🧪 Testing proper extraction with single record...`)

  try {
    const table = await getTableWithProperHandling(tableId)
    const fieldMetaList = await getFieldMetadataProper(table)
    const recordIdList = await getRecordIdsProper(table)

    if (recordIdList.length === 0) {
      return { error: "No records found" }
    }

    // Test first record
    const firstRecordId = recordIdList[0]
    const recordData = await extractRecordDataProper(table, firstRecordId, fieldMetaList)

    return {
      success: true,
      tableId,
      recordId: firstRecordId,
      fieldCount: fieldMetaList.length,
      recordCount: recordIdList.length,
      extractedFields: Object.keys(recordData.fields).length,
      fieldsWithData: Object.values(recordData.fields).filter((v) => v !== null && v !== undefined && v !== "").length,
      sampleData: recordData,
      fieldMetadata: fieldMetaList.slice(0, 3).map((f) => ({
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

// 🔥 ADDITIONAL: Alternative SDK Methods Test (COMPLETELY FIXED)
export const testAlternativeSDKMethods = async (tableId: string): Promise<any> => {
  console.log(`🧪 Testing alternative SDK methods...`)

  try {
    const table = await base.getTable(tableId)
    const results: Record<string, any> = {}

    // Test 1: Check if table has alternative methods
    const tableMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(table))
    results.availableMethods = tableMethods

    console.log(`📋 Available table methods:`, tableMethods)

    // Test 2: Try getRecords if available
    if (tableMethods.includes("getRecords")) {
      try {
        const records = await (table as any).getRecords()
        results.getRecords = {
          success: true,
          count: records?.length || 0,
          sample: records?.[0] || null,
        }
        console.log(`✅ getRecords worked: ${records?.length || 0} records`)
      } catch (e) {
        results.getRecords = { success: false, error: String(e) }
        console.log(`❌ getRecords failed:`, e)
      }
    }

    // Test 3: Try getRecordList if available
    if (tableMethods.includes("getRecordList")) {
      try {
        const recordList = await (table as any).getRecordList()
        results.getRecordList = {
          success: true,
          count: recordList?.length || 0,
          sample: recordList?.[0] || null,
        }
        console.log(`✅ getRecordList worked: ${recordList?.length || 0} records`)
      } catch (e) {
        results.getRecordList = { success: false, error: String(e) }
        console.log(`❌ getRecordList failed:`, e)
      }
    }

    // Test 4: Try different parameter combinations for getCellValue (FIXED)
    const recordIds = await table.getRecordIdList()
    const fieldMeta = await table.getFieldMetaList()

    if (recordIds.length > 0 && fieldMeta.length > 0) {
      const testRecord = recordIds[0]
      const testField = fieldMeta[0]

      results.cellValueTests = {}

      // 🔧 FIXED: Only test with string parameters (field ID and field name)
      // Test by field ID
      try {
        const cellValue1 = await table.getCellValue(testRecord, testField.id)
        results.cellValueTests.by_field_id = {
          success: true,
          value: cellValue1,
          type: typeof cellValue1,
          hasValue: cellValue1 !== null && cellValue1 !== undefined && cellValue1 !== "",
          fieldId: testField.id,
          fieldName: testField.name,
          fieldType: testField.type,
        }
        console.log(`✅ getCellValue by_field_id (${testField.id}):`, typeof cellValue1, cellValue1)
      } catch (e) {
        results.cellValueTests.by_field_id = {
          success: false,
          error: String(e),
          fieldId: testField.id,
          fieldName: testField.name,
        }
        console.log(`❌ getCellValue by_field_id failed:`, e)
      }

      // Test by field name
      try {
        const cellValue2 = await table.getCellValue(testRecord, testField.name)
        results.cellValueTests.by_field_name = {
          success: true,
          value: cellValue2,
          type: typeof cellValue2,
          hasValue: cellValue2 !== null && cellValue2 !== undefined && cellValue2 !== "",
          fieldId: testField.id,
          fieldName: testField.name,
          fieldType: testField.type,
        }
        console.log(`✅ getCellValue by_field_name (${testField.name}):`, typeof cellValue2, cellValue2)
      } catch (e) {
        results.cellValueTests.by_field_name = {
          success: false,
          error: String(e),
          fieldId: testField.id,
          fieldName: testField.name,
        }
        console.log(`❌ getCellValue by_field_name failed:`, e)
      }

      // 🔧 REMOVED: by_field_object test since it's not supported by the API
      // getCellValue only accepts string parameters (field ID or field name)

      // Test additional fields if available
      if (fieldMeta.length > 1) {
        const additionalTests = fieldMeta.slice(1, 4) // Test up to 3 more fields
        results.additionalFieldTests = {}

        for (let i = 0; i < additionalTests.length; i++) {
          const field = additionalTests[i]
          const testName = `field_${i + 2}`

          try {
            const cellValue = await table.getCellValue(testRecord, field.id)
            results.additionalFieldTests[testName] = {
              success: true,
              value: cellValue,
              type: typeof cellValue,
              hasValue: cellValue !== null && cellValue !== undefined && cellValue !== "",
              fieldId: field.id,
              fieldName: field.name,
              fieldType: field.type,
            }
            console.log(`✅ Additional field test ${testName} (${field.name}):`, typeof cellValue, cellValue)
          } catch (e) {
            results.additionalFieldTests[testName] = {
              success: false,
              error: String(e),
              fieldId: field.id,
              fieldName: field.name,
              fieldType: field.type,
            }
            console.log(`❌ Additional field test ${testName} failed:`, e)
          }
        }
      }
    }

    // Summary
    const successfulTests = Object.values(results.cellValueTests || {}).filter((test: any) => test.success).length
    const totalTests = Object.keys(results.cellValueTests || {}).length

    results.summary = {
      totalMethods: tableMethods.length,
      cellValueTestsSuccessful: successfulTests,
      cellValueTestsTotal: totalTests,
      hasWorkingDataAccess: successfulTests > 0,
    }

    console.log(`📊 Alternative methods test summary:`)
    console.log(`  Available methods: ${tableMethods.length}`)
    console.log(`  Cell value tests: ${successfulTests}/${totalTests} successful`)
    console.log(`  Data access working: ${successfulTests > 0 ? "YES" : "NO"}`)

    return results
  } catch (error) {
    console.error(`❌ Alternative methods test failed:`, error)
    return { error: String(error) }
  }
}
