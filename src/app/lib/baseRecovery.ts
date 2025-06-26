import { base } from "@lark-base-open/js-sdk"

// 🚨 EMERGENCY DATA RECOVERY SYSTEM
// Mục tiêu: Lấy được DATA THỰC TẾ từ Lark Base, không chỉ ID

interface EmergencyRecordData {
  recordId: string
  fields: Record<string, unknown>
  extractionMethod: string
  dataFound: boolean
  debugInfo: any
}

// 🔥 METHOD 1: Direct Cell Access với tất cả field types
const directCellAccess = async (
  table: any,
  recordId: string,
  fieldMetaList: any[],
): Promise<{ fields: Record<string, unknown>; method: string; success: boolean; debugInfo: any }> => {
  console.log(`🔥 METHOD 1: Direct Cell Access for record ${recordId}`)

  const fields: Record<string, unknown> = {}
  const debugInfo: any = { fieldResults: {}, errors: [], successes: [] }
  let successCount = 0

  for (const fieldMeta of fieldMetaList) {
    const fieldName = fieldMeta.name
    const fieldId = fieldMeta.id
    const fieldType = fieldMeta.type

    console.log(`  🔍 Testing field: "${fieldName}" (${fieldType}) [ID: ${fieldId}]`)

    try {
      // Try multiple access patterns based on field type
      let cellValue = null
      let accessMethod = "none"

      // Pattern 1: Standard getCellValue with ID
      try {
        cellValue = await table.getCellValue(recordId, fieldId)
        accessMethod = "getCellValue_by_id"
        console.log(`    ✅ By ID: ${typeof cellValue} = ${JSON.stringify(cellValue).substring(0, 100)}`)
      } catch (e) {
        console.log(`    ❌ By ID failed: ${e}`)
      }

      // Pattern 2: getCellValue with name (if ID failed)
      if (cellValue === null || cellValue === undefined) {
        try {
          cellValue = await table.getCellValue(recordId, fieldName)
          accessMethod = "getCellValue_by_name"
          console.log(`    ✅ By Name: ${typeof cellValue} = ${JSON.stringify(cellValue).substring(0, 100)}`)
        } catch (e) {
          console.log(`    ❌ By Name failed: ${e}`)
        }
      }

      // Pattern 3: Type-specific extraction
      if (cellValue === null || cellValue === undefined) {
        try {
          // Try different approaches based on field type
          switch (fieldType) {
            case "Text":
            case "SingleLineText":
            case "MultiLineText":
              cellValue =
                (await table.getCellString?.(recordId, fieldId)) || (await table.getCellValue(recordId, fieldId))
              accessMethod = "getCellString"
              break

            case "Number":
            case "Currency":
            case "Percent":
              cellValue =
                (await table.getCellNumber?.(recordId, fieldId)) || (await table.getCellValue(recordId, fieldId))
              accessMethod = "getCellNumber"
              break

            case "SingleSelect":
            case "MultiSelect":
              cellValue = await table.getCellValue(recordId, fieldId)
              accessMethod = "getCellValue_select"
              break

            case "Checkbox":
              cellValue = await table.getCellValue(recordId, fieldId)
              accessMethod = "getCellValue_checkbox"
              break

            case "DateTime":
            case "CreatedTime":
            case "ModifiedTime":
              cellValue = await table.getCellValue(recordId, fieldId)
              accessMethod = "getCellValue_datetime"
              break

            case "Attachment":
              cellValue = await table.getCellValue(recordId, fieldId)
              accessMethod = "getCellValue_attachment"
              break

            case "User":
            case "CreatedUser":
            case "ModifiedUser":
              cellValue = await table.getCellValue(recordId, fieldId)
              accessMethod = "getCellValue_user"
              break

            default:
              cellValue = await table.getCellValue(recordId, fieldId)
              accessMethod = "getCellValue_default"
              break
          }

          if (cellValue !== null && cellValue !== undefined) {
            console.log(
              `    ✅ Type-specific (${fieldType}): ${typeof cellValue} = ${JSON.stringify(cellValue).substring(0, 100)}`,
            )
          }
        } catch (e) {
          console.log(`    ❌ Type-specific failed: ${e}`)
        }
      }

      // Store result
      if (cellValue !== null && cellValue !== undefined) {
        fields[fieldName] = cellValue
        successCount++
        debugInfo.successes.push({
          fieldName,
          fieldType,
          accessMethod,
          valueType: typeof cellValue,
          valuePreview: JSON.stringify(cellValue).substring(0, 50),
        })
      } else {
        fields[fieldName] = null
        debugInfo.errors.push({
          fieldName,
          fieldType,
          error: "All access methods returned null/undefined",
        })
      }

      debugInfo.fieldResults[fieldName] = {
        fieldType,
        accessMethod,
        success: cellValue !== null && cellValue !== undefined,
        value: cellValue,
      }
    } catch (error) {
      console.log(`    ❌ Field extraction completely failed: ${error}`)
      fields[fieldName] = { error: `Extraction failed: ${error}` }
      debugInfo.errors.push({
        fieldName,
        fieldType,
        error: String(error),
      })
    }
  }

  console.log(`  📊 Direct Cell Access: ${successCount}/${fieldMetaList.length} fields extracted`)

  return {
    fields,
    method: "direct_cell_access",
    success: successCount > 0,
    debugInfo,
  }
}

