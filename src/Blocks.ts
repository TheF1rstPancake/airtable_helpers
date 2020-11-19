import {
	Table,
	Record,
	TableOrViewQueryResult,
	View,
	Field,
	Base,
} from '@airtable/blocks/models'
import { FieldType } from '@airtable/blocks/models'
import { GetFieldsInTable } from './Mappings'
import { Mapping, Mappings } from './types/Base'
import { CustomField, RecordData, RecordField, UpdateRecord } from './types/Record'
import { QuerySorts, SelectOption } from './types/Table'
import { DateConverter } from './utils/Date'

export function SelectTable(base: Base, id: string): Table {
	console.warn('SelectTable is depricated. please use Airtable.selectTable')
	return base.getTableByIdIfExists(id)
}

export function SelectView(base: Base, tableId: string, id: string): View {
	console.warn('SelectView is depricated. please use Airtable.selectView')
	const table = SelectTable(base, tableId)
	return table.getViewByIdIfExists(id)
}

export function SelectField(base: Base, tableId: string, id: string): Field {
	console.warn('SelectField is depricated. please use Airtable.selectField')
	const table = SelectTable(base, tableId)
	if (table === null)
		throw new Error(`Table Id ${tableId} does not excist in base ${base.name}`)
	return table.getFieldById(id)
}

export function SelectRecords(
	table: Table,
	fields?: string[],
	sorts?: QuerySorts[],
	color?: 'none' | 'bySelectField' | 'byView'
): Promise<TableOrViewQueryResult> {
	let opts: { [index: string]: any } = {}
	if (fields && fields.length) opts.fields = fields
	if (sorts && sorts.length) opts.sorts = sorts
	if (color) opts.recordColorMode = color
	return table.selectRecordsAsync(opts)
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
	console.warn('SelectTableAndRecords is depricated. please use Airtable.selectRecords')
	const table = SelectTable(base, tableId)
	if (!table) throw new Error(`Table ID ${tableId} is not valid in base ${base.name}`)
	return await SelectAndLoadRecords(table, fields, sorts, color)
}

export function UnloadQuery(query: TableOrViewQueryResult) {
	console.warn('UnloadQuery is depricated')
	query.unloadData()
}

async function ThrottleTableUsage(
	records: string[] | { fields: RecordField }[] | UpdateRecord[],
	func: (
		records: string[] | { fields: RecordField }[] | UpdateRecord[]
	) => Promise<string[] | void>
): Promise<string[]> {
	let results: string[] = []
	while (records.length > 0) {
		const round = records.slice(0, 50)
		let r = (await func(round)) as string[] | void
		if (r) results = [...results, ...r]
		records.splice(0, 50)
	}
	return results
}

export function CreateRecords(
	base: Base,
	records: { fields: RecordField }[],
	tableId: string
): Promise<string[]> {
	console.warn('CreateRecords is depricated. please use Airtable.createRecords')
	const table = SelectTable(base, tableId)
	return ThrottleTableUsage(records, (r: { fields: RecordField }[]) =>
		table.createRecordsAsync(r)
	).then((ids) => [].concat.apply([], ids))
}

export function UpdateRecords(
	base: Base,
	tableId: string,
	updates: UpdateRecord[]
): Promise<void> {
	console.warn('UpdateRecords is depreicated. please use Airtable.updateRecords')
	const table = SelectTable(base, tableId)
	return ThrottleTableUsage(updates, (r: UpdateRecord[]) =>
		table.updateRecordsAsync(r)
	).then((ids) => [].concat.apply([], ids))
}

export function RemoveRecords(base: Base, recordsIds: string[], tableId: string) {
	console.warn('RemoveRecords is depreicated. please use Airtable.removeRecords')
	const table = SelectTable(base, tableId)
	return ThrottleTableUsage(recordsIds, (r: string[]) => table.deleteRecordsAsync(r))
}

/** Validates and returns a value for a string field */
function handleString(value: string | unknown): string {
	if (typeof value === 'string') return value ? value : ''
	if (value.toString) return value.toString()
	return String(value)
}

