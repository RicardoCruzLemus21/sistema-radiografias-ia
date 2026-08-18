import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RevisionEvaluaciones } from './revision-evaluaciones';

describe('RevisionEvaluaciones', () => {
  let component: RevisionEvaluaciones;
  let fixture: ComponentFixture<RevisionEvaluaciones>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RevisionEvaluaciones],
    }).compileComponents();

    fixture = TestBed.createComponent(RevisionEvaluaciones);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
