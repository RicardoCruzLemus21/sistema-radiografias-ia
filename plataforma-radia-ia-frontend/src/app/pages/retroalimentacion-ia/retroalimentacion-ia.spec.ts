import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RetroalimentacionIa } from './retroalimentacion-ia';

describe('RetroalimentacionIa', () => {
  let component: RetroalimentacionIa;
  let fixture: ComponentFixture<RetroalimentacionIa>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RetroalimentacionIa],
    }).compileComponents();

    fixture = TestBed.createComponent(RetroalimentacionIa);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
