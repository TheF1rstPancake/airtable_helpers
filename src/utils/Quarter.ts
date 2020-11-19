import { DateConverter } from './Date'

function getQuarterStart(quarter: number, opts?: { year: number }): Date {
	const today = new Date()
	let year =
		opts?.year || today.getMonth() < 3 ? today.getFullYear() : today.getFullYear() + 1
	const firstSunday = DateConverter.findNearestDay(new Date(year, 0, 1), 0)
	if (quarter === 1) {
		return firstSunday
	} else {
		let month = (quarter - 1) * 3 + firstSunday.getMonth() + 1
		if (month > 12) month = month - 12
		return DateConverter.findNearestDay(
			new Date(year, month, firstSunday.getDay()),
			0,
			3
		)
	}
}

function findQuarterEnd(quarterStartDate: Date, opts?: { year: number }): Date {
	const today = new Date()
	let year =
		opts?.year || today.getMonth() < 3 ? today.getFullYear() : today.getFullYear() + 1
	const month =
		quarterStartDate.getMonth() + 3 > 12
			? quarterStartDate.getMonth() + 3 - 12
			: quarterStartDate.getMonth() + 3
	return DateConverter.findNearestDay(
		new Date(year, month, quarterStartDate.getDate()),
		6,
		2
	)
}

function getQuarterDates(quarter: number, opts?: { year: number }): [Date, Date] {
	const quarterStart = getQuarterStart(quarter, opts)
	return [quarterStart, findQuarterEnd(quarterStart, opts)]
}

export const QuarterUtility = {
	getQuarterDates,
}
