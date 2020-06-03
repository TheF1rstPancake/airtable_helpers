import { base, cursor } from '@airtable/blocks';
import { Table, Record, TableOrViewQueryResult, View, Field} from '@airtable/blocks/models';
import { FieldId } from '@airtable/blocks/dist/types/src/types/field';
import { Mappings, Mapping } from './Types'
import { has } from '@airtable/blocks/dist/types/src/private_utils';

interface Sorts {
	field: string
	direction?: 'asc' | 'desc'
}

interface NewRecord {fields: {[index: string]: any}}
interface UpdateRecord {
	id: string, 
	fields: {[index: string]: FieldId | string}
}

export enum FieldType {
	SINGLE_LINE_TEXT = "singleLineText",
	EMAIL = "email",
	URL = "url",
	SINGLE_SELECT = "singleSelect",
	MULTILINE_TEXT = "multilineText",
	NUMBER = "number",
	PERCENT = "percent",
	MULTIPLE_SELECTS = "multipleSelects",
   	SINGLE_COLLABORATOR = "singleCollaborator",
	MULTIPLE_COLLABORATORS = "multipleCollaborators",
	MULTIPLE_RECORD_LINKS = "multipleRecordLinks",
	DATE = "date",
	DATE_TIME = "dateTime",
	PHONE_NUMBER = "phoneNumber",
	MULTIPLE_ATTACHMENTS = "multipleAttachments",
	CHECKBOX = "checkbox",
	FORMULA = "formula",
	CREATED_TIME = "createdTime",
	ROLLUP = "rollup",
	COUNT = "count",
	MULTIPLE_LOOKUP_VALUES = "multipleLookupValues",
	AUTO_NUMBER = "autoNumber",
	BARCODE = "barcode",
	RATING = "rating",
	DURATION = "duration",
	LAST_MODIFIED_TIME = "lastModifiedTime"
}

export function GetMapping(tableId: string, fieldName: string, mappings: Mappings): Mapping {
	const types = mappings.find(map => Object.keys(map).find(k => k === fieldName))
	if(!types) throw new Error(`Table id ${tableId} does not have field ${fieldName}`)
	return types[Object.keys(types)[0]].find(t => t.tableId === tableId)
	
}

export function GetMappings(items: {tableId: string, fieldName: string}[], mappings: Mappings) {
	return items.map(i => GetMapping(i.tableId, i.fieldName, mappings))
}

export function GetFieldsInTable(tableId: string, mappings: Mappings): Mapping[] {
	return mappings.map(map => {
		let hasTable: Mapping[] = []
		Object.keys(map).forEach(k => {
			const item = map[k].find(item => item.tableId === tableId && item.fieldId)
			hasTable.push(item)
		})
		return hasTable
	}).reduce((acc, map) => { // Flatten Array
		acc.push(...map)
		return acc
	}, [])
}

export function SelectTable(id: string): Table {
	return base.getTableByIdIfExists(id);
}

export function SelectView(id: string, tableId?: string): View {
	const table = tableId ? SelectTable(tableId) : SelectTable(cursor.activeTableId);
	return table.getViewById(id);
}

export function SelectField(id: string, tableId?: string): Field {
	const table = tableId ? SelectTable(tableId) : SelectTable(cursor.activeTableId);
	return table.getFieldById(id);
}

export function SelectRecords(
	table: Table, 
	fields?: string[], 
	sorts?: Sorts[], 
	color?: 'none' | 'bySelectField' | 'byView'
): Promise<TableOrViewQueryResult> {
	let opts: {[index:  string]: any} = {};
	if(fields) opts.fields = fields;
	if(sorts) opts.sorts = sorts;
	if(color) opts.recordColorMode = color;
	return table.selectRecordsAsync(opts);
}

export function SelectAndLoadRecords(
	table: Table, 
	fields?: string[], 
	sorts?: Sorts[], 
	color?: 'none' | 'bySelectField' | 'byView'
): Promise<TableOrViewQueryResult> {
	return SelectRecords(table, fields, sorts, color).then(async (query) => {
		if(!query.isDataLoaded) await query.loadDataAsync();
		return query;
	});
}

