export { Base } from '@airtable/blocks/models'
import { BaseId, GlobalConfigValue } from '@airtable/blocks/types'
import { TableId } from './Table'

export { BaseId, GlobalConfigValue }

export interface MappingDefinition {
	bases?: string[]
	tables: string[]
	fields: string[]
}

export interface BlockMappings {
	bases?: {
		[index: string]: BaseId
	}
	tables: {
		[index: string]: TableId
	}
	mappings: Mappings
}

export interface MappingTables {
	[index: string]: TableId
}

export interface Mapping {
	tableId: string
	fieldId?: string
	fieldName?: string
	fieldType?: string
	refName?: string
}

export type Mappings = { [index: string]: Mapping[] }[]
