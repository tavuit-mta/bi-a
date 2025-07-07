import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddGameDialogComponent } from './add-game-dialog.component';

describe('AddGameDialogComponent', () => {
  let component: AddGameDialogComponent;
  let fixture: ComponentFixture<AddGameDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddGameDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddGameDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
