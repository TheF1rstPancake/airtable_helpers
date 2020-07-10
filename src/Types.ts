export * from '@airtable/blocks/models'
export * from '@airtable/blocks/types'

export interface Mapping {
	tableId: string
	fieldId?: string
	fieldName?: string
	fieldType?: string
	refName?: string
}

export type Mappings = {[index: string]: Mapping[]}[]
export type ExtractedMappings = {[index: string]: Mapping}

export interface UserMapping {
	tables: {
		[index: string]: string
	}
	mappings: Mappings
}