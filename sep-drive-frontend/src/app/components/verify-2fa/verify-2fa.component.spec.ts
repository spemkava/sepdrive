import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Verify2faComponent } from './verify-2fa.component';

describe('Verify2faComponent', () => {
  let component: Verify2faComponent;
  let fixture: ComponentFixture<Verify2faComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Verify2faComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Verify2faComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
