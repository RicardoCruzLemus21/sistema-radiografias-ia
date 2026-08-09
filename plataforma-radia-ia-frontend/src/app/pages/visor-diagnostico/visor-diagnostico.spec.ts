import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VisorDiagnostico } from './visor-diagnostico';

describe('VisorDiagnostico', () => {
  let component: VisorDiagnostico;
  let fixture: ComponentFixture<VisorDiagnostico>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VisorDiagnostico],
    }).compileComponents();

    fixture = TestBed.createComponent(VisorDiagnostico);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
