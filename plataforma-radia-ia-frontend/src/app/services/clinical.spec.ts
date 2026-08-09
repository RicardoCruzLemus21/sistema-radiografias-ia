import { TestBed } from '@angular/core/testing';

import { Clinical } from './clinical';

describe('Clinical', () => {
  let service: Clinical;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Clinical);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