/** Validates and returns a value for a Date / DateTime field type */
function handleDateTime(value: Date | string, includesTime: boolean): string {
	let _value: string
	/** Date Time Fields */
	if (includesTime) {
		_value = DateConverter.formatDateTime(value, {
			military: true,
			asISOString: true,
		})
	} else {
		_value = DateConverter.formatDate(value, { asISOString: true })
	}
	return _value
}

/** Validates and returns a value for a select field type */
function handleSelects(
	value: string | string[] | SelectOption | SelectOption[],
	multi: boolean,
	opts?: { useId?: boolean }
): SelectOption | SelectOption[] {
	if (!multi && Array.isArray(value))
		throw new Error(`Single Selects can not be arrays`)
	if (multi && !Array.isArray(value))
		throw new Error(`Multi Selects must be an array with either an ID or Name`)
	if (multi) {
		value = value as string[] | SelectOption[]
		if (typeof value[0] === 'string') {
			// List of String
			return (value as string[]).filter((val) => val).map((val) => ({ name: val }))
		} else {
			return (value as SelectOption[])
				.filter((val) => val && (val.name || val.id))
				.map((r) => (r.id ? { id: r.id } : { name: r.name }))
		}
	} else {
		return typeof value === 'string'
			? { name: value as string }
			: (value as SelectOption).id
			? { id: (value as SelectOption).id }
			: { name: (value as SelectOption).name }
	}
}

/** Creates the fields for the Airtable Blocks API to create or update a record
 * @param field - The fields being created or updated
 * @param mappings - The mappings for the table being updated
 * @param options.noNull - Will not return keys with null values
 * @param options.useFieldId - Uses the field id instead of the reference name
 */
export function BuildNewRecord(
	field: RecordField | Record,
	mappings: Mapping[],
	options?: {
		noNull?: boolean
		useFieldId?: boolean
	}
): RecordField {
	console.warn(
		'BuildNewRecord is depreicated. please use Airtable.convertRecordFieldsToIds'
	)
	let fields0: RecordField
	if (field instanceof Record) {
		mappings.forEach(
			(map) => (fields0[map.fieldName] = field.getCellValue(map.fieldId))
		)
	} else {
		fields0 = field
	}
	let newRecord: RecordField
	try {
		/** Builds an object with the key being the field id and value the cell value */
		newRecord = mappings.reduce<RecordField>((acc, map) => {
			let key: string, value: CustomField
			key =
				options && options.useFieldId
					? map.fieldId
					: map.refName
					? map.refName
					: map.fieldName
			/** Check  for empty values */
			if (fields0[key] === null || fields0[key] === undefined) {
				if (map.fieldType == FieldType.CREATED_TIME) return acc
				if (!options || !options.noNull) acc[map.fieldId] = null
				return acc
			}
			switch (map.fieldType) {
				case FieldType.EMAIL:
				case FieldType.URL:
				case FieldType.MULTILINE_TEXT:
				case FieldType.SINGLE_LINE_TEXT:
				case FieldType.PHONE_NUMBER:
				case FieldType.RICH_TEXT:
					acc[map.fieldId] = handleString(fields0[key] as string)
					break
				case FieldType.NUMBER:
					acc[map.fieldId] = Number(fields0[key])
					break
				case FieldType.CHECKBOX:
					if (typeof fields0[key] === 'string') {
						acc[map.fieldId] = fields0[key] === 'checked' ? true : false
					} else if (typeof fields0[key] === 'boolean') {
						acc[map.fieldId] = fields0[key]
					} else {
						throw new Error(
							`Invalid checkbox value: ${fields0[key]} for ${map.refName}`
						)
					}
					break
				case FieldType.DATE:
					value = fields0[key] as string
					acc[map.fieldId] = handleDateTime(value, false)
					break
				case FieldType.DATE_TIME:
					value = fields0[key] as string | Date
					acc[map.fieldId] = handleDateTime(value, true)
					break
				case FieldType.MULTIPLE_RECORD_LINKS:
					if (!Array.isArray(fields0[key]))
						throw new Error(key + ' is required to be an array')
					value = fields0[key] as string[] | SelectOption[]
					if (typeof value[0] === 'string') {
						value = fields0[key] as string[]
						acc[map.fieldId] = value.map((r) => ({ id: r }))
					} else {
						const value = fields0[key] as SelectOption[]
						acc[map.fieldId] = value.map((r) => ({ id: r.id }))
					}
					break
				case FieldType.SINGLE_COLLABORATOR:
				case FieldType.SINGLE_SELECT:
					value = fields0[key] as string
					acc[map.fieldId] = handleSelects(value, false)
					break
				case FieldType.MULTIPLE_SELECTS:
					value = fields0[key] as string[] | SelectOption[]
					acc[map.fieldId] = handleSelects(value, true)
					break
				case FieldType.CREATED_TIME: // Acceptions
					break
				default:
					throw new Error(`Invalid field type ${map.fieldType}`)
			}
			return acc
		}, {})
	} catch (error) {
		console.error(error.message)
		return null
	}
	return newRecord
}

