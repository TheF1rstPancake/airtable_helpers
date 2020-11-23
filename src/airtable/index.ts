import { Mappings as MappingsDef, Mapping } from '../types/Base'
import {
	RecordField,
	UpdateRecord,
	RecordData,
	LockedRecordField,
	QueryOpts,
} from '../types/Record'


import { Mappings } from './Mappings'
import { Tables } from './Table'
import { Records } from './Record'
import {Base, Record, Table, Field, View, FieldType} from '@airtable/blocks/models';
import { TableId, ViewId, FieldId, 	RecordId} from '@airtable/blocks/types';

interface AirtableInterface {
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
	expandRecords(tableId: Table | TableId, records: RecordId[]): void
	expandRecordsAsList(
		tableId: Table | TableId,
		records: RecordId[],
		fieldMappings: Mapping[]
	): void
	getMappings(
		tableId: string,
		refrenceNames: string[],
		mappings: MappingsDef
	): Mapping[]
	getMappingsById(tableId: string, ids: string[], mappings: MappingsDef): Mapping[]
	getMappingsForTable(tableId: TableId, mappings: MappingsDef): Mapping[]
	selectTable(base: Base, tableId: TableId): Table
	selectView(base: Base, table: Table | TableId, viewId: ViewId): View
	selectField(base: Base, table: Table | TableId, fieldId: FieldId): Field
	selectRecords(base: Base, tablesId: TableId, opts?: QueryOpts): Promise<Record[]>
	selectRecordsFromView(
		base: Base,
		tablesId: Table | TableId,
		view: ViewId | View,
		opts?: QueryOpts
	): Promise<Record[]>
	createRecords(
		base: Base,
		table: Table | TableId,
		records: { fields: LockedRecordField }[]
	): Promise<string[]>
	updateRecords(base: Base, tableId: TableId, records: UpdateRecord[]): Promise<void>
	removeRecords(base: Base, tableId: TableId, records: RecordId[]): Promise<void>
}

export const Airtable: AirtableInterface = {
	selectTable: Tables.selectTable,
	selectView: Tables.selectView,
	selectField: Tables.selectField,
	getMappings: Mappings.getMappings,
	getMappingsById: Mappings.getMappingsById,
	getMappingsForTable: Mappings.getMappingsForTable,
	convertRecordFieldsToNames: Records.convertRecordFieldsToNames,
	convertRecordFieldsToIds: Records.convertRecordFieldsToIds,
	expandRecords: Records.expandRecords,
	expandRecordsAsList: Records.expandRecordsAsList,
	selectRecords: Records.selectRecordsFromTable,
	selectRecordsFromView: Records.selectRecordsFromView,
	createRecords: Records.createRecords,
	updateRecords: Records.updateRecords,
	removeRecords: Records.removeRecords,
}
