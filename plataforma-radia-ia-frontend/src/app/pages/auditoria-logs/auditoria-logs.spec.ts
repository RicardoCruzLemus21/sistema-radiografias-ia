import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuditoriaLogs } from './auditoria-logs';

describe('AuditoriaLogs', () => {
  let component: AuditoriaLogs;
  let fixture: ComponentFixture<AuditoriaLogs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditoriaLogs],
    }).compileComponents();

    fixture = TestBed.createComponent(AuditoriaLogs);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