// export function BuildNewRecords(
// 	mappings: Mapping[],
// 	fields: RecordField[],
// 	options?: {
// 		noNull?: boolean
// 		useFieldId?: boolean
// 	}
// ): RecordField[] {
// 	return fields.map((field) => BuildNewRecord(field, mappings, options))
// }

// export function ConvertRecordMappings(
// 	wantedTable: string,
// 	fields: RecordField,
// 	mappings: Mappings,
// 	opts?: { isFieldId?: boolean }
// ): RecordField {
// 	const newRecord: RecordField = {}
// 	const key = opts && opts.isFieldId ? 'fieldId' : 'refName'
// 	if (!fields) throw new Error('Cannot convert mappings. No record present')
// 	Object.entries(fields).forEach(([fieldKey, fieldValue]) => {
// 		/** Get mapping group */
// 		let mapping: Mapping[] = []
// 		mappings.forEach((allMappings) => {
// 			const k = Object.keys(allMappings).find((k) =>
// 				allMappings[k].find((map) => map[key] === fieldKey)
// 			)
// 			if (k) mapping.push(...allMappings[k])
// 		})
// 		/** Find map for wanted table */
// 		const newMap = mapping.find((map) => map.tableId === wantedTable)
// 		if (newMap && newMap.fieldId !== undefined) newRecord[newMap.fieldId] = fieldValue
// 	})
// 	return newRecord
// }

/** Converts an Airtable Record into a Typed Record Data object
 * @param tableId - Table id of the record
 * @param records - Array of Airtable Records
 * @param mappings - Standard Mappings
 * @param opts.useIds - Returns fields with the field Id instead of the reference name
 * @param opts.ignoreLinkedFields - Will not return fields that are linked fields
 */
export function GetNamedRecordData<T extends RecordField>(
	tableId: string,
	records: Record[],
	mappings: Mappings,
	fields?: Mapping[],
	opts?: {
		useIds?: boolean
		ignoreLinkedFields?: boolean
	}
): RecordData<T>[] {
	console.warn(
		'GetNamedRecordData is depreicated. please use Airtable.convertRecordFieldsToNames'
	)
	if (!records || !records.length) return null
	const key = opts && opts.useIds ? 'fieldId' : 'refName'
	if (!fields || !fields.length) fields = GetFieldsInTable(tableId, mappings)
	return records.map((rec) => {
		if (rec.isDeleted)
			throw new Error(
				`Cannot get record data for deleted record ${rec.name} : ${rec.id}`
			)
		const fieldValues: any = {}
		fields.forEach((f) => {
			let value = rec.getCellValue(f.fieldId) as unknown
			if (value === null || value === undefined) return (fieldValues[f[key]] = null)
			switch (f.fieldType) {
				case FieldType.NUMBER:
					fieldValues[f[key]] = !isNaN(Number(value))
						? (value as number)
						: Number(value)
					break
				case FieldType.RICH_TEXT:
					fieldValues[f[key]] = value
					break
				case FieldType.CHECKBOX:
					fieldValues[f[key]] = value
					break
				case FieldType.SINGLE_SELECT:
				case FieldType.SINGLE_COLLABORATOR:
					fieldValues[f[key]] = value
					break
				case FieldType.MULTIPLE_RECORD_LINKS:
				case FieldType.MULTIPLE_SELECTS:
					fieldValues[f[key]] = Array.isArray(value) ? value : [value]
					break
				default:
					fieldValues[f[key]] = rec.getCellValueAsString(f.fieldId)
					break
			}
		})
		return { id: rec.id, name: rec.name, tableId, fields: fieldValues }
	})
}

