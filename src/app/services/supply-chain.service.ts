import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupplyChainService {

  private baseUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

 getImpact(entityId: string, entityType: string = 'Supplier'): Observable<any> {
    const params = new HttpParams().set('entityType', entityType);
    return this.http.get<any>(`${this.baseUrl}/supply-chain/impact/${entityId}`, { params });
  }
  checkHealth(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/supply-chain/healthcheck`);
  }
}