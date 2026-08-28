import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { NotificationService } from './services/notification.service';
import { BatchUploadResult } from './models/supply-chain.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit, OnDestroy {
  public uploadNotification: BatchUploadResult | null = null;
  private notificationSub!: Subscription;

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.notificationSub = this.notificationService.uploadResult$.subscribe(
      (result: BatchUploadResult) => {
        this.uploadNotification = result;
      }
    );
  }

  dismissNotification(): void {
    this.uploadNotification = null;
  }

  ngOnDestroy(): void {
    if (this.notificationSub) {
      this.notificationSub.unsubscribe();
    }
  }
}