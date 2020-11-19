// /** YEARLY Date Functions */

// // export function GetInputDateFormat(d: string | Date, opt?: { offset?: number }): string {
// // 	console.warn('GetInputDateFormat is depricated, please use DateConverter')
// // 	if (typeof d === 'string') {
// // 		d = new Date(d)
// // 	}
// // 	if (opt?.offset) {
// // 		const timeZoneOffset = opt.offset * (1000 * 60 * 60)
// // 		d.setTime(d.getTime() + timeZoneOffset)
// // 	}
// // 	return (
// // 		d.getFullYear() +
// // 		'-' +
// // 		(d.getMonth() + 1 < 10 ? '0' + (d.getMonth() + 1) : d.getMonth() + 1) +
// // 		'-' +
// // 		(d.getDate() < 10 ? '0' + d.getDate() : d.getDate())
// // 	)
// // }

// // export function FindQuarterEnd(year: number, start: Date): Date {
// // 	const month =
// // 		start.getMonth() + 3 > 12 ? start.getMonth() + 3 - 12 : start.getMonth() + 3
// // 	let lastSunday = new Date(year, month, start.getDate())
// // 	return FindNearestDay(lastSunday, 6, 2)
// // }

// // export function FindNearestDay(d: Date, day: number, mid?: number) {
// // 	if (isNaN(d.getTime())) throw new Error('Invalid Date')
// // 	if (mid === undefined || d.getDay() <= mid) {
// // 		while (d.getDay() !== day) {
// // 			d.setDate(d.getDate() - 1)
// // 		}
// // 	} else {
// // 		while (d.getDay() !== day) {
// // 			d.setDate(d.getDate() + 1)
// // 		}
// // 	}
// // 	return d
// // }

// // export function FindDay(d: Date, day: number, direction: boolean): Date {
// // 	if (isNaN(d.getTime())) throw new Error('Invalid Date')
// // 	if (!direction) {
// // 		while (d.getDay() !== day) {
// // 			d.setDate(d.getDate() - 1)
// // 		}
// // 	} else {
// // 		while (d.getDay() !== day) {
// // 			d.setDate(d.getDate() + 1)
// // 		}
// // 	}
// // 	return d
// // }

// // export function getWeekDates(date: string | Date): string[] {
// // 	if (typeof date === 'string') date = new Date(date + ' 00:00:00')
// // 	const dates: string[] = []
// // 	dates.push(GetFormattedDate(FindDay(date, 0, false)))
// // 	dates.push(GetFormattedDate(FindDay(date, 6, true)))
// // 	return dates
// // }

// // export function GetQuarterDates(
// // 	q: number,
// // 	opts?: {
// // 		currentYear?: boolean
// // 		year?: number
// // 	}
// // ): [string, string] {
// // 	const today = new Date()
// // 	let startDate: string, endDate: string
// // 	if (q === 1) {
// // 		let year: number
// // 		if (opts && opts.year) {
// // 			year = opts.year
// // 		} else {
// // 			year =
// // 				today.getMonth() < 3 || (opts && opts.currentYear)
// // 					? today.getFullYear()
// // 					: today.getFullYear() + 1
// // 		}
// // 		const firstSunday: Date = FindNearestDay(new Date(year, 0, 1), 0)
// // 		const lastSunday = FindQuarterEnd(year, firstSunday)
// // 		startDate = GetInputDateFormat(firstSunday)
// // 		endDate = GetInputDateFormat(lastSunday)
// // 	} else {
// // 		const mult = (q - 1) * 3
// // 		let year: number
// // 		if (opts && opts.year) {
// // 			year = opts.year
// // 		} else {
// // 			year =
// // 				Math.floor(today.getMonth() / 3) < q
// // 					? today.getFullYear()
// // 					: today.getFullYear() + 1
// // 		}
// // 		const firstSunday: Date = FindNearestDay(new Date(year, 0, 1), 0, 3)
// // 		let month = mult + firstSunday.getMonth() + 1
// // 		if (month > 12) month = month - 12
// // 		const quarterStart = FindNearestDay(
// // 			new Date(year, month, firstSunday.getDay()),
// // 			0,
// // 			3
// // 		)
// // 		const lastSunday = FindQuarterEnd(year, quarterStart)
// // 		startDate = GetInputDateFormat(quarterStart)
// // 		endDate = GetInputDateFormat(lastSunday)
// // 	}
// // 	return [startDate, endDate]
// // }

