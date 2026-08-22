import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SupplyChainService {
  private baseUrl = 'https://supplychain-api-3ntq.onrender.com/api/v1/supply-chain';

  constructor(private http: HttpClient) {}

  seedData(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/seed`, {});
  }

  getImpact(supplierId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/impact/${supplierId}`);
  }

  checkHealth(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/healthcheck`);
  }
}