import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupplyChainService, ImpactedProduct } from '../../services/supply-chain.service';

@Component({
  selector: 'app-impact-analysis',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './impact-analysis.component.html',
  styleUrl: './impact-analysis.component.scss'
})
export class ImpactAnalysisComponent {
  supplierId: string = 'SUP-50';
  impactedProducts: ImpactedProduct[] = [];
  loading: boolean = false;
  error: string | null = null;
  seedMessage: string | null = null;

  constructor(private supplyChainService: SupplyChainService) {}

  seedDatabase() {
    this.loading = true;
    this.error = null;
    this.seedMessage = null;

    this.supplyChainService.seedData().subscribe({
      next: (response) => {
        this.seedMessage = response;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to seed database. Verify Spring Boot (8081) and CognoDB connection.';
        this.loading = false;
      }
    });
  }

  analyzeImpact() {
    this.loading = true;
    this.error = null;
    this.seedMessage = null;

    this.supplyChainService.getImpactedProducts(this.supplierId).subscribe({
      next: (data) => {
        this.impactedProducts = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to query CognoDB via backend at http://localhost:8081';
        this.loading = false;
      }
    });
  }
}