// // export function GetFormattedDate(date?: Date): string {
// // 	console.warn('GetFormattedDate is depricated, please use DateConverter')
// // 	if (!date) date = new Date()
// // 	return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`
// // }

// // export function GetDiffWeeks(start: Date, end?: Date): number {
// // 	const week = 1000 * 60 * 60 * 24 * 7
// // 	if (!end) end = new Date()
// // 	const startTime = start.getTime()
// // 	const endTime = end.getTime()
// // 	return Math.floor((endTime - startTime) / week)
// // }

// /** DAILY Date Function */

// export interface CorrectTimeOptions {
// 	military?: boolean
// }

// export interface ResolvedTime {
// 	hour: string
// 	minute: string
// 	AM: boolean
// }

// export function getTime(value: string | number, isDate: boolean): number {
// 	if (isDate) {
// 		return typeof value === 'string'
// 			? new Date(value + ' 00:00:00').getTime()
// 			: new Date(value).getTime()
// 	} else if (typeof value === 'string') {
// 		const resolvedTime = CorrectTime(value)
// 		return Number(resolvedTime.hour) + Number(resolvedTime.minute) / 60
// 	}
// }

// export function CorrectTime(time: string, options?: CorrectTimeOptions): ResolvedTime {
// 	let hour: number, minute: number, AM: boolean
// 	time = time.toLowerCase()
// 	if (time.includes(':')) {
// 		;[hour, minute] = time
// 			.split('')
// 			.filter((c) => !isNaN(Number(c)) || c === ':')
// 			.join('')
// 			.trim()
// 			.split(':')
// 			.map((c) => Number(c))
// 	} else {
// 		hour = Number(
// 			time
// 				.split('')
// 				.filter((c) => !isNaN(Number(c)))
// 				.join('')
// 				.trim()
// 		)
// 		minute = 0
// 	}
// 	if (Number(hour) >= 24 || Number(minute) >= 60) throw new Error('Invalid Time')
// 	if (time.includes('a')) {
// 		AM = true
// 	} else if (time.includes('p')) {
// 		AM = false
// 	} else {
// 		AM = hour >= 12 ? false : true
// 	}
// 	if (hour > 12) {
// 		if (!options || !options.military) hour = hour - 12
// 	} else if (hour < 12 && !AM && options && options.military) {
// 		hour = hour + 12
// 	} else if (hour === 0) {
// 		if (!options || !options.military) hour = 12
// 	} else if (hour === 12 && options && options.military && AM == true) {
// 		hour = 0
// 	}
// 	return {
// 		hour: hour.toString(),
// 		minute: minute >= 10 ? minute.toString() : '0' + minute,
// 		AM,
// 	}
// }

// export function CorrectTimeRange(range: string): ResolvedTime[] {
// 	const times = range.split('-').map((c) => c.trim())
// 	return times.map((t) => CorrectTime(t))
// }

// export function CorrectSplitRange(split: string): ResolvedTime[][] {
// 	const range = split.split('/').map((c) => c.trim())
// 	return range.map((r) => CorrectTimeRange(r))
// }

// export function StringifyTimeRange(time: string): string {
// 	const range = time.split('/').map((c) => c.trim())
// 	let times: string
// 	try {
// 		const timesArr = range.map((r) => CorrectTimeRange(r))
// 		times = timesArr
// 			.map(
// 				(time) =>
// 					`${time[0].hour}:${time[0].minute}${time[0].AM ? 'AM' : 'PM'} - ${
// 						time[1].hour
// 					}:${time[1].minute}${time[1].AM ? 'AM' : 'PM'}`
// 			)
// 			.join(' / ')
// 	} catch (error) {
// 		console.error(error.message)
// 	}
// 	return times
// }