// export function GetRemoteRecordData(
// 	tableId: string,
// 	records: { id: string; fields: RecordField }[],
// 	mappings: Mappings,
// 	fields?: Mapping[],
// 	opts?: {
// 		useIds?: boolean
// 		ignoreLinkedFields?: boolean
// 	}
// ): RemoteData[] {
// 	const key = opts && opts.useIds ? 'fieldId' : 'refName'
// 	if (!fields || !fields.length) fields = GetFieldsInTable(tableId, mappings)
// 	return records.map((rec) => {
// 		const fieldValues: RecordField = {}
// 		fields.forEach((f) => {
// 			let value = rec.fields[f.fieldName]
// 			if (value === null || value === undefined) {
// 				fieldValues[f[key]] = null
// 			} else if (Array.isArray(value)) {
// 				fieldValues[f[key]] = value
// 			} else if (typeof value === 'boolean') {
// 				fieldValues[f[key]] = value
// 			} else if (!isNaN(Number(value))) {
// 				fieldValues[f[key]] = Number(value)
// 			} else {
// 				if (/[*#\\]/g.test(value.toString())) {
// 					// String Includes special characters
// 					fieldValues[f[key]] = value
// 				} else {
// 					fieldValues[f[key]] = value
// 				}
// 			}
// 		})
// 		return {
// 			id: rec.id,
// 			tableId,
// 			fields: fieldValues,
// 		}
// 	})
// }

// export function GroupByProp<T extends RecordField>(
// 	records: RecordData<T>[],
// 	prop: string
// ): { [index: string]: RecordData<T>[] } {
// 	const group: { [index: string]: RecordData<T>[] } = {}
// 	if (!records || !records.length) return group
// 	records.forEach((r) => {
// 		const type = Object.keys(r.fields).find((f) => f === prop)
// 		if (!type) throw new Error(`Invalid prop ${prop} for record ${r.name}`)
// 		let key: string
// 		if (typeof r.fields[type] === 'string') {
// 			key = r.fields[type] as string
// 		} else if (Array.isArray(r.fields[type])) {
// 			const selections = r.fields[type] as SelectOption[]
// 			key = selections[0].name
// 		} else if (typeof r.fields[type] === 'object') {
// 			const selection = r.fields[type] as SelectOption
// 			key = selection.name
// 		}
// 		group[key] ? group[key].push(r) : (group[key] = [r])
// 	})
// 	return group
// }

// export async function CreateChangeRecord(
// 	message: string,
// 	user: CollaboratorData,
// 	base: Base,
// 	tableId: string,
// 	extracted: {
// 		name: Mapping
// 		changeRecord: Mapping
// 	},
// 	data?: RecordField
// ): Promise<string[]> {
// 	const date = new Date()
// 	const mappings = ConvertExtractedMappings(extracted)
// 	const change = data ? { ...data } : {}
// 	change[extracted.name.fieldId] = 'Change Reccord'
// 	change[extracted.changeRecord.fieldId] = `**${GetFormattedDate(
// 		date
// 	)} @ ${GetFormattedTime()}**\n**User**: ${
// 		user.name ? user.name : user.id
// 	}\n${message}`
// 	const record = BuildNewRecord(change, mappings, { useFieldId: true, noNull: true })
// 	return await CreateRecords(base, [{ fields: record }], tableId)
// }

// export function sortByRecordName<T extends RecordField>(
// 	records: RecordData<T>[],
// 	key?: string
// ): { id: string; name: string; tableId: string; fields: T }[] {
// 	if (!records || !records.length) return
// 	return records.sort((a, b) => {
// 		if (key) {
// 			if (a.fields[key] < b.fields[key]) return -1
// 			if (a.fields[key] > b.fields[key]) return 1
// 		} else {
// 			if (a.name < b.name) return -1
// 			if (a.name > b.name) return 1
// 		}
// 		return 0
// 	})
// }
