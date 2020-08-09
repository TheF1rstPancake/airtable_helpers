
export function UpdateComments(
	comments: string,
	title: string,
	avoid: string,
	message?: string
): string {
	let c: string | string[] = comments ? comments : ''
	if(c.includes(title)) {
        const start = c.indexOf(title)
		if(c.slice(start).includes(avoid)) { // Remove Current comments
            let end = c.slice(start).indexOf(avoid) + 1
            if(start > end) end = c.length
			c = c.split('')
			start > end ? c = c.slice(end, start) : c.splice(start, end)
			c = c.join('')
		} else if(start == 0) {
            c = ''
        }
	}
	if(message) c += `${title} - ${message}${avoid}`
	return c
}


/** Checks if an hour is withing a time range */
export function isHourWithinTime(
	startdate: number,
	startTime: number,
	endDate: number,
	endTime: number,
	showDate: number,
	showTime: number
): boolean {
	if(showDate === startdate) {
		if(showDate === endDate) {
			if(showTime >= startTime && showTime <= endTime) return true
		} else {
			if(showTime >= startTime) return true
		}
	} else if(showDate === endDate) {
		if(showTime <= endTime) return true
	}
	return false
}