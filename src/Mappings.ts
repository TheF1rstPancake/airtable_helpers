import { Mappings, Mapping, ExtractedMappings } from "./Types"

function formatKey(key: string) {
	return key.split('-').map((word, i) => i !== 0 
		? word.substring(0,1).toUpperCase() + word.substring(1) 
		: word
	).join('')
}

export function GetMapping(
	tableId: string,
	fieldName: string,
	mappings: Mappings
): Mapping {
	const types = mappings.find(map => Object.keys(map).find(k => k === fieldName))
	if(!types) throw new Error(`Table id ${tableId} does not have field ${fieldName}`)
	return types[Object.keys(types)[0]].find(t => t.tableId === tableId)
}

export function GetMappings(
	tableId: string,
	fieldName: string[],
	mappings: Mappings
): Mapping[] {
	return fieldName.map(field => {
		const mapping = GetMapping(tableId, field, mappings)
		return {
			...mapping,
			refName: formatKey(field)
		}
	})
}

export function GetMappingFieldId(
	tableId: string,
	fieldName: string,
	mappings: Mappings
) {
	return GetMapping(tableId, fieldName, mappings).fieldId
}

export function GetMappingFieldIds(
	tableId: string,
	fieldNames: string[],
	mapping: Mappings
) {
	return GetMappings(tableId, fieldNames, mapping).map(map => map.fieldId)
}

export function ExtractMappings(mappings: Mapping[]) {
	return mappings.reduce<{[index: string]: Mapping}>((acc, map) => {
		let name = map.refName ? map.refName : map.fieldName
		if(name.includes('-')) {
			name = formatKey(name)
		}
		acc[name] = map
		return acc
	}, {})
}

export function GetExtractedMappings(
	tableId: string,
	mappings: Mappings,
	fields?: string[]
): {[index: string]: Mapping} {
	const mappingInTable = GetFieldsInTable(tableId, mappings)
	const extracted = ExtractMappings(mappingInTable)
	const valid = Object.entries(extracted).filter(([key, map]) => {
		if(!fields || fields.includes(key)) return true
		return false
	})
	return Object.fromEntries(valid)
}

export function ConvertExtractedMappings(mappings: ExtractedMappings): Mapping[] {
	return Object.values(mappings)
}

/** @TODO Add option to use regular or extracted options */
export function GetFieldIds(
	tableId: string,
	mappings: Mappings,
    fields?: string[]
): string[] {
    if(!tableId) throw new Error('No table ID')
	const mappingInTable = GetFieldsInTable(tableId, mappings)
	const extracted = ExtractMappings(mappingInTable)
	return Object.entries(extracted).filter(([key, map]) => {
		if(!fields || fields.includes(key)) return true
		return false
	}).map(([key, map]) => map.fieldId)
}

export function GetFieldsInTable(tableId: string, mappings: Mappings): Mapping[] {
    const validTable = mappings[0][Object.keys(mappings[0])[0]].findIndex(map => map.tableId === tableId)
    if(validTable === -1) throw new Error(`Invalid table id ${tableId}`)
	return mappings.map(map => {
		let hasTable: Mapping[] = []
		Object.keys(map).forEach(k => {
			const item = map[k].find(item => item.tableId === tableId && item.fieldId)
			if(item) {
				item.refName = formatKey(k)
				hasTable.push(item)
			}
		})
		return hasTable
	}).flat()
}