import { Base, Mapping, Mappings as MappingsDef } from '../types/Base'
import {
	TableId,
	ViewId,
	Table,
	View,
	FieldType,
	LinkedRecord,
	SelectOption,
} from '../types/Table'
import {
	LinkedRecordsQueryResult,
	RecordQueryResult,
	TableOrViewQueryResult,
	QueryOpts,
	Record,
	RecordData,
	CustomField,
	RecordField,
	LockedRecordField,
	RecordId,
} from '../types/Record'

import { Tables } from './Table'
import { Mappings } from './Mappings'
import { DateConverter } from '../utils/Date'
import { UpdateRecord } from '../types/Record'

import { expandRecord, expandRecordList } from '@airtable/blocks/ui'

/** Converts an Airtable Record's fields to a JSON Object */
function convertRecordFieldsToNames<T extends RecordField>(
	tableId: TableId,
	records: Record[],
	mappings: MappingsDef,
	opts?: {
		useIds?: boolean
		ignoreLinkedFields?: boolean
	}
): RecordData<T>[] {
	if (!records || !records.length) return null
	const key = opts && opts.useIds ? 'fieldId' : 'refName'
	const mappingFields = Mappings.getMappingsForTable(tableId, mappings)
	return records.map((rec) => {
		if (rec.isDeleted)
			throw new Error(
				`Cannot get record data for deleted record ${rec.name} : ${rec.id}`
			)
		const fieldValues: any = {}
		mappingFields.forEach((map) => {
			let value = rec.getCellValue(map.fieldId) as unknown
			if (value === null || value === undefined)
				return (fieldValues[map[key]] = null)
			switch (map.fieldType) {
				case FieldType.NUMBER:
					fieldValues[map[key]] = !isNaN(Number(value))
						? (value as number)
						: Number(value)
					break
				case FieldType.RICH_TEXT:
					fieldValues[map[key]] = value
					break
				case FieldType.CHECKBOX:
					fieldValues[map[key]] = value
					break
				case FieldType.SINGLE_SELECT:
				case FieldType.SINGLE_COLLABORATOR:
					fieldValues[map[key]] = value
					break
				case FieldType.MULTIPLE_RECORD_LINKS:
				case FieldType.MULTIPLE_SELECTS:
					fieldValues[map[key]] = Array.isArray(value) ? value : [value]
					break
				default:
					fieldValues[map[key]] = rec.getCellValueAsString(map.fieldId)
					break
			}
		})
		return { id: rec.id, name: rec.name, tableId, fields: fieldValues }
	})
}

/** Validates and returns a value for a string field */
function _handleString(value: string | unknown): string {
	if (typeof value === 'string') return value ? value : ''
	if (value.toString) return value.toString()
	return String(value)
}

