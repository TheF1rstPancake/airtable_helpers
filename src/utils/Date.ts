function _formatNumber(num: number): string {
	return num < 10 ? '0' + num : num.toString()
}

function _isValidDate(date: Date): boolean {
	if (!(date instanceof Date)) false
	if (isNaN(Number(date.getTime()))) false
	return true
}

function _handleOffset(date: Date, offset?: boolean | number): Date {
	if (typeof offset !== 'boolean') {
		offset = offset as number
	} else {
		offset = new Date().getTimezoneOffset() / 60
		offset = Math.sign(offset) ? -Math.abs(offset) : Math.abs(offset)
	}
	const timeZoneOffset = offset * (1000 * 60 * 60)
	date.setTime(date.getTime() + timeZoneOffset)
	return date
}

function formatDate(
	date?: string | Date,
	opts?: { asISOString?: boolean; offset?: number | boolean; asLocalString?: boolean }
): string {
	let _date: Date = null
	if (!date) {
		_date = new Date()
	} else if (!(date instanceof Date)) {
		if (typeof date !== 'string') {
			throw new Error(
				`Only strings and Date Objects are valid for formDate function. Recieved ${date}`
			)
		}
		if (date.includes(' ')) date = date.substring(0, date.indexOf(' '))
		_date = new Date(date.replace(/-/g, '/'))
	} else {
		_date = date
	}
	if (!_isValidDate(_date)) throw new Error(`Param value ${date} is not a valid Date`)
	/** Handle Time Zone Offset */
	if (opts?.offset !== undefined) {
		_date = _handleOffset(_date, opts.offset)
	}
	const day = _formatNumber(_date.getDate())
	const month = _formatNumber(_date.getMonth() + 1)
	const year = _date.getFullYear()
	if (opts?.asISOString) return _date.toISOString()
	if (opts?.asLocalString) return _date.toLocaleDateString()
	return `${month}-${day}-${year}`
}

function formatDateForInput(
	date: string | Date,
	opts?: { offset?: number; asLocalString?: boolean }
): string {
	const _date = new Date(formatDate(date, opts))
	const day = _formatNumber(_date.getDate())
	const month = _formatNumber(_date.getMonth() + 1)
	const year = _date.getFullYear()
	if (opts?.asLocalString) return _date.toLocaleDateString()
	return `${year}-${month}-${day}`
}

function formatTime(
	time?: string | Date,
	opts?: { asISOString?: boolean; offset?: number | boolean; military?: boolean }
): string {
	let _date: Date = null
	if (!time) {
		_date = new Date()
	} else if (!(time instanceof Date)) {
		if (typeof time !== 'string') {
			throw new Error(
				`Only strings and Date Objects are valid for formatTime function. Recieved ${time}`
			)
		}
		if (time.includes('/') || time.includes('-')) {
			time = time.substring(time.indexOf(' ') + 1)
		}
		if (/^\d+([: A-Za-z\d])+/g.test(time)) {
			/** Shorthand Time with label ( 1p ) */
			const containsLabel = /[a-z]/g.test(time.toLowerCase())
			const includesPm = time.toLowerCase().includes('p') ? true : false
			time = time.toLowerCase().replace(/[a-z ]/g, '')
			if (time.includes(':')) {
				const [hour, minutes] = time.split(':')
				if (includesPm && Number(hour) !== 12) {
					time = `${Number(hour) + 12}:${minutes}`
				} else if (Number(hour) === 12 && !includesPm) {
					time = `00:${minutes}`
				} else {
					time = `${hour}:${minutes}`
				}
			} else if (includesPm && Number(time) < 12) {
				time = (Number(time) + 12).toString()
			} else if (containsLabel && !includesPm && Number(time) === 12) {
				time = '0'
			}
		}
		if (!time.includes(':')) {
			/** Shorthand time without label */
			const timeAsNumber = Number(time)
			if (isNaN(timeAsNumber)) throw new Error(`Invalid Time ${time}`)
			if (timeAsNumber < 10) {
				time = `0${timeAsNumber}:00`
			} else {
				time = `${timeAsNumber}:00`
			}
			time = formatDate() + ' ' + time
		} else {
			time = formatDate() + ' ' + time
		}
		_date = new Date(time)
	} else {
		_date = time
	}
	if (!_isValidDate(_date)) throw new Error(`Param value ${time} is not a valid Time`)
	/** Handle Time Zone Offset */
	if (opts?.offset !== undefined) {
		_date = _handleOffset(_date, opts.offset)
	}
	let hour = _date.getHours()
	const minutes = _formatNumber(_date.getMinutes())
	const label = hour >= 12 ? 'PM' : 'AM'
	if (opts?.military) {
		return `${hour}:${minutes}`
	} else if (opts?.asISOString) {
		return _date.toISOString()
	} else {
		if (hour === 0) hour = 12
		return `${hour > 12 ? Number(hour) - 12 : hour}:${minutes} ${label}`
	}
}

