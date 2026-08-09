import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardCatedratico } from './dashboard-catedratico';

describe('DashboardCatedratico', () => {
  let component: DashboardCatedratico;
  let fixture: ComponentFixture<DashboardCatedratico>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardCatedratico],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardCatedratico);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
