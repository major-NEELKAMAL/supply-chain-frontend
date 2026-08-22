import { TestBed } from '@angular/core/testing';

import { SupplyChainService } from './supply-chain.service';

describe('SupplyChainService', () => {
  let service: SupplyChainService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SupplyChainService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
