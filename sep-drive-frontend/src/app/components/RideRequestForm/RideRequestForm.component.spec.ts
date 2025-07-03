
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RideRequestFormComponent } from './RideRequestForm.component';
import {FormBuilder, ReactiveFormsModule} from '@angular/forms';
import { CarClass } from '../../models/enums.model';

describe('RideRequestFormComponent', () => {
  let component: RideRequestFormComponent;
  let fixture: ComponentFixture<RideRequestFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RideRequestFormComponent, ReactiveFormsModule], // ggf. ReactiveFormsModule falls nötig
      providers: [FormBuilder]
    }).compileComponents();

    fixture = TestBed.createComponent(RideRequestFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('calculatePrice', () => {

    it('should calculate price correctly for SMALL car class', () => {
      component.totalDistance = 10;
      component.carClass = CarClass.SMALL;

      component.calculatePrice();

      expect(component.price).toBe(10); // 1x
    });

    it('should calculate price correctly for MEDIUM car class', () => {
      component.totalDistance = 10;
      component.carClass = CarClass.MEDIUM;

      component.calculatePrice();

      expect(component.price).toBe(20); // 2x
    });

    it('should calculate price correctly for DELUXE car class', () => {
      component.totalDistance = 10;
      component.carClass = CarClass.DELUXE;

      component.calculatePrice();

      expect(component.price).toBe(100); // 10x
    });

    it('should not set price if totalDistance is undefined', () => {
      component.totalDistance = undefined;
      component.carClass = CarClass.SMALL;

      component.calculatePrice();

      expect(component.price).toBeUndefined();
    });

    it('should do nothing or log error if carClass is undefined or invalid', () => {
      component.totalDistance = 10;
      component.carClass = undefined as any;

      const consoleSpy = spyOn(console, 'log');

      component.calculatePrice();

      expect(consoleSpy).toHaveBeenCalledWith('error2');
    });
  });
});
