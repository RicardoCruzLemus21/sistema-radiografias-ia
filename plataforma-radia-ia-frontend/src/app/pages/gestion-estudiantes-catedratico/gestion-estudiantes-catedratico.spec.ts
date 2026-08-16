import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionEstudiantesCatedratico } from './gestion-estudiantes-catedratico';

describe('GestionEstudiantesCatedratico', () => {
  let component: GestionEstudiantesCatedratico;
  let fixture: ComponentFixture<GestionEstudiantesCatedratico>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionEstudiantesCatedratico],
    }).compileComponents();

    fixture = TestBed.createComponent(GestionEstudiantesCatedratico);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
