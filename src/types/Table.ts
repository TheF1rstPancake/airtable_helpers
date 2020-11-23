// export { Table, Field, View, FieldType } from '@airtable/blocks/models'
// export { FieldId, TableId, ViewId } from '@airtable/blocks/types'

/** Fields */
export interface SelectOption {
	id?: string
	name?: string
	color?: string
}

export interface LinkedRecord {
	id?: string
	name?: string
}

/** Tables */
export interface QuerySorts {
	field: string
	direction?: 'asc' | 'desc'
}
