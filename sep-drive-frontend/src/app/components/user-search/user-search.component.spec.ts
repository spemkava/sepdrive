import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { UserSearchComponent } from './user-search.component';
import { By } from '@angular/platform-browser';

describe('UserSearchComponent', () => {
  let component: UserSearchComponent;
  let fixture: ComponentFixture<UserSearchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UserSearchComponent],
      imports: [FormsModule], // wegen [(ngModel)]
    }).compileComponents();

    fixture = TestBed.createComponent(UserSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should update query on input change', async () => {
    const input = fixture.debugElement.query(By.css('input')).nativeElement;
    input.value = 'testuser';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(component.query).toBe('testuser');
  });

  it('should call search() on Enter key', () => {
    spyOn(component, 'search');

    const input = fixture.debugElement.query(By.css('input')).nativeElement;
    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' }));
    fixture.detectChanges();

    expect(component.search).toHaveBeenCalled();
  });

  it('should display "no user found" message when results are empty and query is filled', () => {
    component.query = 'unknown';
    component.result = [];
    fixture.detectChanges();

    const message = fixture.debugElement.query(By.css('p'));
    expect(message.nativeElement.textContent).toContain(
      'Ein Nutzer mit diesem Namen konnte nicht gefunden werden'
    );
  });
});
