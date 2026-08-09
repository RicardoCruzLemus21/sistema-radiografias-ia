import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardEstudiante } from './dashboard-estudiante';

describe('DashboardEstudiante', () => {
  let component: DashboardEstudiante;
  let fixture: ComponentFixture<DashboardEstudiante>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardEstudiante],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardEstudiante);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
