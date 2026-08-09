import { TestBed } from '@angular/core/testing';

import { Academic } from './academic';

describe('Academic', () => {
  let service: Academic;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Academic);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