// 🔥 METHOD 2: Record Batch Access
const recordBatchAccess = async (
  table: any,
  recordId: string,
  fieldMetaList: any[],
): Promise<{ fields: Record<string, unknown>; method: string; success: boolean; debugInfo: any }> => {
  console.log(`🔥 METHOD 2: Record Batch Access for record ${recordId}`)

  const debugInfo: any = { attempts: [], errors: [] }

  try {
    // Attempt 1: Standard getRecordById
    console.log(`  🔄 Attempt 1: Standard getRecordById`)
    const recordData = await table.getRecordById(recordId)

    if (recordData) {
      console.log(`    ✅ Record object retrieved`)
      console.log(`    📊 Record keys:`, Object.keys(recordData))

      if (recordData.fields) {
        const fieldCount = Object.keys(recordData.fields).length
        console.log(`    ✅ Fields object found with ${fieldCount} fields`)
        console.log(`    📋 Field keys:`, Object.keys(recordData.fields))

        // Analyze field values
        const fieldsWithData = Object.entries(recordData.fields).filter(
          ([_, value]) => value !== null && value !== undefined && value !== "",
        ).length

        console.log(`    📈 Fields with data: ${fieldsWithData}/${fieldCount}`)

        debugInfo.attempts.push({
          method: "getRecordById",
          success: true,
          fieldCount,
          fieldsWithData,
          fields: recordData.fields,
        })

        return {
          fields: recordData.fields,
          method: "record_batch_access",
          success: fieldsWithData > 0,
          debugInfo,
        }
      } else {
        console.log(`    ❌ No fields object in record`)
        debugInfo.errors.push("Record exists but no fields object")
      }
    } else {
      console.log(`    ❌ No record data returned`)
      debugInfo.errors.push("getRecordById returned null/undefined")
    }

    // Attempt 2: Try alternative record access methods
    console.log(`  🔄 Attempt 2: Alternative record methods`)

    // Check what methods are available on the table object
    const tableMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(table))
    console.log(`    📋 Available table methods:`, tableMethods)

    // Try any alternative record methods
    const alternativeMethods = tableMethods.filter(
      (method) => method.toLowerCase().includes("record") || method.toLowerCase().includes("row"),
    )

    for (const methodName of alternativeMethods) {
      if (methodName !== "getRecordById") {
        try {
          console.log(`    🔄 Trying ${methodName}`)
          const result = await table[methodName](recordId)
          if (result && typeof result === "object") {
            console.log(`    ✅ ${methodName} returned:`, Object.keys(result))
            debugInfo.attempts.push({
              method: methodName,
              success: true,
              result: result,
            })
          }
        } catch (e) {
          console.log(`    ❌ ${methodName} failed: ${e}`)
        }
      }
    }

    return {
      fields: {},
      method: "record_batch_access",
      success: false,
      debugInfo,
    }
  } catch (error) {
    console.log(`  ❌ Record Batch Access failed: ${error}`)
    debugInfo.errors.push(String(error))

    return {
      fields: {},
      method: "record_batch_access",
      success: false,
      debugInfo,
    }
  }
}

