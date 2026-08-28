import { Routes } from '@angular/router';
import { DataManagementComponent } from './components/data-management/data-management.component';
import { ImpactAnalysisComponent } from './components/impact-analysis/impact-analysis.component';

export const routes: Routes = [
  { path: '', redirectTo: 'impact-analysis', pathMatch: 'full' },
  { path: 'impact-analysis', component: ImpactAnalysisComponent },
  { path: 'data-management', component: DataManagementComponent },
  { path: '**', redirectTo: 'impact-analysis' }
];