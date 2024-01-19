import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TabComponent } from './tab.component';
import { By } from '@angular/platform-browser';

describe('Tab Component', () => {
  let fixture: ComponentFixture<TabComponent>;
  let component: TabComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TabComponent]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  })

  it("should have .hidden class", () => {
    const element = fixture.debugElement.query(
      By.css('.hidden'));
    const element2 = fixture.nativeElement.querySelector('.hidden');
    const element3 = document.querySelector('.hidden');

    expect(element).toBeTruthy();
  })

  it("should not hve .hidden class", () => {
    component.active = true;
    fixture.detectChanges();

    const element = fixture.debugElement.query(By.css('.hidden'));

    expect(element).not.toBeTruthy();
  })
})
