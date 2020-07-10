/** YEARLY Date Functions */

export function GetInputDateFormat(d: string | Date): string {
	if(typeof d === 'string') {
		d = new Date(d)
		d = new Date(d.getTime() + d.getTimezoneOffset() * 60000)
	}
	return d.getFullYear() + '-' 
		+ (d.getMonth() < 10 ? '0' + (d.getMonth() + 1) : d.getMonth() + 1) + '-' 
		+ (d.getDate() < 10 ? '0' + d.getDate() : d.getDate())
}

export function FindQuarterEnd(year: number, start: Date): Date {
	const month = start.getMonth() + 3 > 12 
		? start.getMonth() + 3 - 12 
		: start.getMonth() + 3;
	let lastSunday = new Date(year, month, start.getDate());
	return FindNearestDay(lastSunday, 6, 2);
}

export function FindNearestDay(d: Date, day: number, mid?: number) {
	if(isNaN(d.getTime())) throw new Error('Invalid Date')
	if(mid === undefined || d.getDay() <= mid) {
		while(d.getDay() !== day) {
			d.setDate(d.getDate() - 1);
		}
	} else {
		while(d.getDay() !== day) {
			d.setDate(d.getDate() + 1);
		}
	}
	return d;
}

export function FindDay(d: Date, day: number, direction: boolean) {
	if(isNaN(d.getTime())) throw new Error('Invalid Date')
	if(!direction) {
		while(d.getDay() !== day) {
			d.setDate(d.getDate() - 1);
		}
	} else {
		while(d.getDay() !== day) {
			d.setDate(d.getDate() + 1);
		}
	}
	return d;
}

export function GetQuarterDates(q: number, opts?: { currentYear: boolean }): [string, string] {
	const date = new Date();
	let startDate: string, endDate: string;
	if(q === 1) {
		const year: number = (date.getMonth() < 3 || (opts && opts.currentYear)) 
			? date.getFullYear() 
			: date.getFullYear() + 1;
		const firstSunday: Date = FindNearestDay(new Date(year, 0, 1), 0);
		const lastSunday = FindQuarterEnd(year, firstSunday);
		startDate =	GetInputDateFormat(firstSunday);
		endDate = GetInputDateFormat(lastSunday);
	} else {
		const mult = (q - 1) * 3;
		const year: number = Math.floor(date.getMonth() / 3) < q 
			? date.getFullYear() 
			: date.getFullYear() + 1;
		const firstSunday: Date = FindNearestDay(new Date(year, 0, 1), 0, 3);
		let month = mult + firstSunday.getMonth() + 1;
		if(month > 12) month = month - 12;
		const quarterStart = FindNearestDay(new Date(year, month, firstSunday.getDay()), 0, 3);
		const lastSunday = FindQuarterEnd(year, quarterStart);
		startDate =	GetInputDateFormat(quarterStart);
		endDate = GetInputDateFormat(lastSunday);
	}
	return [startDate, endDate];
}

export function GetFormattedDate(date?: Date): string {
	if(!date) date = new Date()
	return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`
}

export function GetDiffWeeks(start: Date, end?: Date): number {
	const week = 1000 * 60 * 60 * 24 * 7
	if(!end) end = new Date()
	const startTime = start.getTime()
	const endTime = end.getTime()
	return Math.floor((endTime - startTime) / week)
}

/** DAILY Date Function */

export interface CorrectTimeOptions {
	military?: boolean
}

export interface ResolvedTime {
	hour: string
	minute: string
	AM: boolean
}

export function CorrectTime(time: string, options?: CorrectTimeOptions): ResolvedTime {
	let hour: number, minute: number, AM: boolean;
	time = time.toLowerCase()
	if(time.includes(':')) {
		[hour, minute] = time.split('')
			.filter(c => !isNaN(Number(c)) || c === ':')
			.join('').trim().split(':').map(c => Number(c))
	} else {
		hour = Number(time.split('')
			.filter(c => !isNaN(Number(c)))
			.join('').trim())
		minute = 0
	}
	if(Number(hour) >= 24 || Number(minute) >= 60)
		throw new Error('Invalid Time')
	if(time.includes('a')) {
		AM = true
	} else if(time.includes('p')) {
		AM = false
	} else {
		AM = hour >= 12 ? false : true
	}
	if(hour > 12) {
		if(!options || !options.military) hour = hour - 12
	} else if(hour < 12 && !AM && (options && options.military)) {
		hour = hour + 12
	} else if(hour === 0) {
		if(!options || !options.military) hour = 12
	} else if(hour === 12 && (options && options.military) && AM == true) {
		hour = 0
	}
	return {
		hour: hour.toString(), 
		minute: minute >= 10 ? minute.toString() : '0' + minute, 
		AM
	}
}

export function CorrectTimeRange(range: string): ResolvedTime[] {
	const times = range.split('-').map(c => c.trim());
	return times.map(t => CorrectTime(t))
}

export function CorrectSplitRange(split: string): ResolvedTime[][] {
	const range = split.split('/').map(c => c.trim());
	return range.map(r => CorrectTimeRange(r))
}

export function SplitDateTime(dateTime: string | Date): number[] {
    let date: number, time: number
    if(!dateTime) return [null, null]
    if(typeof dateTime === 'string') {
        const raw = dateTime.split(' ')
        date = new Date(raw[0] + ' 00:00:00').getTime()
        time = Number(CorrectTime(raw[1], { military: true }).hour)
    } else {
        date = new Date(GetInputDateFormat(dateTime) + ' 00:00:00').getTime()
        time = dateTime.getHours()
    }
	return [date, time]
}

export function GetInputTimeFormat(time: string): string {
	const corrected = CorrectTime(time, {military: true})
	const hour = Number(corrected.hour)
	return (hour < 10 ? '0' + corrected.hour : corrected.hour)
		+ ':' + corrected.minute
}

export function GetFormattedTime() {
	const date = new Date();
	return `${date.getHours() + 1}:${date.getMinutes()}:${date.getMilliseconds()}`
}

export function ValidPhoneNumber(val: string): boolean {
	const regex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/
	return regex.test(val)
}