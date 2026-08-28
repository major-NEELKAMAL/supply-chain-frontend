import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, NodeEntityRequest } from '../models/supply-chain.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SeedService {
  private baseUrl = `${environment.apiUrl}/seed`;

  constructor(private http: HttpClient) {}

  getAllSeedNodes(limit: number = 20, offset: number = 0): Observable<ApiResponse> {
    const params = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString());

    return this.http.get<ApiResponse>(this.baseUrl, { params });
  }

  searchEntities(keyword: string, entityType?: string): Observable<ApiResponse> {
    let url = `${this.baseUrl}/search?keyword=${encodeURIComponent(keyword)}`;
    if (entityType) {
      url += `&entityType=${encodeURIComponent(entityType)}`;
    }
    return this.http.get<ApiResponse>(url);
  }

  createSeedNode(payload: NodeEntityRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(this.baseUrl, payload);
  }

  updateSeedNode(payload: NodeEntityRequest): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(this.baseUrl, payload);
  }

  deleteSeedNode(id: string, entityType: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/${id}?entityType=${encodeURIComponent(entityType)}`);
  }

  deleteAllSeedNodes(): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/delete-all`);
  }

  uploadCsv(file: File, userId: string): Observable<ApiResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    return this.http.post<ApiResponse>(`${this.baseUrl}/upload-future`, formData);
  }

  seedDefaultGraph(userId: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/default?userId=${userId}`, {});
  }
}