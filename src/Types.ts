export interface Mapping {
	tableId: string
	fieldId?: string | undefined
	fieldName?: string | undefined
	fieldType?: string | undefined
}

export type Mappings = {[index: string]: Mapping[]}[]

export interface UserMapping {
	tables: {
		[index: string]: string
	}
	mappings: Mappings
}