// 🔥 METHOD 3: Raw SDK Exploration
const rawSDKExploration = async (
  table: any,
  recordId: string,
  fieldMetaList: any[],
): Promise<{ fields: Record<string, unknown>; method: string; success: boolean; debugInfo: any }> => {
  console.log(`🔥 METHOD 3: Raw SDK Exploration for record ${recordId}`)

  const debugInfo: any = { sdkMethods: [], attempts: [], discoveries: [] }
  const fields: Record<string, unknown> = {}

  try {
    // Explore all available methods on table object
    const tableMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(table))
    const tableOwnMethods = Object.getOwnPropertyNames(table)

    console.log(`  📋 Table prototype methods (${tableMethods.length}):`, tableMethods)
    console.log(`  📋 Table own methods (${tableOwnMethods.length}):`, tableOwnMethods)

    debugInfo.sdkMethods = { prototype: tableMethods, own: tableOwnMethods }

    // Try methods that might return data
    const dataMethods = tableMethods.filter(
      (method) =>
        method.toLowerCase().includes("get") ||
        method.toLowerCase().includes("read") ||
        method.toLowerCase().includes("fetch") ||
        method.toLowerCase().includes("cell") ||
        method.toLowerCase().includes("value") ||
        method.toLowerCase().includes("data"),
    )

    console.log(`  🎯 Potential data methods:`, dataMethods)

    for (const methodName of dataMethods) {
      try {
        console.log(`  🔄 Exploring ${methodName}`)

        // Try with recordId only
        try {
          const method = (table as any)[methodName]
          if (typeof method === "function") {
            const result1 = await method.call(table, recordId)
            if (result1 !== null && result1 !== undefined) {
              console.log(
                `    ✅ ${methodName}(recordId) returned:`,
                typeof result1,
                JSON.stringify(result1).substring(0, 100),
              )
              debugInfo.discoveries.push({
                method: methodName,
                params: "recordId",
                result: result1,
                type: typeof result1,
              })
            }
          }
        } catch (e) {
          // Silent fail for single param
        }

        // Try with recordId and fieldId
        for (const fieldMeta of fieldMetaList.slice(0, 3)) {
          // Test first 3 fields
          try {
            const method2 = (table as any)[methodName]
            if (typeof method2 === "function") {
              const result2 = await method2.call(table, recordId, fieldMeta.id)
              if (result2 !== null && result2 !== undefined) {
                console.log(
                  `    ✅ ${methodName}(recordId, fieldId) for "${fieldMeta.name}" returned:`,
                  typeof result2,
                  JSON.stringify(result2).substring(0, 100),
                )
                fields[fieldMeta.name] = result2
                debugInfo.discoveries.push({
                  method: methodName,
                  params: "recordId, fieldId",
                  fieldName: fieldMeta.name,
                  result: result2,
                  type: typeof result2,
                })
              }
            }
          } catch (e) {
            // Silent fail for double param
          }

          // Try with recordId and fieldName
          try {
            const method3 = (table as any)[methodName]
            if (typeof method3 === "function") {
              const result3 = await method3.call(table, recordId, fieldMeta.name)
              if (result3 !== null && result3 !== undefined) {
                console.log(
                  `    ✅ ${methodName}(recordId, fieldName) for "${fieldMeta.name}" returned:`,
                  typeof result3,
                  JSON.stringify(result3).substring(0, 100),
                )
                if (!fields[fieldMeta.name]) {
                  // Only set if not already set
                  fields[fieldMeta.name] = result3
                }
                debugInfo.discoveries.push({
                  method: methodName,
                  params: "recordId, fieldName",
                  fieldName: fieldMeta.name,
                  result: result3,
                  type: typeof result3,
                })
              }
            }
          } catch (e) {
            // Silent fail for double param
          }
        }
      } catch (error) {
        // Silent fail for method exploration
      }
    }

    const successCount = Object.keys(fields).length
    console.log(`  📊 Raw SDK Exploration: ${successCount} fields discovered`)

    return {
      fields,
      method: "raw_sdk_exploration",
      success: successCount > 0,
      debugInfo,
    }
  } catch (error) {
    console.log(`  ❌ Raw SDK Exploration failed: ${error}`)

    return {
      fields: {},
      method: "raw_sdk_exploration",
      success: false,
      debugInfo: { ...debugInfo, error: String(error) },
    }
  }
}

