import { Table, Record, TableOrViewQueryResult, View, Field, Base} from '@airtable/blocks/models';
import { FieldType } from '@airtable/blocks/models';
import { Mappings, Mapping } from './Types'
import { CorrectTime, GetFormattedDate, GetFormattedTime } from './Utils';
import { CollaboratorData, ExtractedMappings } from './Types';

export interface SelectChoices {
	id: string
	name: string
	color: string
}

interface SelectWriteOption {
	id?: string
	name?: string
}

export interface QuerySorts {
	field: string
	direction?: 'asc' | 'desc'
}

interface NewRecord {fields: {[index: string]: any}}
export interface UpdateRecord {
	id: string, 
	fields: {[index: string]: string | SelectWriteOption | SelectWriteOption[]}
}


export function GetMapping(tableId: string, fieldName: string, mappings: Mappings): Mapping {
	const types = mappings.find(map => Object.keys(map).find(k => k === fieldName))
	if(!types) throw new Error(`Table id ${tableId} does not have field ${fieldName}`)
	return types[Object.keys(types)[0]].find(t => t.tableId === tableId)
}

export function GetMappings(tableId: string, fieldName: string[], mappings: Mappings) {
	return fieldName.map(field => GetMapping(tableId, field, mappings))
}

export function GetMappingFieldId(tableId: string, fieldName: string, mappings: Mappings) {
	return GetMapping(tableId, fieldName, mappings).fieldId
}

export function GetMappingFieldIds(tableId: string, fieldNames: string[], mapping: Mappings) {
	return GetMappings(tableId, fieldNames, mapping).map(map => map.fieldId)
}

export function ExtractMappings(mappings: Mapping[]) {
	return mappings.reduce<{[index: string]: Mapping}>((acc, map) => {
		let name = map.refName ? map.refName : map.fieldName
		if(name.includes('-')) {
			name = name.split('-').map((word, i) => i !== 0 
				? word.substring(0,1).toUpperCase() + word.substring(1) 
				: word
			).join('')
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
				item.refName = k.split('-').map((word, i) => i !== 0 
					? word.substring(0,1).toUpperCase() + word.substring(1) 
					: word
				).join('')
				hasTable.push(item)
			}
		})
		return hasTable
	}).flat()
}

export function SelectTable(base: Base, id: string): Table {
	return base.getTableByIdIfExists(id);
}

export function SelectView(base: Base, cursor: any, id: string, tableId?: string): View {
	const table = tableId ? SelectTable(base, tableId) : SelectTable(base, cursor.activeTableId);
	return table.getViewById(id);
}

export function SelectField(base: Base, cursor: any, id: string, tableId?: string): Field {
	const table = tableId ? SelectTable(base, tableId) : SelectTable(base, cursor.activeTableId);
	if(table === null) throw new Error(`Table Id ${tableId} does not excist in base ${base.name}`)
	return table.getFieldById(id);
}

export function SelectRecords(
	table: Table, 
	fields?: string[], 
	sorts?: QuerySorts[], 
	color?: 'none' | 'bySelectField' | 'byView'
): Promise<TableOrViewQueryResult> {
	let opts: {[index:  string]: any} = {};
	if(fields && fields.length) opts.fields = fields;
	if(sorts && sorts.length) opts.sorts = sorts;
	if(color) opts.recordColorMode = color;
	return table.selectRecordsAsync(opts);
}

export async function SelectAndLoadRecords(
	table: Table, 
	fields?: string[], 
	sorts?: QuerySorts[], 
	color?: 'none' | 'bySelectField' | 'byView'
): Promise<TableOrViewQueryResult> {
	const query = await SelectRecords(table, fields, sorts, color)
	await query.loadDataAsync()
	return query
}

export async function SelectTableAndRecords(
	base: Base, 
	tableId: string, 
	fields?: string[], 
	sorts?: QuerySorts[], 
	color?: 'none' | 'bySelectField' | 'byView'
): Promise<TableOrViewQueryResult> {
	const table = SelectTable(base, tableId)
	if(!table) throw new Error(`Table ID ${tableId} is not valid in base ${base.name}`)
	return await SelectAndLoadRecords(table, fields, sorts, color)
}

export function UnloadQuery(query: TableOrViewQueryResult) {
	query.unloadData();
}


