import { Table, Record, TableOrViewQueryResult, View, Field, Base} from '@airtable/blocks/models';
import { FieldType } from '@airtable/blocks/models';
import { Mappings, Mapping } from './Types'
import { CorrectTime, GetFormattedDate, GetFormattedTime, GetInputTimeFormat, GetInputDateFormat } from './Utils';
import { CollaboratorData, ExtractedMappings } from './Types';

export interface SelectChoices {
	id: string
	name: string
	color: string
}

export interface SelectWriteOption {
	id?: string
	name?: string
}

export interface QuerySorts {
	field: string
	direction?: 'asc' | 'desc'
}

interface NewRecord {fields: {[index: string]: any}}

type CustomField = string | string[] | number | boolean | Date | SelectWriteOption | SelectWriteOption[]
export interface RecordField {
	[index: string]: CustomField
}
export interface UpdateRecord {
	id: string, 
	fields: RecordField
}

export interface RecordData {
	id: string
	name: string
	tableId: string
	fields: RecordField
}

export interface RemoteData {
	id: string
	tableId: string,
	fields: RecordField
	dateCreates?: string
}

function formatKey(key: string) {
	return key.split('-').map((word, i) => i !== 0 
		? word.substring(0,1).toUpperCase() + word.substring(1) 
		: word
	).join('')
}

export function GetMapping(tableId: string, fieldName: string, mappings: Mappings): Mapping {
	const types = mappings.find(map => Object.keys(map).find(k => k === fieldName))
	if(!types) throw new Error(`Table id ${tableId} does not have field ${fieldName}`)
	return types[Object.keys(types)[0]].find(t => t.tableId === tableId)
}

