import { RecordData } from './Blocks'
import { ExtractedMappings, Mapping } from './Types'
import { SplitDateTime } from './Utils'
import { GetStudioSpaces, MergeStudios, RemoveStudios, StringifyStudios, StudioSpace } from './LiveShow'

export function UpdateComments(comments: string, title: string, avoid: string, message?: string): string {
    let c: string | string[] = comments
	if(c.includes(title)) {
        const start = c.indexOf(title)
		if(c.slice(start).includes(avoid)) { // Remove Current live show comments
            let end = c.slice(start).indexOf(avoid) + 1
            if(start > end) end = c.length
			c = c.split('')
			start > end ? c = c.slice(end, start) : c.splice(start, end)
			c = c.join('')
		} else if(start == 0) {
            c = ''
        }
    }
	if(message) c += `${title} - ${message}\n`
	return c
}

export interface UpdateAvailabiltyMapping {
    studioUsed: Mapping,
    startDate: Mapping,
    endDate?: Mapping
}

export interface AvailabilityMappings extends UpdateAvailabiltyMapping {
    available: Mapping
}

/** Annonomous unction to update an availability hour */
export function UpdateHour(
	avail: RecordData, // Availability Record
	rec: RecordData, // Live Show or Off Air Records
	id: string,
	mappings0: UpdateAvailabiltyMapping, // Availability Mappings
    mappings1: UpdateAvailabiltyMapping, // Live Show or Off Air Mappings
	workspaceMappings: ExtractedMappings,
	allStudios: RecordData[],
	studios: StudioSpace[],
    merge: boolean,
    isEvent: boolean,
	fn: typeof getOnAirEventsWithinRange | typeof getOffAirEventsWithinRange
): StudioSpace[] {
    const studiosUsed = GetStudioSpaces(allStudios, rec.fields[mappings1.studioUsed.fieldId], workspaceMappings)
    /** This event is the once being updated */
    if(rec.id === id) {
		if(studiosUsed) {
            // console.log('FOUND REC', avail.name, rec.name, merge, studiosUsed)
			studios = merge
				? MergeStudios(studiosUsed, studios)
                : RemoveStudios(studiosUsed, studios, allStudios, workspaceMappings)
		}
	} else {
		/** Check if this event is within the hour */
		const [evtStartDate, evtStartTime] = SplitDateTime(avail.fields[mappings0.startDate.fieldId])
        const valid = fn([rec], {
            startDate: mappings1.startDate,
            endDate: mappings1.endDate
        }, evtStartDate, evtStartTime, null, null)[0]
        // isEvent && console.log('VALID', valid ? true : false, avail.name, rec.name, 'Is Event', isEvent, 'Id:', id)
        /** Vaid Events */
        if(valid && isEvent) {
            //console.log('REMOVING EVENT', avail.name, JSON.stringify(studiosUsed))
            studios = RemoveStudios(studiosUsed, studios, allStudios, workspaceMappings)
        /** Invalid Events */
        } else if(isEvent && merge) {
            //console.log('MERGING EVENT', avail.name, JSON.stringify(studiosUsed))
            studios = MergeStudios(studiosUsed, studios)
        /** Live Shows */
        } else {
            const [ showDate, showTime ] = SplitDateTime(rec.fields[mappings1.startDate.fieldId])
            if(showTime === evtStartTime && showDate === evtStartDate) {
                // console.log('REMOVING', avail.name, rec.name)
                studios = RemoveStudios(studiosUsed, studios, allStudios, workspaceMappings)
            }
        }
    }
	return studios
}