async function ThrottleTableUsage(records: string[] | NewRecord[], func: any): Promise<string[]> {
	let results: string[] = [];
	while(records.length > 0) {
        const round = records.slice(0, 50)
		let r = await func(round) as string[]
		if(r) results = [...results, ...r]
        records.splice(0, 50)
	}
	return results;
}

export function CreateRecords(
	base: Base, 
	records: NewRecord[],
	tableId: string
): Promise<string[]> {
	const table = SelectTable(base, tableId);
	return ThrottleTableUsage(records, (r: NewRecord[]) => table.createRecordsAsync(r))
		.then(ids => [].concat.apply([], ids));
}

export function RemoveRecords(base: Base, recordsIds: string[], tableId: string) {
	const table = SelectTable(base, tableId);
	return ThrottleTableUsage(recordsIds, (r: string[]) => table.deleteRecordsAsync(r))
}

interface UserRecord {
	[index: string]: any
}

export function BuildNewRecord (
	mappings: Mapping[],
	record0: UserRecord | Record,
	options?: {noNull?: boolean, useFieldId?: boolean}
): UserRecord {
	let record: UserRecord
	if(record0 instanceof Record) {
		mappings.forEach(map => {
			record[map.fieldName] = record0.getCellValue(map.fieldId)
		})
	} else {
		record = record0
	}
	let newRecord: {[index: string]: any}
	try {
		/** Builds an object with the key being the field id and value the cell value */
		newRecord = mappings.reduce<{[index: string]: any}>((acc, map) => {
			let key: string
			if(options && options.useFieldId) {
				key = map.fieldId
			} else {
				key = map.refName ? map.refName : map.fieldName
			}
			if(!record[key]) {
				if(map.fieldType == FieldType.CREATED_TIME) return acc
				if(!options || !options.noNull) acc[map.fieldId] = null
				return acc
			}
			switch(map.fieldType) {
				case FieldType.EMAIL:
				case FieldType.URL:
				case FieldType.MULTILINE_TEXT:
				case FieldType.SINGLE_LINE_TEXT:
				case FieldType.PHONE_NUMBER:
				case FieldType.RICH_TEXT:
					acc[map.fieldId] = String(record[key])
					break
				case FieldType.NUMBER:
					acc[map.fieldId] = Number(record[key])
					break
				case FieldType.CHECKBOX:
					if(typeof record[key] === 'string') {
						acc[map.fieldId] = record[key] === 'checked' ? true : false
					} else {
						acc[map.fieldId] = record[key]
					}
					break
				case FieldType.DATE:
					if(isNaN(Number(new Date(record[key]).getTime()))) throw new Error('Invalid Date format: ' + record[key])
					acc[map.fieldId] = new Date(record[key])
					break
				case FieldType.DATE_TIME:
					if(!record[key].getTime) {
						const timeDate = record[key].split(' ') as string[]
						const resolved = CorrectTime(timeDate[1])
						if(resolved.AM) {
							record[key] = resolved.hour === '12' 
								? `${timeDate[0]} 00:${resolved.minute}` 
								: `${timeDate[0]} ${resolved.hour}:${resolved.minute}`
						} else {
							record[key] = resolved.hour === '12' 
								? `${timeDate[0]} 12:${resolved.minute}` 
								: `${timeDate[0]} ${Number(resolved.hour) + 12}:${resolved.minute}`
						}
						record[key] = new Date(record[key])
					}
					if(isNaN(Number(record[key].getTime()))) throw new Error('Invalid Date format: ' + record[key])
					acc[map.fieldId] = record[key] 
					break
				case FieldType.MULTIPLE_RECORD_LINKS:
					if(!Array.isArray(record[key])) throw new Error(key + ' is required to be an array')
					acc[map.fieldId] = record[key].map((r: string | {id: string, name: string}) => {
                        return options && options.useFieldId
                            ? typeof r === 'string' ? {id: r} : {id: r.id}
                            : typeof r === 'string' ? {name: r} : {name: r.name}
                    })
					break
				case FieldType.SINGLE_SELECT:
					if(record[key] === null) {
						acc[map.fieldId] = null
					} else {
						acc[map.fieldId] = Array.isArray(record[key]) 
							? {name: record[key][0]}
							: {name: record[key]}
					}
					break
				case FieldType.MULTIPLE_SELECTS:
					if(!Array.isArray(record[key])) throw new Error(key + ' is required to be an array')
					acc[map.fieldId] = record[key].map((r: string) => r !== null ? ({name: r}) : null)
					break
				case FieldType.CREATED_TIME: // Acceptions
					break
				default:
					throw new Error(`Invalid field type ${map.fieldType}`)
			}
			return acc;
		}, {});
	} catch (error) {
		console.error(error.message)
		return null
	}
	return newRecord
}

