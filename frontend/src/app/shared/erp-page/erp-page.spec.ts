import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ErpPage } from './erp-page';

describe('ErpPage', () => {
  let component: ErpPage;
  let fixture: ComponentFixture<ErpPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErpPage],
    }).compileComponents();

    fixture = TestBed.createComponent(ErpPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
