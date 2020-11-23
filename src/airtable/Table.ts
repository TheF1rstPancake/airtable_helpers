import {Base, Table, Field, View, FieldType} from '@airtable/blocks/models';
import { FieldId, TableId, ViewId } from '@airtable/blocks/types'

function selectTable(base: Base, tableId: TableId): Table {
	const table = base.getTableByIdIfExists(tableId)
	if (!table) throw new Error(`Could not find Table with ID ${tableId}`)
	return table
}

function selectView(base: Base, table: Table | TableId, viewId: ViewId): View {
	if (typeof table === 'string') table = selectTable(base, table)
	const view = table.getViewByIdIfExists(viewId)
	if (!view) throw new Error(`Could not find View with ID ${viewId}`)
	return view
}

function selectField(base: Base, table: Table | TableId, fieldId: FieldId): Field {
	if (typeof table === 'string') table = selectTable(base, table)
	const field = table.getFieldByIdIfExists(fieldId)
	if (!field) throw new Error(`Unable to find Field with ID ${fieldId}`)
	return field
}

interface TableInterface {
	selectTable(base: Base, tableId: TableId): Table
	selectView(base: Base, tableId: Table | TableId, viewId: ViewId): View
	selectField(base: Base, table: Table | TableId, fieldId: FieldId): Field
}

export const Tables: TableInterface = {
	selectTable: selectTable,
	selectView: selectView,
	selectField: selectField,
}
