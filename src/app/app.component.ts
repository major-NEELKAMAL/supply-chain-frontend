import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ImpactAnalysisComponent } from './components/impact-analysis/impact-analysis.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ImpactAnalysisComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'supply-chain-frontend';
}