export function formatObjectKey(key: string) {
	return key
		.split('-')
		.map((word, i) =>
			i !== 0 ? word.substring(0, 1).toUpperCase() + word.substring(1) : word
		)
		.join('')
}

export function validPhoneNumber(val: string): boolean {
	const regex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/
	return regex.test(val)
}
