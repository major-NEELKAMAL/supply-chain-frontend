import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, Subscription, of } from 'rxjs';
import { debounceTime, switchMap, catchError, map } from 'rxjs/operators';
import { ImpactedProductDto, SearchResponse, ApiResponse, EntityType, ImpactedProductResponse } from '../../models/supply-chain.model';
import { SeedService } from '../../services/seed.service';
import { SupplyChainService } from '../../services/supply-chain.service';

interface GraphNode {
  id: string;
  x: number;
  y: number;
  label: string;
  subLabel?: string;
  type: EntityType | string;
  color: string;
}

interface GraphLink {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
}

@Component({
  selector: 'app-impact-analysis',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './impact-analysis.component.html'
})
export class ImpactAnalysisComponent implements OnInit, OnDestroy {
  searchQuery: string = '';
  searchResults: SearchResponse[] = [];
  impactedProducts: ImpactedProductDto[] = [];
  
  isSearching: boolean = false;
  isAnalyzing: boolean = false;
  showDropdown: boolean = false;
  hasSearched: boolean = false;
  hasAnalyzed: boolean = false;
  selectedEntity: SearchResponse | null = null;

  toastMessage: string | null = null;
  toastType: 'success' | 'error' = 'error';

  dynamicNodes: GraphNode[] = [];
  dynamicLinks: GraphLink[] = [];

  private readonly workflowOrder: Array<{ type: EntityType; label: string; linkRel: string; color: string }> = [
    { type: EntityType.SUPPLIER, label: 'Supplier', linkRel: '{SUPPLIES}', color: '#1e3a8a' },
    { type: EntityType.RAW_MATERIAL, label: 'RawMaterial', linkRel: '{YIELDS}', color: '#78350f' },
    { type: EntityType.COMPONENT, label: 'Component', linkRel: '{ASSEMBLED_INTO}', color: '#581c87' },
    { type: EntityType.SUB_ASSEMBLY, label: 'SubAssembly', linkRel: '{BUILDS}', color: '#312e81' },
    { type: EntityType.PRODUCT, label: 'Product', linkRel: '', color: '#064e3b' }
  ];

  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  constructor(
    private seedService: SeedService,
    private supplyChainService: SupplyChainService
  ) {}

