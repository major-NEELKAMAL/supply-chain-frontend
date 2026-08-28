import { Injectable, NgZone } from '@angular/core';
import { Subject } from 'rxjs';
import { BatchUploadResult } from '../models/supply-chain.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private baseUrl = `${environment.apiUrl}/seed`;
  private eventSource: EventSource | null = null;
  public uploadResult$ = new Subject<BatchUploadResult>();

  constructor(private zone: NgZone) {}

  public listenForUploadCompletion(userId: string): void {
    // If a connection is already active, don't re-open
    if (this.eventSource && this.eventSource.readyState !== EventSource.CLOSED) {
      return;
    }

    const sseUrl = `${this.baseUrl}/subscribe/${userId}`;
    this.eventSource = new EventSource(sseUrl);

    // 1. Listen for custom event "UPLOAD_COMPLETE"
    this.eventSource.addEventListener('UPLOAD_COMPLETE', (event: MessageEvent) => {
      this.zone.run(() => {
        const result: BatchUploadResult = JSON.parse(event.data);
        this.uploadResult$.next(result);
        
        // Auto-close SSE stream as soon as message is delivered
        this.closeSubscription();
      });
    });

    // 2. Fallback listener for default messages
    this.eventSource.onmessage = (event: MessageEvent) => {
      this.zone.run(() => {
        if (event.data) {
          try {
            const result: BatchUploadResult = JSON.parse(event.data);
            this.uploadResult$.next(result);
          } catch (e) {
            console.warn('Received non-JSON SSE payload:', event.data);
          }
        }
        // Auto-close SSE stream as soon as message is delivered
        this.closeSubscription();
      });
    };

    // 3. Handle connection closure or errors
    this.eventSource.onerror = () => {
      // Close local reference when backend ends stream
      this.closeSubscription();
    };
  }

  public closeSubscription(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      console.log('SSE connection closed cleanly.');
    }
  }
}