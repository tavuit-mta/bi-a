import { Directive, EventEmitter, HostListener, Output } from '@angular/core';

@Directive({
  selector: '[LongPress]',
  standalone: true, // Use standalone for modern Angular apps
})
export class LongPressDirective {
  private pressTimeout: any;

  // Output the original event to get coordinates
  @Output() longPress = new EventEmitter<MouseEvent | TouchEvent>();

  @HostListener('mousedown', ['$event'])
  @HostListener('touchstart', ['$event'])
  onPress(event: MouseEvent | TouchEvent) {
    // Start a timeout to detect a long press
    this.pressTimeout = setTimeout(() => {
      // Prevent the default context menu
      event.preventDefault();
      this.longPress.emit(event);
    }, 500); // 500ms for a long press
  }

  @HostListener('mouseup')
  @HostListener('mouseleave')
  @HostListener('touchend')
  onRelease() {
    // Cancel the timeout if the press is released too early
    clearTimeout(this.pressTimeout);
  }
}