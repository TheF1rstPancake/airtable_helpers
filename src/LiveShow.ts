import { RecordData, SelectChoices, GetRecordData, SelectTableAndRecords } from './Blocks'
import { Mapping, ExtractedMappings, Base } from './Types'
import { SplitDateTime } from './Utils'

type SubSpace = {subSpace: string, areas: string[]}
export type StudioSpace = {space: string, areas?: string[] | SubSpace}

// A1,3-4 B1-3 O:P1-3 O:C1 C1 D1-3,5-6 IA AB Mez


export function SplitStudioSpaces(val: string, studios: string[]): string[] {
	const raw: string[] = []
	let start: number = null
	val.split('').forEach((char, index) => {
		/** Normal Spaces with number areas */
		if(!isNaN(Number(char)) && char !== ' ') {
			const split = val.split('')
			if(start === null) { // No Start Set
				 // Get correct index Spaces with Sub Areas
				if(split[index - 2] && split[index - 2] === ':') {
					const offset = split.slice(0, index).reverse().findIndex(char => char === ' ')
					if(index === split.length - 1) { // Single Complex sub space: O:P1
						offset === -1
							? raw.push(split.join(''))
							: raw.push(split.slice(index - offset, index + 1).join(''))
						start = null
					} else if(offset === -1) {
						start = 1 // We are at the begining of the string
					} else {
						start = index - offset + 1
					}
				} else {
					index === split.length - 1
						? raw.push(split.slice(index - 1, index + 1).join(''))
						: start = index
				} 
			} else if(start !== null) { // Start is set
				// Next char is a space or we are at the end of the string
				if(split[index + 1] === ' ' || split[index + 1] === undefined) {
					raw.push(split.slice(start - 1, index + 1).join(''))
					start = null
				}
			}
		} else if(char === ' ' && start !== null) { // Non Range areas, Ex: C1
			raw.push(val.split('').slice(start - 1, index).join(''))
			start = null
		}
		/** Spaces with no Number Area */
		if(char === ' ') {
			if(raw.length === 0) { // Hit a space & lest studio did not have an area, Ex: A B O:P
				raw.push(val.substring(0, index))
			}
			const section = val.split('').slice(index + 1)
			const spaceIndex = section.join('').indexOf(' ')
			const space = spaceIndex === -1
				? section.join('')
				: section.slice(0, spaceIndex).join('')
			if(!/\d/g.test(space)) {
				const prev = raw.length ? raw[raw.length - 1] : null
				/** Combined Spaces without area that include a space character */
				prev
				&& !prev.includes(':') // previous item is a complex sub space
				&& !/\d/g.test(prev) 
				&& !studios.find(studio => studio === prev)
					? raw[raw.length - 1] += ' ' + space.trim()
					: raw.push(space.trim())
			}
		}
		if(index === val.split('').length - 1 && !raw.length) {
			raw.push(val)
		}
	})
	return raw
}

function getAreas(area: string, areas: string[]): string[] {
	const ranges = area.split(',')
	return ranges.map(r => {
		if(r.includes('-')) {
			const [start, end] = r.split('-')
			if(start > end) throw new Error(`Invalid studio area range: Start ${start}, End ${end}`)
			if(!areas.includes(start)) throw new Error(`Studio does not have area ${start}`)
			if(!areas.includes(end)) throw new Error(`Studio does not have area ${end}`)
			return areas.slice(areas.indexOf(start), areas.indexOf(end) + 1).map(String)
		} else {
			return r
		}
	}).flat().filter(area => area)
}

export function SplitGroupedStudioSpaces(grouped: string[], studios: RecordData[], m: ExtractedMappings): StudioSpace[] {
	let userStudios: StudioSpace[] = []
	grouped.map(item => {
		const s: StudioSpace = {space: ''}
		if(item.includes(':')) {/** Spaces with Complex Areas */
			const id = m.workspaceAbbreviation.fieldId
			const [space, area] = item.split(':')
			let studio = studios.find(studio => studio.fields[id] && studio.fields[id] === space)
			if(!studio) studio = studios.find(studio => studio.fields[id] && studio.name === space)
			if(!studio) throw new Error(`Could not find space ${space}`)
			s.space = studio.name
			const subSpace = area.substring(0,1)
			const studioSpaces: string[] = studio.fields[m.workspaceAreas.fieldId].split(',')
				.filter((area: string) => area.substring(0,1) === subSpace)
				.map((area: string) => area.substring(1))
			const areas = getAreas(area.substring(1), studioSpaces)
			s.areas = {
				subSpace,
				areas
			}
		} else if(!/\d/g.test(item)) {/** Spaces with no Areas */
			s.space = item
		} else { // Normal Spaces
			const space = item.slice(0, 1)
			const studio = studios.find(studio => studio.name === space)
			if(!studio) throw new Error(`Cannot find studio ${space}`)
			const studioAreas: string[] = studio.fields[m.workspaceAreas.fieldId].split(',')
			s.space = space
			s.areas = getAreas(item.substring(1), studioAreas)
		}
		userStudios.push(s)
	})
	return userStudios
}

