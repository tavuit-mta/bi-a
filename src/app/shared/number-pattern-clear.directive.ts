import { Directive, HostListener, ElementRef } from '@angular/core';

@Directive({
	standalone: true,
	selector: '[numberPattern]'
})
export class NumberPatternClearDirective {
	constructor(private el: ElementRef<HTMLInputElement>) { }

	@HostListener('input', ['$event'])
	onInput(event: Event) {
		const input = this.el.nativeElement;
		// Only allow digits (pattern [0-9]*)
		if (!/^\d*$/.test(input.value)) {
			input.value = '';
			// Optionally, you can dispatch an input event to update Angular form
			input.dispatchEvent(new Event('input'));
		}
	}
}