// 🔥 METHOD 4: Base Object Deep Dive
const baseObjectDeepDive = async (
  table: any, // Thay đổi từ tableId thành table object
  recordId: string,
  fieldMetaList: any[],
): Promise<{ fields: Record<string, unknown>; method: string; success: boolean; debugInfo: any }> => {
  console.log(`🔥 METHOD 4: Base Object Deep Dive`)

  const debugInfo: any = { baseMethods: [], attempts: [], discoveries: [] }
  const fields: Record<string, unknown> = {}

  try {
    // Explore base object methods
    const baseMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(base))
    const baseOwnMethods = Object.getOwnPropertyNames(base)

    console.log(`  📋 Base prototype methods (${baseMethods.length}):`, baseMethods)
    console.log(`  📋 Base own methods (${baseOwnMethods.length}):`, baseOwnMethods)

    debugInfo.baseMethods = { prototype: baseMethods, own: baseOwnMethods }

    // Try alternative ways to access data through base object
    const dataAccessMethods = baseMethods.filter(
      (method) =>
        method.toLowerCase().includes("get") ||
        method.toLowerCase().includes("read") ||
        method.toLowerCase().includes("fetch") ||
        method.toLowerCase().includes("cell") ||
        method.toLowerCase().includes("record") ||
        method.toLowerCase().includes("data"),
    )

    console.log(`  🎯 Potential base data methods:`, dataAccessMethods)

    for (const methodName of dataAccessMethods) {
      try {
        console.log(`  🔄 Exploring base.${methodName}`)

        // Try different parameter combinations
        const paramCombinations = [
          [table.id],
          [table.id, recordId],
          [table.id, recordId, fieldMetaList[0]?.id],
          [table.id, recordId, fieldMetaList[0]?.name],
        ]

        for (const params of paramCombinations) {
          try {
            const method = (base as any)[methodName]
            if (typeof method === "function") {
              const result = await method.call(base, ...params)
              if (result !== null && result !== undefined) {
                console.log(
                  `    ✅ base.${methodName}(${params.join(", ")}) returned:`,
                  typeof result,
                  JSON.stringify(result).substring(0, 100),
                )
                debugInfo.discoveries.push({
                  method: `base.${methodName}`,
                  params: params,
                  result: result,
                  type: typeof result,
                })

                // Try to extract field data from result
                if (typeof result === "object" && result.fields) {
                  Object.assign(fields, result.fields)
                }
              }
            }
          } catch (e) {
            // Silent fail
          }
        }
      } catch (error) {
        // Silent fail for method exploration
      }
    }

    const successCount = Object.keys(fields).length
    console.log(`  📊 Base Object Deep Dive: ${successCount} fields discovered`)

    return {
      fields,
      method: "base_object_deep_dive",
      success: successCount > 0,
      debugInfo,
    }
  } catch (error) {
    console.log(`  ❌ Base Object Deep Dive failed: ${error}`)

    return {
      fields: {},
      method: "base_object_deep_dive",
      success: false,
      debugInfo: { ...debugInfo, error: String(error) },
    }
  }
}