export function ValidateStudioSpaces(
	userStudios: StudioSpace[],
	studios: RecordData[],
	m: ExtractedMappings
): boolean {
	const issues = userStudios.filter(uStudio => {
		const found = studios.find(studio => studio.name === uStudio.space)
		if(!found) return true
		if(found.fields[m.workspaceAreas.fieldId]) {
			const studioAreas = found.fields[m.workspaceAreas.fieldId].split(',')
			if(!uStudio.areas) return false
			if(Array.isArray(uStudio.areas)) { // Standard areas
				const uAreas = uStudio.areas as string[]
				const invalid = uAreas.filter(area => !studioAreas.includes(area))
				if(invalid && invalid.length) return true
			} else { // Areas w/ Sub Spaces
				const subSpace = uStudio.areas as {subSpace: string, areas: string[]}
				const invalid = subSpace.areas.find(area => !studioAreas.includes(subSpace.subSpace + area))
				if(invalid && invalid.length) return true
			}
		}
		return false
	})
	return issues.length ? false : true
}

export function GetStudioSpaces(
	studios: RecordData[],
	val: string,
	mapping: ExtractedMappings
): StudioSpace[] {
	try {
        if(!val) throw new Error('No value passed for Get Studio Space')
		const spaces: string[] = studios.map(s => s.fields[mapping.workspace.fieldId])
		const grouped = SplitStudioSpaces(val, spaces)
		const result = SplitGroupedStudioSpaces(grouped, studios, mapping)
		return result
	} catch (error) {
		console.error(error)
		return null
	}
}

export function GetAndValidateStudioSpaces(
	studios: RecordData[],
	val: string,
	mapping: ExtractedMappings
): StudioSpace[] {
	try {
		const result = GetStudioSpaces(studios, val, mapping)
		const valid = ValidateStudioSpaces(result, studios, mapping)
		if(!valid) throw new Error(`Invalid studio areas`)
		return result
	} catch (error) {
		console.error(error)
		return null
	}
}

export async function GetStandardLiveShowSpaces(
	base: Base,
	tableId: string,
	workspaceMappings: ExtractedMappings
): Promise<string> {
	const query = await SelectTableAndRecords(base, tableId)
	const records = GetRecordData(base, query.records, tableId)
	return records.map(studio => {
		if(studio.fields[workspaceMappings.isStudioSpace.fieldId]) {
			const abbrevation = studio.fields[workspaceMappings.workspaceAbbreviation.fieldId]
			const studioName: string = abbrevation ? abbrevation : studio.fields[workspaceMappings.workspace.fieldId]
            const areas: string = studio.fields[workspaceMappings.workspaceAreas.fieldId]
			if(areas && /([A-Za-z])\w+/.test(areas)) { // Complex Sub Spaces
				let subAreas: string[] = areas.split(',').map(area => area.substring(0, 1))
				return subAreas.filter((area, index) => subAreas.indexOf(area) === index).map(area => studioName + ':' + area).join(' ')
			} else {
				return studioName
			}
		}
	}).filter(studio => studio).sort().join(' ')
}

function findStudio(studio0: StudioSpace, studios1: StudioSpace[]): StudioSpace | null {
	return studios1.find(studio => {
		if(studio.space === studio0.space) {
			if(!studio.areas || Array.isArray(studio.areas)) return true
			const space = studio0.areas as SubSpace
			return studio.areas.subSpace === space.subSpace
		}
		return false
	})
}