// export function SplitDateTime(dateTime: string | Date): number[] {
// 	let date: number, time: number
// 	if (!dateTime) return [null, null]
// 	if (typeof dateTime === 'string') {
// 		const rawDate = dateTime.slice(0, dateTime.indexOf(' '))
// 		const rawTime = dateTime.slice(dateTime.indexOf(' ') + 1)
// 		const correctedTime = CorrectTime(rawTime, { military: true })
// 		date = new Date(rawDate + ' 00:00:00').getTime()
// 		time = Number(correctedTime.hour) + Number(correctedTime.minute) / 60
// 	} else {
// 		date = new Date(GetInputDateFormat(dateTime) + ' 00:00:00').getTime()
// 		time = dateTime.getHours() + dateTime.getMinutes() / 60
// 	}
// 	return [date, time]
// }

// export function SplitDateRange(
// 	dates: string,
// 	opts?: { asString?: boolean }
// ): string[] | number[] {
// 	if (typeof dates !== 'string' || !dates.includes(' - '))
// 		throw new Error(`Invalid Date Range: ${dates}`)
// 	const [start, end] = dates.split(' - ')
// 	if (opts && opts.asString) return [start, end]
// 	return [
// 		new Date(start + ' 00:00:00').getTime(),
// 		new Date(end + ' 00:00:00').getTime(),
// 	]
// }

// export function GetInputTimeFormat(
// 	time: string | Date,
// 	opts?: { military?: boolean; offset?: number }
// ): string {
// 	console.warn('GetInputTimeFormat is depricated, please use DateConverter')
// 	let _date
// 	if (!time) return null
// 	if (!(time instanceof Date)) {
// 		if (time.includes('/')) time = time.substring(time.indexOf(' ') + 1)
// 		const corrected = CorrectTime(time)
// 		_date = new Date(
// 			`${GetFormattedDate()} ${corrected.hour}:${corrected.minute} ${
// 				corrected.AM ? 'AM' : 'PM'
// 			}`
// 		)
// 	} else {
// 		_date = new Date(time)
// 	}
// 	if (opts?.offset) {
// 		const timeZoneOffset = opts.offset * (1000 * 60 * 60)
// 		_date.setTime(_date.getTime() + timeZoneOffset)
// 	}
// 	if (opts?.military) {
// 		return `${_date.getHours() < 10 ? '0' + _date.getHours() : _date.getHours()}:${
// 			_date.getMinutes() < 10 ? '0' + _date.getMinutes() : _date.getMinutes()
// 		}`
// 	} else {
// 		let hour: string = _date.getHours().toString()
// 		if (_date.getHours() === 0) {
// 			hour = '12'
// 		} else if (_date.getHours() < 10) {
// 			hour = '0' + _date.getHours()
// 		} else if (_date.getHours() > 12) {
// 			hour = (_date.getHours() - 12).toString()
// 		}
// 		return `${hour}:${
// 			_date.getMinutes() < 10 ? '0' + _date.getMinutes() : _date.getMinutes()
// 		} ${_date.getHours() < 12 ? 'AM' : 'PM'}`
// 	}
// }

// export function GetFormattedTime(date?: string | Date): string {
// 	if (typeof date === 'string') {
// 		date = new Date(date)
// 	} else {
// 		date = date ? date : new Date()
// 	}
// 	return `${
// 		date.getHours() + 1
// 	}:${date.getMinutes()}:${date.getSeconds()}:${date.getMilliseconds()}`
// }

// export function GetFormattedDateTime(
// 	date: string | Date,
// 	time: string | Date,
// 	opts?: { offset: number }
// ) {
// 	console.warn('GetFormattedDateTime is depricated, please use DateConverter')
// 	return (
// 		GetInputDateFormat(date, opts) +
// 		' ' +
// 		GetInputTimeFormat(time, { military: true, ...opts })
// 	)
// }

// export function ValidPhoneNumber(val: string): boolean {
// 	const regex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/
// 	return regex.test(val)
// }

// export function mergeString(txt: string) {
// 	return txt
// 		.toLowerCase()
// 		.replace(/-/g, '')
// 		.split(' ')
// 		.map((word, i) =>
// 			i !== 0 ? word.substring(0, 1).toUpperCase() + word.substring(1) : word
// 		)
// 		.join('')
// }

// export function splitString(txt: string): string {
// 	return (
// 		txt.substring(0, 1).toUpperCase() +
// 		txt
// 			.split('')
// 			.slice(1)
// 			.map((char) => (/[A-Z]/.test(char) ? [' ', char.toUpperCase()] : char))
// 			.flat()
// 			.join('')
// 	)
// }
