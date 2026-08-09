import { TestBed } from '@angular/core/testing';

import { Diagnostico } from './diagnostico';

describe('Diagnostico', () => {
  let service: Diagnostico;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Diagnostico);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