export function MergeStudio(studio0: StudioSpace, studio1: StudioSpace): StudioSpace {
	if(studio0.areas) {
		/** Standard areas */
		if(Array.isArray(studio0.areas)) {
			const areas0 = studio0.areas as string[]
            const areas1 = studio1.areas as string[]
            if(!areas0 || !areas1) return { space: studio0.space }
			let mergedAreas = [...areas0, ...areas1]
			mergedAreas = mergedAreas.filter((area, index) =>
				area && mergedAreas.indexOf(area) === index).sort()
			return {
				space: studio0.space,
				areas: mergedAreas
			}
		/** Complex Sub Areas */
		} else {
			const areas0 = studio0.areas as SubSpace
            const areas1 = studio1.areas as SubSpace
            // console.log(areas0, areas1)
			if(!areas0.areas.length || !areas1.areas.length) return {
				space: studio0.space,
				areas: { subSpace: areas0.subSpace, areas: [] }
			}
            let mergedAreas = [...areas0.areas, ...areas1.areas]
            // console.log('SUB SPACES', mergedAreas)
			mergedAreas = mergedAreas.filter((area, index) =>
				area && mergedAreas.indexOf(area) === index).sort()
			return {
				space: studio0.space,
				areas: { subSpace: areas0.subSpace, areas: mergedAreas }
			}
		}
	} else {
		return studio0
	}
}

export function MergeStudios(studios0: StudioSpace[], studios1: StudioSpace[]): StudioSpace[] {
	const merged: StudioSpace[] = []
	studios0.forEach(studio0 => {
		const studio1 = findStudio(studio0, studios1)
		!studio1 ? merged.push(studio0) : merged.push(MergeStudio(studio0, studio1))
	})
	studios1.forEach(studio1 => {
        const found = findStudio(studio1, merged)
        const studio0 = findStudio(studio1, studios0)
		if(found) {
            MergeStudio(studio0, found)
        } else if(!studio0) {
			if(Array.isArray(studio1.areas)) {
				merged.push({ space: studio1.space, areas: studio1.areas })
			} else if(!studio1.areas) {
				merged.push({ space: studio1.space })
			} else {
				merged.push({
					space: studio1.space,
					areas: {
						subSpace: studio1.areas.subSpace,
						areas: studio1.areas.areas ? studio1.areas.areas : []
					}
				})
			}
		} else {
            merged.push(MergeStudio(studio0, studio1))
		}
	})
	return merged.sort((a, b) => {
		if(a.space > b.space) return 1
		if(a.space < b.space) return -1
		return 0
	})
}

export function RemoveAreas(
	studio0: StudioSpace,
	studio1: StudioSpace,
	areas: string[]
): StudioSpace | null {
	const removed: StudioSpace = {
		space: studio0.space
	}
	if(studio0.areas) {
		/** Handle noraml areas */
		if(Array.isArray(studio0.areas)) {
			if(!studio0.areas.length) return null
			const areas0 = studio0.areas as string[]
			if(studio1.areas) {
				const areas1 = studio1.areas as string[]
				removed.areas = areas1.filter(area => !areas0.includes(area))
			} else {
				removed.areas = areas.filter(area => !areas0.includes(area))
			}
		} else { /** Handle Complex Sub Spaces / Areas */
            const area0 = studio0.areas as SubSpace
            /** Removed so sub areas are reset each time they are checked */
			//if(!area0.areas.length) return null
			areas = areas.filter(area => area0.subSpace === area.substring(0,1))
			let valid: string[]
			if(studio1.areas) {
				const area1 = studio1.areas as SubSpace
				valid = area1.areas.length
					? area1.areas.filter(area => !area0.areas.includes(area))
					: areas.filter(area => !area0.areas.includes(area.substring(1))).map(area => area.substring(1))
			} else {
				valid = areas.filter(area => !area0.areas.includes(area))
			}
			removed.areas = {
				subSpace: area0.subSpace,
				areas: valid
			}
		}
	}
	return removed.areas ? removed : null
}

export function RemoveStudios(
	studios0: StudioSpace[],
	studios1: StudioSpace[],
	studios: RecordData[],
	m: ExtractedMappings
): StudioSpace[] {
	const removed: StudioSpace[] = []
	studios0.forEach(studio0 => {
		const studio1 = findStudio(studio0, studios1)
		const rec = studios.find(studio => studio.name === studio0.space)
		if(!studio1) return
		const allAreas = rec.fields[m.workspaceAreas.fieldId]
			? rec.fields[m.workspaceAreas.fieldId].split(',')
			: []
		const studio = RemoveAreas(studio0, studio1, allAreas)
		if(studio) removed.push(studio)
	})
	studios1.forEach(studio => {
		const found = findStudio(studio, studios0)
		if(!found) removed.push(studio)
	})
	return removed.filter(rec => {
        if(!rec.areas || (Array.isArray(rec.areas) && !rec.areas.length)) {
            const remove = studios0.findIndex(studio => studio.space === rec.space)
            if(remove !== -1) return false
        }
        return true
    }).sort((a, b) => {
		if(a.space > b.space) return 1
		if(a.space < b.space) return -1
		return 0
	})
}

