import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common'; // <--- Import isPlatformBrowser
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { SupplyChainService } from '../../services/supply-chain.service';
import { Subscription, timer } from 'rxjs';

@Component({
  selector: 'app-impact-analysis',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './impact-analysis.component.html'
})
export class ImpactAnalysisComponent implements OnInit, OnDestroy {
  supplierId: string = 'SUP-50';
  impactResults: any[] = [];
  
  isSeeding: boolean = false;
  isAnalyzing: boolean = false;

  isHealthy: boolean = false;
  isCheckingHealth: boolean = true;

  private healthSubscription!: Subscription;

  toastMessage: string | null = null;
  toastType: 'success' | 'error' = 'success';

  // Inject PLATFORM_ID to detect SSR vs Browser environment
  constructor(
    private supplyChainService: SupplyChainService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    // ONLY start polling if executing inside client browser
    if (isPlatformBrowser(this.platformId)) {
      this.startHealthcheckScheduler();
    }
  }

  startHealthcheckScheduler(): void {
    this.healthSubscription = timer(0, 60000).subscribe(() => {
      this.checkHealthStatus();
    });
  }

  checkHealthStatus(): void {
    this.supplyChainService.checkHealth().subscribe({
      next: (res: any) => {
        this.isHealthy = res?.success ?? true;
        this.isCheckingHealth = false;
      },
      error: () => {
        this.isHealthy = false;
        this.isCheckingHealth = false;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.healthSubscription) {
      this.healthSubscription.unsubscribe();
    }
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toastMessage = message;
    this.toastType = type;
    
    setTimeout(() => {
      this.toastMessage = null;
    }, 4000);
  }

  onSeedData(): void {
    this.isSeeding = true;

    this.supplyChainService.seedData().subscribe({
      next: (res: any) => {
        this.isSeeding = false;
        this.showToast(res?.message || 'Graph data seeded successfully!', 'success');
       
      },
      error: (err: HttpErrorResponse) => {
        this.isSeeding = false;
        const backendMsg = err.error?.message || 'Failed to seed graph database.';
        this.showToast(backendMsg, 'error');
      }
    });
  }

  onAnalyzeImpact(): void {
    if (!this.supplierId.trim()) return;

    this.isAnalyzing = true;
    this.impactResults = [];

    this.supplyChainService.getImpact(this.supplierId.trim()).subscribe({
      next: (res: any) => {
        this.impactResults = res?.impactedProducts || [];
        this.isAnalyzing = false;
        
        if (this.impactResults.length > 0) {
          this.showToast(`Found ${this.impactResults.length} impacted end-products.`, 'success');
        } else {
          this.showToast(`No blast radius paths found for ${this.supplierId}`, 'error');
        }
      },
      error: (err: HttpErrorResponse) => {
        this.isAnalyzing = false;
        const backendMsg = err.error?.message || `Error analyzing impact for ${this.supplierId}`;
        this.showToast(backendMsg, 'error');
        
      }
    });
  }
}