function formatDateTime(
	dateTime?: string | Date,
	opts?: {
		asISOString?: boolean
		offset?: number | boolean
		military?: boolean
		asLocalString?: boolean
	}
): string {
	let _date: Date = null
	if (!dateTime) {
		_date = new Date()
	} else if (!(dateTime instanceof Date)) {
		if (typeof dateTime !== 'string') {
			throw new Error(
				`Only strings and Date Objects are valid for formatTime function. Recieved ${dateTime}`
			)
		}
		if (
			dateTime.includes(' ') &&
			(dateTime.includes('/') || dateTime.includes('-'))
		) {
			/** Full Date Time */
			let label = dateTime.slice(dateTime.length - 2, dateTime.length)
			dateTime = dateTime.substring(0, dateTime.length - 2) + ' ' + label
		}
		_date = new Date(dateTime)
	} else {
		_date = dateTime
	}
	if (!_isValidDate(_date))
		throw new Error(`Param value ${dateTime} is not a valid Date Time`)
	/** Handle Time Zone Offset */
	if (opts?.offset !== undefined) {
		_date = _handleOffset(_date, opts.offset)
	}
	const day = _formatNumber(_date.getDate())
	const month = _formatNumber(_date.getMonth() + 1)
	const year = _date.getFullYear()
	let hour = _date.getHours()
	const minutes = _formatNumber(_date.getMinutes())
	const label = hour >= 12 ? 'PM' : 'AM'
	if (opts?.asISOString) {
		return _date.toISOString()
	} else if (opts?.military) {
		return `${month}-${day}-${year} ${hour}:${minutes}`
	} else if (opts?.asLocalString) {
		return _date.toLocaleString()
	} else {
		if (hour === 0) hour = 12
		return `${month}-${day}-${year} ${
			hour > 12 ? hour - 12 : hour
		}:${minutes} ${label}`
	}
}

/** Finds a day of the week and returns the Date for the day */
function findDay(date: Date, day: number, direction: boolean): Date {
	if (!_isValidDate(date)) throw new Error('Invalid Date passed to Find Day')
	if (!direction) {
		while (date.getDay() !== day) {
			date.setDate(date.getDate() - 1)
		}
	} else {
		while (date.getDay() !== day) {
			date.setDate(date.getDate() + 1)
		}
	}
	return date
}

/** Find the nearest day */
function findNearestDay(date: Date, day: number, mid: number = 3): Date {
	if (!_isValidDate(date)) throw new Error('Invalid Date')
	if (Math.sign(day - date.getDay()) === 1) {
		if (Math.abs(day - date.getDay()) < mid) {
			return findDay(date, day, true)
		} else {
			return findDay(date, day, false)
		}
	} else {
		if (Math.abs(day - date.getDay()) > mid) {
			return findDay(date, day, true)
		} else {
			return findDay(date, day, false)
		}
	}
}

function getWeekDates(date: string | Date): [Date, Date] {
	if (typeof date === 'string') date = new Date(date + ' 00:00:00')
	return [findDay(date, 0, false), findDay(date, 6, true)]
}

export const DateConverter = {
	formatDate,
	formatDateForInput,
	formatTime,
	formatDateTime,
	findDay,
	findNearestDay,
	getWeekDates,
}