function getNumberArea(rawArea: string): number {
	let area: number
	if(!isNaN(Number(rawArea))) {
		area = Number(rawArea)
	} else {
		area = Number(rawArea.substring(0, 1))
		if(isNaN(area)) throw new Error(`Invalid area ${rawArea} ( ${area} )`)
	}
	return area
}

// 1 2 3 5
// 1 2 3 3b 
// 1 3 4 5

function StringifyAreas(area: string, current: number, previous: number, acc: string[]) {
	/** @TODO Improve this */
	const length = acc.length
	if(previous + 1 < current ) {
		acc.push(',')
		acc.push(area)
	} else {
		if(acc[length - 1] !== '-') {
			if(acc[length - 2] !== '-') {
				acc.push('-')
				acc.push(area)
			} else {
				acc[length - 1] = area
			}
		} else {
			acc[length - 1] = area
		}
	}
}

export function StringifyStudios(studios: StudioSpace[]): string {
	return studios.map(studio => {
		if(!studio.areas) return studio.space
		if(Array.isArray(studio.areas)) {
			const areas = studio.areas as string[]
			/** Compresses studio areas, Ex: 1,2,3 will read 1-3 */
			return studio.space + areas.reduce((acc, area, index) => {
				if(!acc.length) {
					acc.push(area)
				} else {
					const current = getNumberArea(area)
					const found = [...acc].reverse().find(area => area !== ',' && area !== '-')
					const prev = getNumberArea(found)
					StringifyAreas(area, current, prev, acc)
				}
				return acc
			}, [] as string[]).join('')
		} else {
			const subSpace = studio.areas as SubSpace
			/** @TODO use abbreviation instead of first letter of subspace */
			return studio.space.substring(0,1) + ':' + subSpace.subSpace + subSpace.areas.reduce((acc, area, index) => {
				if(!acc.length) {
					acc.push(area)
				} else {
					const current = getNumberArea(area)
					const found = [...acc].reverse().find(area => area !== ',' && area !== '-')
					const prev = getNumberArea(found)
					StringifyAreas(area, current, prev, acc)
				}
				return acc
			}, [] as string[]).join('')
		}
	}).join(' ')
}

export function HasStudioConflicts(studios0: StudioSpace[], studios1: StudioSpace[]): boolean {
	const conflict = studios0.findIndex((studio0) => {
		if(studios1.find(studio1 => studio0.space === studio1.space)) return true
	})
	return conflict !== -1 ? true : false
}


export function GroupStudioSpaces(record: RecordData, mappings: Mapping[]) {
	const invalid = ['studioUsed']
	const items = mappings.filter(map => map.fieldName.toLowerCase().includes('studio') && !invalid.includes(map.fieldName))
		.map(map => ({id: map.fieldId, name: map.fieldName}))
		.filter(map => record.fields[map.id] !== null)
	const grouped = items.map(item => {
		const space = item.name.toLowerCase().replace('studio', '')
		const areas: string = record.fields[item.id].map((area: SelectChoices) => area.name).join(',')
		return space.substring(0,1).toUpperCase() + space.substring(1) + areas
	})
	return grouped.join(' ')
}


export function FindConflicts(
	events: RecordData[],
	mappings: {
		startDate: string
		endDate?: string
	},
	event: {
		startDate: number
		startTime: number
		endDate?: number
		endTime?: number
	}
): RecordData[] {
	if(!events.length) return []
	return events.filter(evt => {
		const [startDate, startTime] = SplitDateTime(evt.fields[mappings.startDate])
		const [endDate, endTime] = mappings.endDate ? SplitDateTime(evt.fields[mappings.endDate]) : [ null, null ]
		// Current Day is Event Start Date
		if(startDate === event.startDate) {
			// Current Day is also Event End Date
			if(event.endDate && endDate === event.endDate) {
				// Start is after end or end is before event start
				if(event.startTime > endTime || event.endTime < startTime) return false
			} else if(startTime > event.startTime) { // Event starts after current time
				return false
			} else if(endTime < event.startTime) {
				return false
			}
		}
		if(event.endDate && event.endDate === endDate) {
			// Ends on the same day it started and current starts after events ends
			if(event.startDate === endDate && event.startTime > endTime) return false
        }
        if(startDate !== event.startDate && (!event.endDate || event.endDate !== endDate)) return false
		return true
	})
}
