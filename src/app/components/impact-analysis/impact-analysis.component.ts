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
  originalId: string;
  x: number;
  y: number;
  label: string;
  subLabel?: string;
  type: EntityType | string;
  color: string;
  borderColor: string;
  childCount: number;
}

interface GraphLink {
  sourceId: string;
  targetId: string;
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

  // Graph Data & Interactivity State
  rawNodes: GraphNode[] = [];
  rawLinks: GraphLink[] = [];
  dynamicNodes: GraphNode[] = [];
  dynamicLinks: GraphLink[] = [];
  collapsedNodeIds: Set<string> = new Set<string>();
  hoveredNodeId: string | null = null;

  // Canvas Zoom & Pan Controls
  zoomLevel: number = 1;
  panX: number = 0;
  panY: number = 0;
  minZoom = 0.5;
  maxZoom = 2.5;
  maxPanX = 500;
  maxPanY = 300;

  // Table Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;
  paginatedImpacts: ImpactedProductDto[] = [];

  private readonly workflowOrder: Array<{ type: EntityType; label: string; linkRel: string; color: string; borderColor: string }> = [
    { type: EntityType.SUPPLIER, label: 'Supplier', linkRel: '{SUPPLIES}', color: '#f0fdf4', borderColor: '#16a34a' },
    { type: EntityType.RAW_MATERIAL, label: 'RawMaterial', linkRel: '{YIELDS}', color: '#fffbeb', borderColor: '#d97706' },
    { type: EntityType.COMPONENT, label: 'Component', linkRel: '{ASSEMBLED_INTO}', color: '#f0fdfa', borderColor: '#0d9488' },
    { type: EntityType.SUB_ASSEMBLY, label: 'SubAssembly', linkRel: '{BUILDS}', color: '#f0f9ff', borderColor: '#0284c7' },
    { type: EntityType.PRODUCT, label: 'Product', linkRel: '', color: '#fdf2f8', borderColor: '#db2777' }
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
        this.setupPagination();
        this.generateDynamicGraph();
      },
      error: (err: HttpErrorResponse) => {
        this.handleError(err, 'Failed to fetch impact analysis results');
        this.impactedProducts = [];
        this.isAnalyzing = false;
        this.hasAnalyzed = true;
        this.setupPagination();
        this.generateDynamicGraph();
      }
    });
  }

  generateDynamicGraph(): void {
    this.rawNodes = [];
    this.rawLinks = [];
    this.collapsedNodeIds.clear();

    if (!this.selectedEntity) return;

    const startX = 80;
    const endX = 820;
    const centerY = 250;

    const rootType = this.selectedEntity.entityType || EntityType.SUPPLIER;
    let rootTierIdx = this.workflowOrder.findIndex(
      w => w.type.replace(/_/g, '').toLowerCase() === rootType.replace(/_/g, '').toLowerCase()
    );
    if (rootTierIdx === -1) rootTierIdx = 0;

    const rootConfig = this.workflowOrder[rootTierIdx];
    const rootNodeId = `node_${rootTierIdx}_${this.selectedEntity.id || this.selectedEntity.name}`;

    const rootNode: GraphNode = {
      id: rootNodeId,
      originalId: this.selectedEntity.id || this.selectedEntity.name,
      x: startX,
      y: centerY,
      label: this.selectedEntity.name || rootConfig.label,
      subLabel: rootConfig.label,
      type: rootConfig.type,
      color: rootConfig.color,
      borderColor: rootConfig.borderColor,
      childCount: 0
    };

    const nodeMap = new Map<string, GraphNode>();
    nodeMap.set(rootNodeId, rootNode);

    const tierMap = new Map<number, Map<string, { id: string; name: string; typeIndex: number }>>();

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
          tierMap.set(step.typeIndex, new Map());
        }
        const key = step.id || step.name;
        if (!tierMap.get(step.typeIndex)!.has(key)) {
          tierMap.get(step.typeIndex)!.set(key, {
            id: key,
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
      const entitiesMap = tierMap.get(tierIndex)!;
      const entities = Array.from(entitiesMap.values());
      const currentX = startX + xStep * (hopIdx + 1);

      entities.forEach((entity, entityIdx) => {
        const spacing = 420 / (entities.length + 1);
        const nodeY = Math.round(spacing * (entityIdx + 1));
        const tierConfig = this.workflowOrder[entity.typeIndex];
        const nodeId = `node_${entity.typeIndex}_${entity.id}`;

        const gNode: GraphNode = {
          id: nodeId,
          originalId: entity.id,
          x: currentX,
          y: nodeY,
          label: entity.name,
          subLabel: tierConfig.label,
          type: tierConfig.type,
          color: tierConfig.color,
          borderColor: tierConfig.borderColor,
          childCount: 0
        };
        nodeMap.set(nodeId, gNode);
      });
    });

    const linkSet = new Set<string>();

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
        const targetNodeId = `node_${step.typeIndex}_${step.id || step.name}`;
        const targetNode = nodeMap.get(targetNodeId);

        if (targetNode) {
          const linkKey = `${prevNode.id}->${targetNode.id}`;

          if (!linkSet.has(linkKey)) {
            linkSet.add(linkKey);
            prevNode.childCount++;

            const prevTierConfig = this.workflowOrder[prevTierIdx];
            this.rawLinks.push({
              sourceId: prevNode.id,
              targetId: targetNode.id,
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

    this.rawNodes = Array.from(nodeMap.values());
    this.recalculateVisibleGraph();
  }

  toggleNodeCollapse(nodeId: string, event: MouseEvent): void {
    event.stopPropagation();
    if (this.collapsedNodeIds.has(nodeId)) {
      this.collapsedNodeIds.delete(nodeId);
    } else {
      this.collapsedNodeIds.add(nodeId);
    }
    this.recalculateVisibleGraph();
  }

  recalculateVisibleGraph(): void {
    const hiddenNodeIds = new Set<string>();

    const markHiddenChildren = (parentId: string) => {
      this.rawLinks.forEach(link => {
        if (link.sourceId === parentId) {
          hiddenNodeIds.add(link.targetId);
          markHiddenChildren(link.targetId);
        }
      });
    };

    this.collapsedNodeIds.forEach(id => markHiddenChildren(id));

    this.dynamicNodes = this.rawNodes.filter(node => !hiddenNodeIds.has(node.id));
    this.dynamicLinks = this.rawLinks.filter(link => !hiddenNodeIds.has(link.sourceId) && !hiddenNodeIds.has(link.targetId));
  }

  isPathActive(link: GraphLink): boolean {
    if (!this.hoveredNodeId) return false;
    return link.sourceId === this.hoveredNodeId || link.targetId === this.hoveredNodeId;
  }

  isNodeRelated(nodeId: string): boolean {
    if (!this.hoveredNodeId) return true;
    if (nodeId === this.hoveredNodeId) return true;
    return this.dynamicLinks.some(
      l => (l.sourceId === this.hoveredNodeId && l.targetId === nodeId) ||
           (l.targetId === this.hoveredNodeId && l.sourceId === nodeId)
    );
  }

  getBezierPath(x1: number, y1: number, x2: number, y2: number): string {
    const midX = (x1 + x2) / 2;
    return `M ${x1 + 60} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2 - 60} ${y2}`;
  }

  setZoom(value: number | string): void {
    this.zoomLevel = parseFloat(value as string);
  }

  setPanX(value: number | string): void {
    this.panX = parseFloat(value as string);
  }

  setPanY(value: number | string): void {
    this.panY = parseFloat(value as string);
  }

  resetViewport(): void {
    this.zoomLevel = 1;
    this.panX = 0;
    this.panY = 0;
  }

  setupPagination(): void {
    this.currentPage = 1;
    this.totalPages = Math.ceil(this.impactedProducts.length / this.pageSize) || 1;
    this.updatePaginatedData();
  }

  updatePaginatedData(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedImpacts = this.impactedProducts.slice(start, start + this.pageSize);
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedData();
    }
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
    this.paginatedImpacts = [];
    this.selectedEntity = null;
    this.showDropdown = false;
    this.hasSearched = false;
    this.hasAnalyzed = false;
    this.dynamicNodes = [];
    this.dynamicLinks = [];
    this.rawNodes = [];
    this.rawLinks = [];
    this.resetViewport();
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