/** Validates and returns a value for a Date / DateTime field type */
function _handleDateTime(value: Date | string, includesTime: boolean): string {
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
function _handleSelects(
	value: string | string[] | SelectOption | SelectOption[] | LinkedRecord[],
	multi: boolean
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

/** Converts a Custom Record's fields to their corrisponding IDs to be saved */
function convertRecordFieldsToIds(
	tableId: TableId,
	fields: RecordField,
	mappings: MappingsDef,
	options?: {
		fieldsOnly?: boolean
		noNull?: boolean
		useFieldId?: boolean
	}
): LockedRecordField {
	const mappingFields = Mappings.getMappingsForTable(tableId, mappings)
	const converted = mappingFields.reduce((acc, map) => {
		let key: string
		if (options?.useFieldId) {
			key = map.fieldId
		} else if (map.refName) {
			key = map.refName
		} else {
			key = map.fieldName
		}
		/** Check  for empty values */
		if (fields[key] === null || fields[key] === undefined) {
			if (fields[key] === undefined && options?.fieldsOnly) return acc
			if (map.fieldType == FieldType.CREATED_TIME) return acc
			if (!options?.noNull) acc[map.fieldId] = null
			return acc
		}
		try {
			switch (map.fieldType) {
				case FieldType.EMAIL:
				case FieldType.URL:
				case FieldType.MULTILINE_TEXT:
				case FieldType.SINGLE_LINE_TEXT:
				case FieldType.PHONE_NUMBER:
				case FieldType.RICH_TEXT:
					acc[map.fieldId] = _handleString(fields[key] as string)
					break
				case FieldType.NUMBER:
					acc[map.fieldId] = Number(fields[key])
					break
				case FieldType.CHECKBOX:
					if (typeof fields[key] === 'string') {
						acc[map.fieldId] = fields[key] === 'checked' ? true : false
					} else if (typeof fields[key] === 'boolean') {
						acc[map.fieldId] = fields[key]
					} else {
						throw new Error(
							`Invalid checkbox value: ${fields[key]} for ${map.refName}`
						)
					}
					break
				case FieldType.DATE:
					acc[map.fieldId] = _handleDateTime(fields[key] as string, false)
					break
				case FieldType.DATE_TIME:
					acc[map.fieldId] = _handleDateTime(fields[key] as string | Date, true)
					break
				case FieldType.MULTIPLE_RECORD_LINKS:
					if (!Array.isArray(fields[key]))
						throw new Error(key + ' is required to be an array')
					if (typeof fields[key] === 'string') {
						const value = fields[key] as string[]
						acc[map.fieldId] = value.map((r) => ({ id: r }))
					} else {
						const value = fields[key] as LinkedRecord[]
						acc[map.fieldId] = value.map((r) => ({ id: r.id }))
					}
					break
				case FieldType.SINGLE_COLLABORATOR:
				case FieldType.SINGLE_SELECT:
					acc[map.fieldId] = _handleSelects(fields[key] as string, false)
					break
				case FieldType.MULTIPLE_SELECTS:
					const value = fields[key] as string[] | SelectOption[]
					acc[map.fieldId] = _handleSelects(value, true)
					break
				case FieldType.CREATED_TIME: // Acceptions
					break
				default:
					throw new Error(`Invalid field type ${map.fieldType}`)
			}
		} catch (error) {
			console.error(`Error converting field ${map.fieldName} ( ${map.refName} )`)
			if (!options?.noNull) acc[map.fieldId] = null
		}
		return acc
	}, {} as RecordField)
	return converted
}

/** Unloads a Table or View Query */
function unloadQuery(
	query: RecordQueryResult | TableOrViewQueryResult | LinkedRecordsQueryResult
): void {
	query.unloadData()
}

/** Loads Records from a Table or View */
function _selectRecords(
	base: Base,
	tableOrView: Table | View,
	opts?: QueryOpts
): Promise<Record[]> {
	return new Promise<Record[]>(async (resolve, reject) => {
		let result: TableOrViewQueryResult
		try {
			result = await tableOrView.selectRecordsAsync(opts)
			unloadQuery(result)
			if (!result.records.length) {
				throw new Error('Table is Empty')
			}
		} catch (error) {
			return reject(error)
		}
		resolve(result.records)
	})
}

/** Selects all the records from a Table */
function selectRecordsFromTable(
	base: Base,
	tableId: TableId,
	opts?: QueryOpts
): Promise<Record[]> {
	const table = Tables.selectTable(base, tableId)
	return _selectRecords(base, table, opts)
}

/** Selects all the records from a View */
function selectRecordsFromView(
	base: Base,
	table: Table | TableId,
	view: ViewId | View,
	opts?: QueryOpts
): Promise<Record[]> {
	const _view = typeof view === 'string' ? Tables.selectView(base, table, view) : view
	return _selectRecords(base, _view, opts)
}

/** A Wrapper for Expandong Records in the Airtable UI */
function expandRecords(table: Table | TableId, recordIds: RecordId[]): void {
	const _ids = [...recordIds]
	if (!_ids.length) throw new Error('No record IDs passed to Exapnd Record Function')
	let _table = typeof table !== 'string' ? table.id : table
	const recordId = _ids.shift()
	expandRecord(
		{ id: recordId, parentTable: { id: _table } } as any,
		_ids.length ? (_ids.map((id) => ({ id })) as any) : null
	)
}

function expandRecordsAsList(
	table: Table | TableId,
	recordIds: RecordId[],
	fieldMappings?: Mapping[]
): void {
	const _ids = [...recordIds]
	if (!_ids.length) throw new Error('No record IDs passed to Exapnd Record Function')
	let _table = typeof table !== 'string' ? table.id : table
	expandRecordList(
		_ids.map((id) => ({ id, parentTable: { id: _table } } as any)),
		fieldMappings?.length
			? ({
					fields: fieldMappings.map((mapping) => ({
						id: mapping.fieldId,
						parentTable: { id: _table },
					})),
			  } as any)
			: null
	)
}

async function _throttleTableUsage(
	records: string[] | { fields: LockedRecordField }[] | UpdateRecord[],
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

function createRecords(
	base: Base,
	table: Table | TableId,
	records: { fields: LockedRecordField }[]
): Promise<string[]> {
	return new Promise(async (resolve, reject) => {
		let _table: Table
		if (typeof table === 'string') {
			_table = Tables.selectTable(base, table)
		} else {
			_table = table
		}
		if (typeof table === 'string') table = Tables.selectTable(base, table)
		try {
			const ids = await _throttleTableUsage(
				records,
				(r: { fields: LockedRecordField }[]) => _table.createRecordsAsync(r)
			)
			resolve(ids)
		} catch (error) {
			console.error(error)
			reject(error)
		}
	})
}

function updateRecords(
	base: Base,
	table: Table | TableId,
	records: UpdateRecord[]
): Promise<void> {
	return new Promise(async (resolve, reject) => {
		let _table: Table
		if (typeof table === 'string') {
			_table = Tables.selectTable(base, table)
		} else {
			_table = table
		}
		try {
			await _throttleTableUsage(records, (r: UpdateRecord[]) =>
				_table.updateRecordsAsync(r)
			)
			return resolve()
		} catch (error) {
			console.error(error)
			reject(error)
		}
	})
}

function removeRecords(
	base: Base,
	table: Table | TableId,
	recordIds: RecordId[]
): Promise<void> {
	return new Promise(async (resolve, reject) => {
		let _table: Table
		if (typeof table === 'string') {
			_table = Tables.selectTable(base, table)
		} else {
			_table = table
		}
		try {
			await _throttleTableUsage(recordIds, (r: string[]) =>
				_table.deleteRecordsAsync(r)
			)
			return resolve()
		} catch (error) {
			console.error(error)
			reject(error)
		}
	})
}

interface RecordsInterface {
	convertRecordFieldsToNames<T extends RecordField>(
		tableId: string,
		records: Record[],
		mappings: MappingsDef,
		opts?: {
			useIds?: boolean
			ignoreLinkedFields?: boolean
		}
	): RecordData<T>[]
	convertRecordFieldsToIds(
		tableId: TableId,
		fields: RecordField,
		mappings: MappingsDef,
		options?: {
			fieldsOnly?: boolean
			noNull?: boolean
			useFieldId?: boolean
		}
	): LockedRecordField
	selectRecordsFromTable(
		base: Base,
		tableId: TableId,
		opt?: QueryOpts
	): Promise<Record[]>
	selectRecordsFromView(
		base: Base,
		table: Table | TableId,
		view: ViewId | View,
		opt?: QueryOpts
	): Promise<Record[]>
	expandRecords(tableId: Table | TableId, records: RecordId[]): void
	expandRecordsAsList(
		tableId: Table | TableId,
		records: RecordId[],
		fieldMappings: Mapping[]
	): void
	createRecords(
		base: Base,
		table: Table | TableId,
		records: { fields: LockedRecordField }[]
	): Promise<string[]>
	updateRecords(
		base: Base,
		table: Table | TableId,
		records: UpdateRecord[]
	): Promise<void>
	removeRecords(
		base: Base,
		table: Table | TableId,
		recordIds: RecordId[]
	): Promise<void>
}

export const Records: RecordsInterface = {
	convertRecordFieldsToNames: convertRecordFieldsToNames,
	convertRecordFieldsToIds: convertRecordFieldsToIds,
	selectRecordsFromTable: selectRecordsFromTable,
	selectRecordsFromView: selectRecordsFromView,
	expandRecords: expandRecords,
	expandRecordsAsList: expandRecordsAsList,
	createRecords: createRecords,
	updateRecords: updateRecords,
	removeRecords: removeRecords,
}
