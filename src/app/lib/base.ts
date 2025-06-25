import { base } from "@lark-base-open/js-sdk"

// Interface cho record data
interface RecordData {
  recordId: string
  fields: Record<string, unknown>
  strategy?: string
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

// Function chính lấy TẤT CẢ dữ liệu từ bảng
export const getTableData = async (tableId: string): Promise<RecordData[]> => {
  try {
    console.log(`📥 Getting ALL data from table: ${tableId}`)

    const table = await base.getTable(tableId)
    if (!table) {
      throw new Error("Không thể lấy table object")
    }

    // Lấy tất cả record IDs
    const recordIdList = await table.getRecordIdList()
    console.log(`📊 Found ${recordIdList.length} records in table`)

    if (recordIdList.length === 0) {
      console.log("⚠️ Table không có records")
      return []
    }

    // Lấy tất cả records
    const allData: RecordData[] = []
    let successCount = 0
    let errorCount = 0

    console.log(`📥 Loading ${recordIdList.length} records...`)

    // Process records in batches để tránh overload
    const batchSize = 50
    for (let i = 0; i < recordIdList.length; i += batchSize) {
      const batch = recordIdList.slice(i, i + batchSize)
      console.log(
        `📦 Processing batch ${Math.floor(i / batchSize) + 1}: records ${i + 1}-${Math.min(i + batchSize, recordIdList.length)}`,
      )

      const batchPromises = batch.map(async (recordId) => {
        try {
          const recordData = await table.getRecordById(recordId)
          if (recordData && recordData.fields) {
            successCount++
            return {
              recordId: recordId,
              fields: recordData.fields,
            }
          } else {
            console.warn(`⚠️ Record ${recordId} has no fields`)
            return {
              recordId: recordId,
              fields: {},
            }
          }
        } catch (recordError) {
          errorCount++
          console.error(`❌ Error getting record ${recordId}:`, recordError)
          return {
            recordId: recordId,
            fields: { error: `Cannot read record: ${recordError}` },
          }
        }
      })

      const batchResults = await Promise.all(batchPromises)
      allData.push(...batchResults)

      // Small delay between batches
      if (i + batchSize < recordIdList.length) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    console.log(`✅ Data loading complete:`)
    console.log(`  📊 Total records: ${recordIdList.length}`)
    console.log(`  ✅ Successfully loaded: ${successCount}`)
    console.log(`  ❌ Errors: ${errorCount}`)
    console.log(`  📄 Final data array length: ${allData.length}`)

    // Analyze data quality
    const recordsWithData = allData.filter((record) =>
      Object.values(record.fields).some((value) => value !== null && value !== undefined && value !== ""),
    )

    console.log(`📊 Data quality analysis:`)
    console.log(`  Records with actual data: ${recordsWithData.length}/${allData.length}`)
    console.log(`  Empty records: ${allData.length - recordsWithData.length}`)

    if (recordsWithData.length > 0) {
      // Show sample of field names
      const sampleRecord = recordsWithData[0]
      const fieldNames = Object.keys(sampleRecord.fields)
      console.log(`  Sample fields (${fieldNames.length}):`, fieldNames.slice(0, 10))
    }

    return allData
  } catch (error) {
    console.error("❌ Error getting table data:", error)
    throw new Error(`Không thể lấy dữ liệu bảng: ${error}`)
  }
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

    // Lấy data
    const data = await getTableData(tableId)

    return {
      data,
      fieldTypes,
      fieldNames,
      fieldMetadata,
    }
  } catch (error) {
    console.error("❌ Error getting table data with enhanced metadata:", error)
    throw error
  }
}

// 🔥 MULTIPLE EXTRACTION STRATEGIES để khắc phục data loss
export interface ExtractionStrategy {
  name: string
  description: string
  extract: (tableId: string) => Promise<RecordData[]>
}

// 🔥 STRATEGY 1: Batch extraction với retry
const batchExtractionStrategy = async (tableId: string): Promise<RecordData[]> => {
  console.log(`🔄 STRATEGY 1: Batch extraction với retry mechanism...`)

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

// 🔥 STRATEGY 2: Sequential extraction với exponential backoff
const sequentialExtractionStrategy = async (tableId: string): Promise<RecordData[]> => {
  console.log(`🔄 STRATEGY 2: Sequential extraction với exponential backoff...`)

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

// 🔥 STRATEGY 3: Parallel extraction với controlled concurrency
const parallelExtractionStrategy = async (tableId: string): Promise<RecordData[]> => {
  console.log(`🔄 STRATEGY 3: Parallel extraction với controlled concurrency...`)

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

// 🔥 STRATEGY 4: Field-by-field extraction (for problematic tables)
const fieldByFieldExtractionStrategy = async (tableId: string): Promise<RecordData[]> => {
  console.log(`🔄 STRATEGY 4: Field-by-field extraction strategy...`)

  try {
    const table = await base.getTable(tableId)
    if (!table) throw new Error("Cannot get table")

    const recordIdList = await table.getRecordIdList()
    const fieldMetaList = await table.getFieldMetaList()

    console.log(`📊 Field-by-field processing: ${recordIdList.length} records × ${fieldMetaList.length} fields`)

    const allData: RecordData[] = []

    for (let i = 0; i < recordIdList.length; i++) {
      const recordId = recordIdList[i]
      let recordFields: Record<string, unknown> = {}

      // Try to get complete record first
      try {
        const completeRecord = await table.getRecordById(recordId)
        if (completeRecord?.fields) {
          recordFields = completeRecord.fields
        }
      } catch (error) {
        console.warn(`⚠️ Complete record fetch failed for ${recordId}, trying field-by-field`)

        // Fallback to field-by-field extraction
        for (const fieldMeta of fieldMetaList) {
          try {
            const cellValue = await table.getCellValue(recordId, fieldMeta.id)
            if (cellValue !== null && cellValue !== undefined) {
              recordFields[fieldMeta.name] = cellValue
            }
          } catch (fieldError) {
            console.warn(`⚠️ Field extraction failed for ${fieldMeta.name}:`, fieldError)
            recordFields[fieldMeta.name] = { error: `Field extraction failed: ${fieldError}` }
          }
        }
      }

      allData.push({
        recordId: recordId,
        fields: recordFields,
        strategy: "field-by-field",
      })

      // Progress logging
      if ((i + 1) % 25 === 0) {
        console.log(`📊 Field-by-field progress: ${i + 1}/${recordIdList.length} records`)
      }

      // Small delay to avoid overwhelming the API
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    console.log(`✅ Field-by-field extraction completed: ${allData.length}/${recordIdList.length} records`)
    return allData
  } catch (error) {
    console.error(`❌ Field-by-field extraction strategy failed:`, error)
    throw error
  }
}

// 🔥 MAIN: Multi-strategy data extraction with fallback
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
    strategies: Array<{ name: string; success: boolean; recordCount: number; error?: string }>
  }
}> => {
  console.log(`🚀 ===== MULTI-STRATEGY DATA EXTRACTION =====`)
  console.log(`📊 Table ID: ${tableId}`)

  try {
    // Get expected record count
    const table = await base.getTable(tableId)
    if (!table) throw new Error("Cannot get table object")

    const recordIdList = await table.getRecordIdList()
    const expectedRecordCount = recordIdList.length

    console.log(`📊 Expected records: ${expectedRecordCount}`)

    // Define extraction strategies in order of preference
    const strategies: ExtractionStrategy[] = [
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
      {
        name: "Field-by-Field Extraction",
        description: "Individual field extraction for problematic tables",
        extract: fieldByFieldExtractionStrategy,
      },
    ]

    const strategyResults: Array<{
      name: string
      success: boolean
      recordCount: number
      error?: string
      data?: RecordData[]
    }> = []
    let bestResult: { data: RecordData[]; strategy: string } | null = null
    let bestRecordCount = 0

    // Try each strategy
    for (const strategy of strategies) {
      console.log(`\n🔄 Trying strategy: ${strategy.name}`)
      console.log(`📝 Description: ${strategy.description}`)

      try {
        const startTime = Date.now()
        const strategyData = await strategy.extract(tableId)
        const extractionTime = Date.now() - startTime

        const recordCount = strategyData.length
        const dataQuality = calculateDataQuality(strategyData)

        console.log(`✅ ${strategy.name} completed:`)
        console.log(`  📊 Records: ${recordCount}/${expectedRecordCount}`)
        console.log(`  ⏱️ Time: ${extractionTime}ms`)
        console.log(`  📈 Data quality: ${dataQuality.qualityScore.toFixed(1)}%`)

        strategyResults.push({
          name: strategy.name,
          success: true,
          recordCount: recordCount,
          data: strategyData,
        })

        // Keep the best result (highest record count and quality)
        if (recordCount > bestRecordCount || (recordCount === bestRecordCount && dataQuality.qualityScore > 90)) {
          bestResult = { data: strategyData, strategy: strategy.name }
          bestRecordCount = recordCount
        }

        // If we got perfect extraction, stop here
        if (recordCount === expectedRecordCount && dataQuality.qualityScore > 95) {
          console.log(`🎯 Perfect extraction achieved with ${strategy.name}!`)
          break
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error(`❌ ${strategy.name} failed: ${errorMsg}`)

        strategyResults.push({
          name: strategy.name,
          success: false,
          recordCount: 0,
          error: errorMsg,
        })
      }
    }

    // Use the best result
    if (!bestResult) {
      throw new Error("All extraction strategies failed")
    }

    const dataLossPercentage = ((expectedRecordCount - bestRecordCount) / expectedRecordCount) * 100

    const extractionReport = `
🔍 MULTI-STRATEGY EXTRACTION REPORT:
  📊 Expected records: ${expectedRecordCount}
  ✅ Extracted records: ${bestRecordCount}
  📉 Data loss: ${dataLossPercentage.toFixed(1)}%
  🎯 Best strategy: ${bestResult.strategy}
  
📋 Strategy Results:
${strategyResults
  .map((s) => `  ${s.success ? "✅" : "❌"} ${s.name}: ${s.recordCount} records${s.error ? ` (${s.error})` : ""}`)
  .join("\n")}

${
  dataLossPercentage === 0
    ? "🎉 ZERO DATA LOSS ACHIEVED!"
    : dataLossPercentage < 5
      ? "✅ Minimal data loss (< 5%)"
      : dataLossPercentage < 10
        ? "⚠️ Moderate data loss (< 10%)"
        : "❌ Significant data loss (> 10%) - Manual review required"
}
    `

    console.log(extractionReport)
    console.log(`===== END MULTI-STRATEGY EXTRACTION =====\n`)

    return {
      data: bestResult.data,
      strategy: bestResult.strategy,
      extractionReport: extractionReport,
      dataQuality: {
        totalExpected: expectedRecordCount,
        totalExtracted: bestRecordCount,
        dataLossPercentage: dataLossPercentage,
        strategies: strategyResults.map((s) => ({
          name: s.name,
          success: s.success,
          recordCount: s.recordCount,
          error: s.error,
        })),
      },
    }
  } catch (error) {
    console.error(`❌ Multi-strategy extraction failed:`, error)
    throw new Error(`Multi-strategy extraction failed: ${error}`)
  }
}

// Helper function to calculate data quality
const calculateDataQuality = (data: RecordData[]): { qualityScore: number; stats: any } => {
  if (data.length === 0) return { qualityScore: 0, stats: {} }

  let totalFields = 0
  let fieldsWithData = 0
  let errorFields = 0

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

  return {
    qualityScore: qualityScore,
    stats: {
      totalFields,
      fieldsWithData,
      errorFields,
      errorRate: errorRate,
      dataFillRate: qualityScore,
    },
  }
}

// Export all functions
export { type RecordData, type TableStats, type SDKStatus, formatFieldValue }