// 🔥 MAIN: Emergency Data Recovery
export const emergencyDataRecovery = async (
  tableId: string,
  recordIds: string[],
  fieldMetaList: any[],
): Promise<{
  recoveredData: EmergencyRecordData[]
  recoveryReport: string
  bestMethod: string
  totalDataFound: number
}> => {
  console.log(`🚨 ===== EMERGENCY DATA RECOVERY SYSTEM =====`)
  console.log(`📊 Target: ${recordIds.length} records, ${fieldMetaList.length} fields`)
  console.log(`🎯 Goal: Extract ACTUAL DATA, not just IDs`)

  const table = await base.getTable(tableId)
  if (!table) {
    throw new Error("Cannot get table object")
  }

  const recoveredData: EmergencyRecordData[] = []
  const methodResults: Record<string, { success: number; total: number; fields: number }> = {}
  let totalDataFound = 0
  let bestMethod = "none"
  const bestScore = 0

  // Test all methods on first few records to find the best approach
  const testRecords = recordIds.slice(0, Math.min(5, recordIds.length))

  console.log(`\n🧪 TESTING ALL METHODS ON ${testRecords.length} SAMPLE RECORDS...`)

  for (let i = 0; i < testRecords.length; i++) {
    const recordId = testRecords[i]
    console.log(`\n📊 Testing record ${i + 1}/${testRecords.length}: ${recordId}`)

    const methods = [
      { name: "direct_cell_access", func: directCellAccess },
      { name: "record_batch_access", func: recordBatchAccess },
      { name: "raw_sdk_exploration", func: rawSDKExploration },
      { name: "base_object_deep_dive", func: baseObjectDeepDive },
    ]

    let bestRecordResult: any = null
    let bestRecordScore = 0

    for (const method of methods) {
      try {
        console.log(`  🔄 Testing ${method.name}...`)

        let result
        if (method.name === "base_object_deep_dive") {
          result = await baseObjectDeepDive(table, recordId, fieldMetaList)
        } else {
          result = await method.func(table, recordId, fieldMetaList)
        }

        const fieldsWithData = Object.entries(result.fields).filter(
          ([_, value]) => value !== null && value !== undefined && value !== "" && !String(value).includes("error"),
        ).length

        const score = fieldsWithData

        console.log(`    📊 ${method.name}: ${fieldsWithData} fields with data`)

        if (!methodResults[method.name]) {
          methodResults[method.name] = { success: 0, total: 0, fields: 0 }
        }

        methodResults[method.name].total++
        methodResults[method.name].fields += fieldsWithData

        if (result.success && fieldsWithData > 0) {
          methodResults[method.name].success++
        }

        if (score > bestRecordScore) {
          bestRecordResult = { ...result, methodName: method.name }
          bestRecordScore = score
        }
      } catch (error) {
        console.log(`    ❌ ${method.name} failed: ${error}`)
      }
    }

    // Store the best result for this record
    if (bestRecordResult) {
      const fieldsWithData = Object.entries(bestRecordResult.fields).filter(
        ([_, value]) => value !== null && value !== undefined && value !== "" && !String(value).includes("error"),
      ).length

      recoveredData.push({
        recordId: recordId,
        fields: bestRecordResult.fields,
        extractionMethod: bestRecordResult.methodName,
        dataFound: fieldsWithData > 0,
        debugInfo: bestRecordResult.debugInfo,
      })

      totalDataFound += fieldsWithData
    } else {
      // No method worked
      recoveredData.push({
        recordId: recordId,
        fields: {},
        extractionMethod: "none",
        dataFound: false,
        debugInfo: { error: "All methods failed" },
      })
    }
  }

  // Determine best method overall
  let bestMethodScore = 0
  Object.entries(methodResults).forEach(([methodName, stats]) => {
    const avgFields = stats.total > 0 ? stats.fields / stats.total : 0
    const successRate = stats.total > 0 ? (stats.success / stats.total) * 100 : 0
    const combinedScore = avgFields * (successRate / 100)

    console.log(`📊 ${methodName}: ${avgFields.toFixed(1)} avg fields, ${successRate.toFixed(1)}% success rate`)

    if (combinedScore > bestMethodScore) {
      bestMethodScore = combinedScore
      bestMethod = methodName
    }
  })

  console.log(`\n🎯 BEST METHOD: ${bestMethod} (score: ${bestMethodScore.toFixed(2)})`)

  // If we found a working method, process remaining records
  if (bestMethod !== "none" && recordIds.length > testRecords.length) {
    console.log(`\n🚀 PROCESSING REMAINING ${recordIds.length - testRecords.length} RECORDS WITH ${bestMethod}...`)

    const remainingRecords = recordIds.slice(testRecords.length)

    for (let i = 0; i < remainingRecords.length; i++) {
      const recordId = remainingRecords[i]

      try {
        let result
        switch (bestMethod) {
          case "direct_cell_access":
            result = await directCellAccess(table, recordId, fieldMetaList)
            break
          case "record_batch_access":
            result = await recordBatchAccess(table, recordId, fieldMetaList)
            break
          case "raw_sdk_exploration":
            result = await rawSDKExploration(table, recordId, fieldMetaList)
            break
          case "base_object_deep_dive":
            result = await baseObjectDeepDive(table, recordId, fieldMetaList)
            break
          default:
            result = { fields: {}, method: "none", success: false, debugInfo: {} }
        }

        const fieldsWithData = Object.entries(result.fields).filter(
          ([_, value]) => value !== null && value !== undefined && value !== "" && !String(value).includes("error"),
        ).length

        recoveredData.push({
          recordId: recordId,
          fields: result.fields,
          extractionMethod: bestMethod,
          dataFound: fieldsWithData > 0,
          debugInfo: result.debugInfo,
        })

        totalDataFound += fieldsWithData

        // Progress logging
        if ((i + 1) % 25 === 0) {
          console.log(`  📊 Progress: ${i + 1}/${remainingRecords.length} remaining records`)
        }
      } catch (error) {
        console.log(`  ❌ Failed to process record ${recordId}: ${error}`)
        recoveredData.push({
          recordId: recordId,
          fields: {},
          extractionMethod: "error",
          dataFound: false,
          debugInfo: { error: String(error) },
        })
      }
    }
  }

  // Generate recovery report
  const recordsWithData = recoveredData.filter((r) => r.dataFound).length
  const avgFieldsPerRecord = recoveredData.length > 0 ? totalDataFound / recoveredData.length : 0

  const recoveryReport = `
🚨 EMERGENCY DATA RECOVERY REPORT:
  📊 Total records processed: ${recoveredData.length}
  ✅ Records with data found: ${recordsWithData}
  📈 Total fields with data: ${totalDataFound}
  📊 Average fields per record: ${avgFieldsPerRecord.toFixed(1)}
  🎯 Best extraction method: ${bestMethod}
  
📋 Method Performance:
${Object.entries(methodResults)
  .map(([method, stats]) => {
    const avgFields = stats.total > 0 ? stats.fields / stats.total : 0
    const successRate = stats.total > 0 ? (stats.success / stats.total) * 100 : 0
    return `  ${method}: ${avgFields.toFixed(1)} avg fields, ${successRate.toFixed(1)}% success`
  })
  .join("\n")}

🎯 RECOVERY STATUS:
${
  totalDataFound === 0
    ? "🚨 CRITICAL: NO DATA RECOVERED - Fundamental SDK/Permission Issue"
    : recordsWithData === recoveredData.length
      ? "🎉 PERFECT: All records have data"
      : recordsWithData > recoveredData.length * 0.8
        ? "✅ GOOD: Most records have data"
        : "⚠️ PARTIAL: Some data recovered but issues remain"
}

${
  totalDataFound === 0
    ? `
🔧 TROUBLESHOOTING STEPS:
  1. Check Lark Base permissions
  2. Verify SDK version compatibility  
  3. Test with different table/records
  4. Check browser console for errors
  5. Verify app is running inside Lark Base
`
    : ""
}
  `

  console.log(recoveryReport)
  console.log(`===== END EMERGENCY DATA RECOVERY =====\n`)

  return {
    recoveredData,
    recoveryReport,
    bestMethod,
    totalDataFound,
  }
}

// Export the emergency recovery function
export type { EmergencyRecordData }
