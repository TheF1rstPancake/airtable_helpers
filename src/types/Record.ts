import { LinkedRecord, SelectOption, QuerySorts } from './Table'

/*export {
	Record,
	RecordQueryResult,
	TableOrViewQueryResult,
	LinkedRecordsQueryResult,
} from '@airtable/blocks/models'*/ 

//export { RecordId, Color, RecordActionData } from '@airtable/blocks/types'

export interface QueryOpts {
	fields?: string[]
	sort?: QuerySorts
}

export type CustomField =
	| string
	| string[]
	| number
	| boolean
	| Date
	| SelectOption
	| SelectOption[]
	| LinkedRecord
	| LinkedRecord[]

export interface RecordField {
	[index: string]: CustomField
}

export interface LockedRecordField {
	readonly [index: string]: CustomField
}

export interface UpdateRecord {
	id: string
	fields: RecordField
}

export interface RecordData<T extends RecordField> {
	id: string
	name: string
	tableId: string
	fields: T
}

export interface RemoteData<T extends RecordField> {
	id: string
	tableId: string
	fields: T
	dateCreates?: string
}
