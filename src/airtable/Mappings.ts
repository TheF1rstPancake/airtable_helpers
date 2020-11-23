import { Mapping, Mappings as MappingsDef } from '../types/Base'
import { formatObjectKey } from '../utils/index'
import {TableId} from '@airtable/blocks/types';

function getMappingsByRefrenceName(
	tableId: TableId,
	refrenceNames: string[],
	mappings: MappingsDef
): Mapping[] {
	const validTable = mappings[0][Object.keys(mappings[0])[0]].findIndex(
		(map) => map.tableId === tableId
	)
	if (validTable === -1) throw new Error(`Invalid table id ${tableId}`)
	const _mappings = getMappingsForTable(tableId, mappings)
	return _mappings.filter((map) => refrenceNames.includes(map.refName))
}

function getMappingsById(
	tableId: TableId,
	ids: string[],
	mappings: MappingsDef
): Mapping[] {
	const validTable = mappings[0][Object.keys(mappings[0])[0]].findIndex(
		(map) => map.tableId === tableId
	)
	if (validTable === -1) throw new Error(`Invalid table id ${tableId}`)
	const _mappings = getMappingsForTable(tableId, mappings)
	return _mappings.filter((map) => ids.includes(map.fieldId))
}

/** Returns all the mappings for a table
 * @param tableId - The table you want the mappings for
 * @param mappings - Standard block mappings
 */
function getMappingsForTable(tableId: TableId, mappings: MappingsDef): Mapping[] {
	const validTable = mappings[0][Object.keys(mappings[0])[0]].findIndex(
		(map) => map.tableId === tableId
	)
	if (validTable === -1) throw new Error(`Invalid table id ${tableId}`)
	return mappings
		.map((map) => {
			let hasTable: Mapping[] = []
			Object.keys(map).forEach((k) => {
				const item = map[k].find(
					(item) => item.tableId === tableId && item.fieldId
				)
				if (item) {
					item.refName = formatObjectKey(k)
					hasTable.push(item)
				}
			})
			return hasTable
		})
		.flat()
}

interface MappingsInterface {
	getMappings(
		tableId: string,
		refrenceNames: string[],
		mappings: MappingsDef
	): Mapping[]
	getMappingsById(tableId: string, ids: string[], mappings: MappingsDef): Mapping[]
	getMappingsForTable(tableId: string, mappings: MappingsDef): Mapping[]
}

export const Mappings: MappingsInterface = {
	getMappings: getMappingsByRefrenceName,
	getMappingsById: getMappingsById,
	getMappingsForTable: getMappingsForTable,
}