export async function SelectTableAndRecords(
	id: string, 
	fields?: string[], 
	sorts?: Sorts[], 
	color?: 'none' | 'bySelectField' | 'byView'

): Promise<TableOrViewQueryResult> {
	const table = await SelectTable(id);
	return SelectAndLoadRecords(table, fields, sorts, color);
}

export function UnloadQuery(query: TableOrViewQueryResult) {
	query.unloadData();
}

export function CheckCursorIsLoaded(): Promise<void> {
	return new Promise((resolve, reject) => {
		if(cursor.isDataLoaded) return resolve();
		return cursor.loadDataAsync();
	});
}

export function CheckAndLoadCursor(): Promise<() => void> {
	return CheckCursorIsLoaded().then(() => UnloadCursor)
}

export function UnloadCursor() {
	// cursor.unloadData();
}

function ThrottleTableUsage(
	records: string[] | NewRecord[], 
	func: any
	): Promise<string[][]> {
	const proms: Promise<string[]>[] = [];
	while(records.length > 0) {
		const round = records.slice(0, 50);
		proms.push(func(round));
		records.splice(0, 50);
	}
	return Promise.all(proms)
}

export function CreateRecords(
	records: NewRecord[],
	tableId: string
): Promise<string[]> {
	const table = SelectTable(tableId);
	return ThrottleTableUsage(records, (r: NewRecord[]) => table.createRecordsAsync(r))
		.then(ids => [].concat.apply([], ids));
}

export function RemoveRecords(recordsIds: string[], tableId: string) {
	const table = SelectTable(tableId);
	return ThrottleTableUsage(recordsIds, (r: string[]) => table.deleteRecordsAsync(r))
}

interface UserRecord {
	[index: string]: any
}

export function BuildNewRecord (
	mappings: Mapping[],
	record0: UserRecord | Record
): {[index: string]: any} {
	let record: UserRecord
	if(record0 instanceof Record) {
		mappings.forEach(map => {
			record[map.fieldName] = record0.getCellValue(map.fieldId)
			console.log(record[map.fieldName])
		})
	} else {
		record = record0
	}
	console.log(record)
	/** Builds an object with the key being the field id and value the cell value */
	return mappings.reduce<{[index: string]: any}>((acc, map) => {
		console.log(record[map.fieldName], 'field', map.fieldType)
		switch(map.fieldType) {
			case FieldType.SINGLE_LINE_TEXT:
			case FieldType.EMAIL:
			case FieldType.URL:
			case FieldType.MULTILINE_TEXT:
			case FieldType.SINGLE_LINE_TEXT:
			case FieldType.PHONE_NUMBER:
				acc[map.fieldId] = record[map.fieldName]
				break
			case FieldType.NUMBER:
				acc[map.fieldId] = Number(record[map.fieldName])
				break
			case FieldType.DATE:
				acc[map.fieldId] = record[map.fieldName]
				break
			case FieldType.MULTIPLE_RECORD_LINKS:
				acc[map.fieldId] = record[map.fieldName].map((r: string) => ({id: r}))
				break
			case FieldType.SINGLE_SELECT:
				acc[map.fieldId] =  {name: record[map.fieldName]}
				break
			case FieldType.MULTIPLE_SELECTS:
				acc[map.fieldId] = record[map.fieldName].map((r: string) => ({name: r}))
				break
			default:
				throw new Error(`Invalid field type ${map.fieldType}`)
		}
		return acc;
	}, {});
}

export function UpdateRecords(tableId: string, updates: UpdateRecord[]): Promise<void> {
	const table = SelectTable(tableId);
	return table.updateRecordsAsync(updates);
}

export function GroupByProp(records: Record[], prop: string): {[index: string]: Record[]} {
	const group: {[index: string]: Record[]} = {};
	if(!records || !records.length) return group;
	records.forEach(r => {
		const type = r.getCellValueAsString(prop);
		if(group[type]) {
			group[type].push(r)
		} else {
			group[type] = [r]
		}
	});
	return group;
}