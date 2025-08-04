import { Directive, EventEmitter, HostListener, Output } from '@angular/core';

@Directive({
  selector: '[LongPress]',
  standalone: true, // Use standalone for modern Angular apps
})
export class LongPressDirective {
  private pressTimeout: any;

  @Output() longPress = new EventEmitter<MouseEvent | TouchEvent>();

  @HostListener('mousedown', ['$event'])
  @HostListener('touchstart', ['$event'])
  onPress(event: MouseEvent | TouchEvent) {
    this.pressTimeout = setTimeout(() => {
      event.preventDefault();
      this.longPress.emit(event);
    }, 300);
  }

  @HostListener('mouseup')
  @HostListener('mouseleave')
  @HostListener('touchend')
  onRelease() {
    clearTimeout(this.pressTimeout);
  }
}