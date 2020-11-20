type rgb = string[]

function getRgb(c: string): rgb {
	if (c.indexOf('rgb(') === 0) {
		return c
			.substring(4, c.length - 1)
			.split(',')
			.map((c) => c.trim())
	} else if (c.indexOf('rgba(') === 0) {
		return c
			.substring(5, c.length - 1)
			.split(',')
			.map((c) => c.trim())
	}
	throw new Error('Invalid RGB value: ' + c)
}

function createRgb(rgb: rgb): string {
	return 'rgb(' + rgb.join(',') + ')'
}

function hexToRgb(c: string): rgb {
	if (c.includes('#')) {
		c = c.slice(1)
		if (c.length === 3) {
			let r = '0x' + c[1] + c[1]
			let g = '0x' + c[2] + c[2]
			let b = '0x' + c[3] + c[3]
			return [r, g, b]
		} else if (c.length === 6) {
			let r = '0x' + c[1] + c[2]
			let g = '0x' + c[3] + c[4]
			let b = '0x' + c[5] + c[6]
			return [r, g, b]
		}
	}
	throw new Error('Invalid HEX color value: ' + c)
}

function invertColor(color: rgb): rgb {
	return color.map((c) => (255 - Number(c)).toString())
}

function clampColor(color: rgb): rgb {
	const total = color.reduce((a: string, b: string) => {
		return Number(a) + Number(b).toString()
	}, '0')
	return Number(total) > 382 ? ['255', '255', '255'] : ['0', '0', '0']
}

function getHoverColors(): [string, string] {
	const bkg = document.querySelector('html').style.backgroundColor
	const text = 'rgb(' + clampColor(invertColor(getRgb(bkg))).join(',') + ')'
	return [bkg, text]
}

function waitForColor(cb: () => void) {
	const color = document.querySelector('html').style.backgroundColor
	if (!color) {
		window.requestAnimationFrame(cb)
	} else {
		cb()
	}
}

export const ColorUtils = {
	getRgb,
	createRgb,
	hexToRgb,
	invertColor,
	clampColor,
	getHoverColors,
	waitForColor,
}
