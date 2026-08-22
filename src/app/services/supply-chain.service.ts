import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ImpactedProduct {
  productId: string;
  productName: string;
  depth: number;
}

@Injectable({
  providedIn: 'root'
})
export class SupplyChainService {

private apiUrl = 'https://supplychain-api-3ntq.onrender.com/api/supply-chain';

  constructor(private http: HttpClient) {}

  getImpactedProducts(supplierId: string): Observable<ImpactedProduct[]> {
    return this.http.get<ImpactedProduct[]>(`${this.apiUrl}/impact/${supplierId}`);
  }

  seedData(): Observable<string> {
    return this.http.post(`${this.apiUrl}/seed`, {}, { responseType: 'text' });
  }
}