export function ConvertRecordMappings (wantedTable: string, record: UserRecord, mappings: Mappings): UserRecord {
    const newRecord: UserRecord = {}
    if(!record) throw new Error('Cannot convert mappings. No record present')
	Object.entries(record).forEach(([fieldKey, fieldValue]) => {
		/** Get mapping group */
		let mapping: Mapping[] = []
		mappings.forEach(allMappings => {
			const k = Object.keys(allMappings).find(k => 
				allMappings[k].find(map => map.fieldId === fieldKey)
			)
			if(k) mapping.push(...allMappings[k])
		})
		/** Find map for wanted table */
		const newMap = mapping.find(map => map.tableId === wantedTable)
		if(newMap && newMap.fieldId !== undefined) newRecord[newMap.fieldId] = fieldValue
	})
	return newRecord
}

export function UpdateRecords(base: Base, tableId: string, updates: UpdateRecord[]): Promise<void> {
	const table = SelectTable(base, tableId);
	return ThrottleTableUsage(updates, (r: UpdateRecord[]) => table.updateRecordsAsync(r))
		.then(ids => [].concat.apply([], ids));
}

export interface RecordData {
	id: string
	name: string
	tableId: string
	fields: {[index: string]: any}
}

export function GetRecordData(base: Base, records: Record[], tableId: string, fields?: string[]): RecordData[] {
	if(!fields) {
		const table = SelectTable(base, tableId)
		fields = table.fields.map(f => f.id)
	}
	return records.map(r => {
		const fieldValues: {[index: string]: any} = {}
		fields.forEach(f => {
			let value = r.getCellValue(f) as any
			if(value === null) {
				fieldValues[f] = null
			} else if(Array.isArray(value)) {
				fieldValues[f] = Array.from(value)
			} else if(typeof value === 'boolean') {
				fieldValues[f] = value
			} else if(!isNaN(Number(value))) {
				fieldValues[f] = Number(r.getCellValueAsString(f))
			} else {
                if(/[*#\\]/g.test(value)) { // String Includes special characters
                    fieldValues[f] = value
                } else {
                    fieldValues[f] = r.getCellValueAsString(f)
                }
			}
		})
		return {
			id: r.id,
			name: r.name,
			tableId,
			fields: fieldValues
		}
	})
}

export function GroupByProp(records: RecordData[], prop: string): {[index: string]: RecordData[]} {
	const group: {[index: string]: RecordData[]} = {};
	if(!records || !records.length) return group;
	records.forEach(r => {
		const type = Object.keys(r.fields).find(f => f === prop)
		if(!type) throw new Error(`Invalid prop ${prop} for record ${r.name}`)
		let key: string
		if(typeof r.fields[type] === 'string') {
			key = r.fields[type]
		} else if(Array.isArray(r.fields[type])) {
			key = r.fields[type][0].name
		} else if(typeof r.fields[type] === 'object') {
			key = r.fields[type].name
		}
		group[key] ? group[key].push(r) : group[key] = [r]
	});
	return group;
}

export async function CreateChangeRecord(
	message: string,
	user: CollaboratorData,
	base: Base,
	tableId: string,
	extracted: ExtractedMappings,
	data?: UserRecord
): Promise<string[]> {
	const date = new Date()
	const mappings = ConvertExtractedMappings(extracted)
	const change = data ? { ...data } : {}
	change[extracted.name.fieldId] = 'Change Reccord'
	change[extracted.changeRecord.fieldId] = `**${GetFormattedDate(date)} @ ${GetFormattedTime()}**\n**User**: ${user.name ? user.name : user.id}\n${message}`
	const record = BuildNewRecord(mappings, change, { useFieldId: true, noNull: true })
	return await CreateRecords(base, [{fields: record}], tableId)
} 