  ngOnInit(): void {
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(300),
      switchMap((query: string) => {
        const cleanQuery = query.trim();

        if (cleanQuery.length < 2) {
          this.searchResults = [];
          this.showDropdown = false;
          this.isSearching = false;
          this.hasSearched = false;
          return of<SearchResponse[]>([]);
        }

        this.isSearching = true;

        return this.seedService.searchEntities(cleanQuery).pipe(
          map((res: ApiResponse | any) => {
            if (Array.isArray(res)) return res as SearchResponse[];
            return (res?.data || []) as SearchResponse[];
          }),
          catchError((err: HttpErrorResponse) => {
            this.handleError(err, 'Error searching entities');
            this.isSearching = false;
            this.searchResults = [];
            this.showDropdown = false;
            return of<SearchResponse[]>([]);
          })
        );
      })
    ).subscribe({
      next: (results: SearchResponse[]) => {
        this.searchResults = results;
        this.isSearching = false;
        this.hasSearched = true;
        this.showDropdown = true;
      }
    });
  }

  onInputChange(): void {
    this.selectedEntity = null;
    this.searchSubject.next(this.searchQuery);
  }

  selectEntity(entity: SearchResponse): void {
    this.selectedEntity = entity;
    this.searchQuery = `${entity.name} (${entity.id})`;
    this.showDropdown = false;
    this.searchResults = [];
    this.analyzeImpact(entity.id, entity.entityType);
  }

  analyzeImpact(entityId: string, entityType: EntityType | string = EntityType.SUPPLIER): void {
    this.isAnalyzing = true;
    this.hasAnalyzed = false;

    this.supplyChainService.getImpact(entityId, entityType).subscribe({
      next: (response: ImpactedProductResponse | any) => {
        const rawResults: ImpactedProductDto[] = response?.impactedProductDto || response?.impactedProducts || response?.data || response || [];
        
        this.impactedProducts = rawResults.filter(
          item => item.productId !== null && item.productId !== undefined && item.productId !== ''
        );

        this.isAnalyzing = false;
        this.hasAnalyzed = true;
        this.generateDynamicGraph();
      },
      error: (err: HttpErrorResponse) => {
        this.handleError(err, 'Failed to fetch impact analysis results');
        this.impactedProducts = [];
        this.isAnalyzing = false;
        this.hasAnalyzed = true;
        this.generateDynamicGraph();
      }
    });
  }

  generateDynamicGraph(): void {
    this.dynamicNodes = [];
    this.dynamicLinks = [];

    if (!this.selectedEntity) return;

    const startX = 70;
    const endX = 530;
    const centerY = 140;

    const rootType = this.selectedEntity.entityType || EntityType.SUPPLIER;
    let rootTierIdx = this.workflowOrder.findIndex(
      w => w.type.replace(/_/g, '').toLowerCase() === rootType.replace(/_/g, '').toLowerCase()
    );
    if (rootTierIdx === -1) rootTierIdx = 0;

    const rootConfig = this.workflowOrder[rootTierIdx];

    const rootNode: GraphNode = {
      id: `root_${this.selectedEntity.id || this.selectedEntity.name}`,
      x: startX,
      y: centerY,
      label: this.selectedEntity.name || rootConfig.label,
      subLabel: rootConfig.label,
      type: rootConfig.type,
      color: rootConfig.color
    };
    this.dynamicNodes.push(rootNode);

    if (this.impactedProducts.length === 0) return;

    const tierMap = new Map<number, Array<{ id: string; name: string; typeIndex: number }>>();

    this.impactedProducts.forEach((pathItem) => {
      const steps: Array<{ id?: string; name: string; typeIndex: number }> = [];

      if (pathItem.supplierName && rootTierIdx < 0) {
        steps.push({ id: pathItem.supplierId, name: pathItem.supplierName, typeIndex: 0 });
      }
      if (pathItem.rawMaterialName && rootTierIdx < 1) {
        steps.push({ id: pathItem.rawMaterialId, name: pathItem.rawMaterialName, typeIndex: 1 });
      }
      if (pathItem.componentName && rootTierIdx < 2) {
        steps.push({ id: pathItem.componentId, name: pathItem.componentName, typeIndex: 2 });
      }
      if (pathItem.subAssemblyName && rootTierIdx < 3) {
        steps.push({ id: pathItem.subAssemblyId, name: pathItem.subAssemblyName, typeIndex: 3 });
      }
      if (pathItem.productName) {
        steps.push({ id: pathItem.productId, name: pathItem.productName, typeIndex: 4 });
      }

      steps.forEach((step) => {
        if (!tierMap.has(step.typeIndex)) {
          tierMap.set(step.typeIndex, []);
        }
        const existingInTier = tierMap.get(step.typeIndex)!;
        if (!existingInTier.some(e => e.name === step.name)) {
          existingInTier.push({
            id: step.id || step.name,
            name: step.name,
            typeIndex: step.typeIndex
          });
        }
      });
    });

    const activeTiers = Array.from(tierMap.keys()).sort((a, b) => a - b);
    const totalHops = activeTiers.length;
    const xStep = totalHops > 0 ? (endX - startX) / totalHops : 0;

    activeTiers.forEach((tierIndex, hopIdx) => {
      const entities = tierMap.get(tierIndex) || [];
      const currentX = startX + xStep * (hopIdx + 1);

      entities.forEach((entity, entityIdx) => {
        const yOffset = (entityIdx - (entities.length - 1) / 2) * 60;
        const tierConfig = this.workflowOrder[entity.typeIndex];

        this.dynamicNodes.push({
          id: `node_${entity.typeIndex}_${entity.id}`,
          x: currentX,
          y: centerY + yOffset,
          label: entity.name,
          subLabel: tierConfig.label,
          type: tierConfig.type,
          color: tierConfig.color
        });
      });
    });

    this.impactedProducts.forEach((pathItem) => {
      const pathSteps: Array<{ id?: string; name: string; typeIndex: number }> = [];

      if (pathItem.supplierName && rootTierIdx < 0) {
        pathSteps.push({ id: pathItem.supplierId, name: pathItem.supplierName, typeIndex: 0 });
      }
      if (pathItem.rawMaterialName && rootTierIdx < 1) {
        pathSteps.push({ id: pathItem.rawMaterialId, name: pathItem.rawMaterialName, typeIndex: 1 });
      }
      if (pathItem.componentName && rootTierIdx < 2) {
        pathSteps.push({ id: pathItem.componentId, name: pathItem.componentName, typeIndex: 2 });
      }
      if (pathItem.subAssemblyName && rootTierIdx < 3) {
        pathSteps.push({ id: pathItem.subAssemblyId, name: pathItem.subAssemblyName, typeIndex: 3 });
      }
      if (pathItem.productName) {
        pathSteps.push({ id: pathItem.productId, name: pathItem.productName, typeIndex: 4 });
      }

      let prevNode = rootNode;
      let prevTierIdx = rootTierIdx;

      pathSteps.forEach((step) => {
        const targetNode = this.dynamicNodes.find(
          n => n.id === `node_${step.typeIndex}_${step.id || step.name}`
        );

        if (targetNode) {
          const prevTierConfig = this.workflowOrder[prevTierIdx];
          
          const linkExists = this.dynamicLinks.some(
            l => l.x1 === prevNode.x && l.y1 === prevNode.y && l.x2 === targetNode.x && l.y2 === targetNode.y
          );

          if (!linkExists) {
            this.dynamicLinks.push({
              x1: prevNode.x,
              y1: prevNode.y,
              x2: targetNode.x,
              y2: targetNode.y,
              label: prevTierConfig.linkRel || '{LINK}'
            });
          }

          prevNode = targetNode;
          prevTierIdx = step.typeIndex;
        }
      });
    });
  }

  hasColumn(tier: 'SUPPLIER' | 'RAW_MATERIAL' | 'COMPONENT' | 'SUB_ASSEMBLY'): boolean {
    if (!this.selectedEntity) return true;

    const order = ['SUPPLIER', 'RAW_MATERIAL', 'COMPONENT', 'SUB_ASSEMBLY', 'PRODUCT'];
    const entityType = (this.selectedEntity.entityType || '').toUpperCase().replace(/_/g, '');
    
    const rootIdx = order.findIndex(t => t.replace(/_/g, '') === entityType);
    const targetIdx = order.indexOf(tier);

    return targetIdx >= rootIdx;
  }


  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = [];
    this.impactedProducts = [];
    this.selectedEntity = null;
    this.showDropdown = false;
    this.hasSearched = false;
    this.hasAnalyzed = false;
    this.dynamicNodes = [];
    this.dynamicLinks = [];
  }

  hideDropdownWithDelay(): void {
    setTimeout(() => {
      this.showDropdown = false;
    }, 200);
  }

  private handleError(err: HttpErrorResponse, fallbackMsg: string): void {
    if (err.status > 400) {
      const msg = err.error?.message || fallbackMsg;
      this.showToast(msg, 'error');
    }
  }

  private showToast(msg: string, type: 'success' | 'error'): void {
    this.toastMessage = msg;
    this.toastType = type;
    setTimeout(() => (this.toastMessage = null), 4000);
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }
}