interface AnimationProps {
	elem: HTMLElement
	property: string
	start: number
	end: number
	travel: number
}

function DoAnimate(
	timestamp: number, 
	start: number, 
	duration: number, 
	data: AnimationProps,
	resolve: () => void
) {
	const ellapsed = timestamp - start;
	const progress = (duration - (duration - ellapsed)) / duration;
	let move = data.start - (data.travel * progress);
	if(data.start > data.end && move < data.end) move = data.end;
	if(data.start < data.end && move > data.end) move = data.end;
	data.elem.style.transform = data.property + '(' + move + 'px)';
	if(progress < 1) {
		window.requestAnimationFrame(() => 
		DoAnimate(new Date().getTime(), start, duration, data, resolve));
	} else {
		resolve();
	}
}

export function Animate(
	elem: HTMLElement, 
	property: string, 
	start: number, 
	end: number, 
	duration?: number
): Promise<void> {
	if(!duration) duration = 1000;
	return new Promise((resolve, reject) => {
		window.requestAnimationFrame(() => DoAnimate(new Date().getTime(), new Date().getTime(), duration, {
			elem, property, start, end, travel: start - end
		}, resolve));
	});
}