export function GetMappings(tableId: string, fieldName: string[], mappings: Mappings) {
	return fieldName.map(field => {
		const mapping = GetMapping(tableId, field, mappings)
		return {
			...mapping,
			refName: formatKey(field)
		}
	})
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

export function SelectTable(base: Base, id: string): Table {
	return base.getTableByIdIfExists(id);
}

export function SelectView(base: Base, tableId: string, id: string): View {
	const table = SelectTable(base, tableId)
	return table.getViewById(id);
}

export function SelectField(base: Base, tableId: string, id: string): Field {
	const table = SelectTable(base, tableId)
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


export function BuildNewRecord (
	field: RecordField | Record,
	mappings: Mapping[],
	options?: {
		noNull?: boolean,
		useFieldId?: boolean
	}
): RecordField {
	let fields0: RecordField
	if(field instanceof Record) {
		mappings.forEach(map => {
			fields0[map.fieldName] = field.getCellValue(map.fieldId)
		})
	} else {
		fields0 = field
	}
	let newRecord: RecordField
	try {
		/** Builds an object with the key being the field id and value the cell value */
		newRecord = mappings.reduce<RecordField>((acc, map) => {
			let key: string, value: CustomField
			if(options && options.useFieldId) {
				key = map.fieldId
			} else {
				key = map.refName ? map.refName : map.fieldName
			}
			if(fields0[key] === null || fields0[key] === undefined) {
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
					value = fields0[key] as string
					acc[map.fieldId] = value.length ? String(value) : ''
					break
				case FieldType.NUMBER:
					acc[map.fieldId] = Number(fields0[key])
					break
				case FieldType.CHECKBOX:
					if(typeof fields0[key] === 'string') {
						acc[map.fieldId] = fields0[key] === 'checked' ? true : false
					} else {
						acc[map.fieldId] = fields0[key]
					}
					break
				case FieldType.DATE:
					value = fields0[key] as string | number
					if(isNaN(Number(new Date(value).getTime()))) throw new Error('Invalid Date format: ' + value)
					acc[map.fieldId] = new Date(value)
					break
				case FieldType.DATE_TIME:
					value = fields0[key] as Date
					if(!value.getTime) {
						value = fields0[key] as string
						const [date, time] = value.split(' ')
						const resolvedTime = GetInputTimeFormat(time, { military: true })
						fields0[key] = GetInputDateFormat(date) + ' ' + resolvedTime
						value = new Date(fields0[key] as string)
					}
					if(isNaN(Number(value.getTime()))) throw new Error('Invalid Date format: ' + value)
					acc[map.fieldId] = fields0[key]
					break
				case FieldType.MULTIPLE_RECORD_LINKS:
					if(!Array.isArray(fields0[key])) throw new Error(key + ' is required to be an array')
					value = fields0[key] as string[] | SelectWriteOption[]
					if(typeof value[0] === 'string') {
						value = fields0[key] as string[]
						acc[map.fieldId] = value.map(r => ({id: r}))
					} else {
						value = fields0[key] as SelectWriteOption[]
						acc[map.fieldId] = value.map(r => ({id: r.id}))
					}
					break
				case FieldType.SINGLE_SELECT:
					if(fields0[key] === null) {
						acc[map.fieldId] = null
					} else {
						if(Array.isArray(fields0[key])) {
							value = fields0[key] as SelectWriteOption[]
							acc[map.fieldId] = value[0]
						} else {
							acc[map.fieldId] = fields0[key]
						}
					}
					break
				case FieldType.MULTIPLE_SELECTS:
					if(!Array.isArray(fields0[key])) throw new Error('Multi Select Key: ' + key + ' is required to be an array')
					value = fields0[key] as string[] | SelectWriteOption[]
					if(typeof value[0] === 'string') {
						value = fields0[key] as string[]
						acc[map.fieldId] = value.map(r => {
							if(r === null) return null
							return {name: r}
						})
					} else {
						value = fields0[key] as SelectWriteOption[]
						acc[map.fieldId] = value.map(r => {
							if(r === null) return null
							return {name: r.name}
						})
					}
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

export function BuildNewRecords(
	mappings: Mapping[],
	fields: RecordField[],
	options?: {
		noNull?: boolean,
		useFieldId?: boolean
	}
): RecordField[] {
	return fields.map(field => BuildNewRecord(field, mappings, options))
}

export function ConvertRecordMappings (wantedTable: string, record: RecordField, mappings: Mappings): RecordField {
    const newRecord: RecordField = {}
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



export function GetRecordData(
	base: Base,
	records: Record[],
	tableId: string,
	fields?: string[],
	opts?: {
		ignoreLinkedFields?: boolean
	}
): RecordData[] {
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

export function GetNamedRecordData(
	tableId: string,
	records: Record[],
	mappings: Mappings,
	fields?: Mapping[],
	opts?: {
		useIds?: boolean,
		ignoreLinkedFields?: boolean
	}
): RecordData[] {
	const key = opts && opts.useIds ? 'fieldId' : 'refName'
	if(!fields || !fields.length) fields = GetFieldsInTable(tableId, mappings)
	return records.map(rec => {
		const fieldValues: {[index: string]: string | number | boolean | SelectChoices[] | null} = {}
		fields.forEach(f => {
			let value = rec.getCellValue(f.fieldId) as any
			if(value === null) {
				fieldValues[f[key]] = null
			} else if(Array.isArray(value)) {
				fieldValues[f[key]] = Array.from(value)
			} else if(value.id) {
				fieldValues[f[key]] = [value]
			} else if(typeof value === 'boolean') {
				fieldValues[f[key]] = value
			} else if(!isNaN(Number(value))) {
				fieldValues[f[key]] = Number(rec.getCellValueAsString(f.fieldId))
			} else {
                if(/[*#\\]/g.test(value)) { // String Includes special characters
                    fieldValues[f[key]] = value
                } else {
                    fieldValues[f[key]] = rec.getCellValueAsString(f.fieldId)
                }
			}
		})
		return {
			id: rec.id,
			name: rec.name,
			tableId,
			fields: fieldValues
		}
	})
}

export function GetRemoteRecordData(
	tableId: string,
	records: {id: string, fields: RecordField}[],
	mappings: Mappings,
	fields?: Mapping[],
	opts?: {
		useIds?: boolean,
		ignoreLinkedFields?: boolean
	}
): RemoteData[] {
	const key = opts && opts.useIds ? 'fieldId' : 'refName'
	if(!fields || !fields.length) fields = GetFieldsInTable(tableId, mappings)
	return records.map(rec => {
		const fieldValues: RecordField = {}
		fields.forEach(f => {
			let value = rec.fields[f.fieldName]
			if(value === null || value === undefined) {
				fieldValues[f[key]] = null
			} else if(Array.isArray(value)) {
				fieldValues[f[key]] = value
			} else if(typeof value === 'boolean') {
				fieldValues[f[key]] = value
			} else if(!isNaN(Number(value))) {
				fieldValues[f[key]] = Number(value)
			} else {
                if(/[*#\\]/g.test(value.toString())) { // String Includes special characters
                    fieldValues[f[key]] = value
                } else {
                    fieldValues[f[key]] = value
                }
			}
		})
		return {
			id: rec.id,
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
			key = r.fields[type] as string
		} else if(Array.isArray(r.fields[type])) {
			const selections = r.fields[type] as SelectWriteOption[]
			key = selections[0].name
		} else if(typeof r.fields[type] === 'object') {
			const selection = r.fields[type] as SelectWriteOption
			key = selection.name
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
	extracted: {
		name: Mapping,
		changeRecord: Mapping
	},
	data?: RecordField
): Promise<string[]> {
	const date = new Date()
	const mappings = ConvertExtractedMappings(extracted)
	const change = data ? { ...data } : {}
	change[extracted.name.fieldId] = 'Change Reccord'
	change[extracted.changeRecord.fieldId] = `**${GetFormattedDate(date)} @ ${GetFormattedTime()}**\n**User**: ${user.name ? user.name : user.id}\n${message}`
	const record = BuildNewRecord(change, mappings, { useFieldId: true, noNull: true })
	return await CreateRecords(base, [{fields: record}], tableId)
} 