export async function UpdateAllHoursAvailability(
	availabilityRecords: RecordData[],
	offAirEvents: RecordData[],
	onAirHours: RecordData[],
	allStudios: RecordData[],
	allSpaces: StudioSpace[],
	onAirMappings: UpdateAvailabiltyMapping,
	offAirMapping: UpdateAvailabiltyMapping,
	availabilityMapping: AvailabilityMappings,
	workspaceMappings: ExtractedMappings,
	eventId: string,
	merge: boolean
): Promise<RecordData[]> {
	availabilityRecords.forEach((avail) => {
        let studios = allSpaces
        /** Handle On Air Hours */
		onAirHours.forEach(evt => {
            if(!evt.fields[onAirMappings.studioUsed.fieldId]) return
            studios = UpdateHour(
                avail,
                evt,
                eventId ? eventId : evt.id,
                availabilityMapping,
                onAirMappings,
                workspaceMappings,
                allStudios,
                studios,
                merge,
                false,
                getOnAirEventsWithinRange
            )
        })
        // console.log('LIVE STUDIOS', JSON.stringify(studios))
        /** Handle Off Air Events */
		offAirEvents.forEach(evt => {
            studios = UpdateHour(
                avail,
                evt,
                eventId,
                availabilityMapping,
                offAirMapping,
                workspaceMappings,
                allStudios,
                studios,
                merge,
                true,
                getOffAirEventsWithinRange
            )
        })
        // console.log('Off Air', JSON.stringify(studios))
		avail.fields[availabilityMapping.available.fieldId] = StringifyStudios(studios)
    })
	return availabilityRecords
}

/** Filter Hours */
export function getAvailabilityWithinRange(
	events: RecordData[],
	m: ExtractedMappings,
	startDate: number,
	startTime: number,
	endDate?: number,
	endTime?: number
): RecordData[] {
	return events.filter(evt => {
		const [showDate, showTime] = SplitDateTime(evt.fields[m.time.fieldId])
		if(endDate) { /** Checking Against an Off Air Event */
			if(showDate >= startDate && showDate <= endDate) {
				if(showDate === startDate) {
					if(showDate === endDate) {
						if(showTime < startTime || showTime > endTime) return false
					} else if(showTime < startTime) {
						return false
					}	
				}
				if(showDate === endDate && showTime > endTime) return false
				return true
			}
		} else { /** Checking Against an On Air Event */
			if(showDate === startDate && showTime === startTime) return true 
		}
		return false
	})
}

export function getOffAirEventsWithinRange(
	events: RecordData[],
	m: {
        startDate: Mapping,
        endDate: Mapping
    },
	startDate: number,
	startTime: number,
	endDate?: number,
	endTime?: number
): RecordData[] {
    if(isNaN(startDate) || isNaN(startTime)) throw new Error('Start Date / Time required')
	return events.filter(evt => {
		const [evtStartDate, evtStartTime] = SplitDateTime(evt.fields[m.startDate.fieldId])
        const [evtEndDate, evtEndTime] = SplitDateTime(evt.fields[m.endDate.fieldId])
        if(endDate) { // Checking Against Off Air Event
            //console.log(evt.name, evtStartDate === startDate)
            if(evtStartDate === startDate) { // Current Day is Event Start Date
				if(evtEndDate === endDate) { // Current Day is also Event End Date
                    // Start & End times are within event time range
                    //console.log(startTime > evtEndTime, evtStartTime > endTime)
					if(startTime > evtEndTime || evtStartTime > endTime) return false
				} else if(evtStartTime < startTime) { // Event starts after current time
					return false
				}
            }
            //console.log('End Date', evtEndDate === endDate)
			if(evtEndDate === endDate) {
				if(startDate === evtEndDate && startTime > evtEndTime) return false
            }
            if(evtStartDate !== startDate && evtEndDate !== endDate) return false
        } else { // Checkng Against On Air Event
			if(evtStartDate === startDate) {
                // Event has yet to start or has already ended
				if(startTime < evtStartTime || startTime > evtEndTime) return false
			} else if(evtEndDate === startDate) {
                if(startTime > evtEndTime) return false
            } else {
                return false
            }
		}
		return true
	})
}

export function getOnAirEventsWithinRange(
	events: RecordData[],
	m: {
        startDate: Mapping,
        endDate?: Mapping
    },
	startDate: number,
	startTime: number,
	endDate: number,
	endTime: number
): RecordData[] {
	return events.filter(evt => {
        const [showDate, showTime] = SplitDateTime(evt.fields[m.startDate.fieldId])
		if(showDate >= startDate && (!endDate || showDate <= endDate)) {
			if(showDate === startDate) {
				if(showDate === endDate) {
					if(showTime < startTime || showTime > endTime) return false
				} else if(showTime < startTime) {
					return false
				}
			} else if(showDate === endDate && showTime > endTime) {
                return false
            }
			return true
		}
		return false
	})
}
