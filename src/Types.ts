export * from '@airtable/blocks/models'
export * from '@airtable/blocks/types'

/**
 * Mapping Types
 */
export interface MappingDefinition {
	bases?: string[]
	tables: string[]
	remotes: string[]
	fields: string[]
} 
export interface MappingTables {
	[index: string]: string
}
export interface Mapping {
	tableId: string
	fieldId?: string
	fieldName?: string
	fieldType?: string
	refName?: string
}

export type Mappings = {[index: string]: Mapping[]}[]
export type ExtractedMappings = {[index: string]: Mapping}

export interface BlockMappings {
	bases?: {
		[index: string]: string
	}
	tables: {
		[index: string]: string
	}
	mappings: Mappings
}

/**
 * Blocks / Airtable Types
 */
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

export type CustomField = string | string[] | number | boolean | Date | SelectWriteOption | SelectWriteOption[]
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

export interface TypedData<T extends RecordField> {
	id: string
	name: string
	tableId: string
	fields: T
}

export interface RemoteData {
	id: string
	tableId: string,
	fields: RecordField
	dateCreates?: string
}

export interface BlockFunctions {
	(records: RecordField[]): Promise<string[]>
	(records: UpdateRecord[]): Promise<void>
	(records: string[]): Promise<void>
	(records: any[]): Promise<any>
}