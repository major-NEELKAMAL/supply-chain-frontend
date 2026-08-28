import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { SeedService } from '../../services/seed.service';
import { NotificationService } from '../../services/notification.service';
import { 
  NodeEntityRequest, 
  ParentNodeDto, 
  SearchResponse, 
  BatchUploadResult, 
  ApiResponse, 
  ParentEdge, 
  EntityType 
} from '../../models/supply-chain.model';

@Component({
  selector: 'app-data-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './data-management.component.html',
  styleUrls: ['./data-management.component.scss']
})
export class DataManagementComponent implements OnInit, OnDestroy {
  EntityType = EntityType;
  entityType: EntityType | string = EntityType.SUPPLIER;
  name: string = '';
  category: string = '';
  parentId: string = '';

  nodesList: NodeEntityRequest[] = [];
  isLoadingNodes: boolean = false;
  searchFilter: string = '';

  parentOptions: SearchResponse[] = [];
  
  isEditModalOpen: boolean = false;
  editNode: NodeEntityRequest = {};
  editParents: ParentNodeDto[] = [];
  newParentIdToAdd: string = '';
  editParentOptions: SearchResponse[] = [];

  selectedFile: File | null = null;
  userId: string = 'user_' + Math.random().toString(36).substring(2, 9);
  
  isUploading: boolean = false;
  isDeleting: boolean = false;
  isCreating: boolean = false;
  isUpdating: boolean = false;
  
  uploadResult: BatchUploadResult | null = null;

  toastMessage: string | null = null;
  toastType: 'success' | 'error' = 'success';
  toastStatusCode: number | null = null;
  private toastTimeout: any;

  private notificationSub!: Subscription;

  constructor(
    private seedService: SeedService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.refreshNodesList();
    this.onEntityTypeChange();
    
    this.notificationSub = this.notificationService.uploadResult$.subscribe({
      next: (result: BatchUploadResult) => {
        this.uploadResult = result;
        this.isUploading = false;
        this.refreshNodesList();
        
        const code = result.code || 200;
        if (result.failureCount > 0) {
          this.showToast(`Batch completed with ${result.failureCount} error(s).`, 400);
        } else {
          this.showToast(result.message || 'Batch CSV import completed successfully.', code);
        }
      },
      error: (err) => {
        this.isUploading = false;
        const status = err.status || 500;
        this.showToast('An error occurred during batch processing.', status);
      }
    });
  }

  refreshNodesList(): void {
    this.isLoadingNodes = true;
    this.seedService.getAllSeedNodes().subscribe({
      next: (res: ApiResponse) => {
        this.nodesList = res.data || [];
        this.isLoadingNodes = false;
      },
      error: (err: HttpErrorResponse) => {
        this.isLoadingNodes = false;
        this.handleHttpError(err, 'Failed to fetch node entities');
      }
    });
  }

  getParentTypeFor(type?: string): EntityType | string | null {
    if (!type) return null;
    const normalized = type.replace(/[_/s]/g, '').toUpperCase();
    const parentTypeMap: { [key: string]: EntityType | string } = {
      'RAWMATERIAL': EntityType.SUPPLIER,
      'COMPONENT': EntityType.RAW_MATERIAL,
      'SUBASSEMBLY': EntityType.COMPONENT,
      'PRODUCT': EntityType.SUB_ASSEMBLY
    };
    return parentTypeMap[normalized] || null;
  }

  onEntityTypeChange(): void {
    this.parentId = '';
    this.parentOptions = [];

    const targetParentType = this.getParentTypeFor(this.entityType);
    if (targetParentType) {
      this.seedService.searchEntities('', targetParentType).subscribe({
        next: (res: ApiResponse) => {
          this.parentOptions = res.data || [];
        },
        error: (err: HttpErrorResponse) => {
          this.handleHttpError(err, 'Failed to fetch parent options');
        }
      });
    }
  }

  onCreateNode(): void {
    if (!this.name || !this.category) {
      this.showToast('Please provide both Name and Category.', 400);
      return;
    }

    if (this.entityType !== EntityType.SUPPLIER && this.entityType !== 'SUPPLIER' && !this.parentId) {
      this.showToast('Please select a valid Parent entity.', 400);
      return;
    }

    this.isCreating = true;
    
    const parentinfo: ParentNodeDto[] = [];
    if (this.entityType !== EntityType.SUPPLIER && this.entityType !== 'SUPPLIER' && this.parentId) {
      parentinfo.push({
        parentId: this.parentId,
        parentEdge: 'ADD' as ParentEdge
      });
    }

    const payload: NodeEntityRequest = {
      entityType: this.entityType,
      name: this.name,
      category: this.category,
      parentNodeDto: parentinfo
    };

    this.seedService.createSeedNode(payload).subscribe({
      next: (res) => {
        this.isCreating = false;
        this.showToast(res.message || 'Entity node created successfully.', res.code || 201);
        this.resetForm();
        this.refreshNodesList();
      },
      error: (err: HttpErrorResponse) => {
        this.isCreating = false;
        this.handleHttpError(err, 'Failed to create entity node');
      }
    });
  }

  openEditModal(node: NodeEntityRequest): void {
    this.editNode = { ...node };
    this.editParents = [];
    this.newParentIdToAdd = '';
    this.editParentOptions = [];

    const targetParentType = this.getParentTypeFor(node.entityType || '');
    if (targetParentType && node.id) {
      this.seedService.searchEntities('', targetParentType).subscribe({
        next: (res: ApiResponse) => {
          this.editParentOptions = res.data || [];
          
          if (node.parentNodeDto && node.parentNodeDto.length > 0) {
            this.editParents = node.parentNodeDto.map(p => {
              const matchedParent = this.editParentOptions.find(opt => opt.id === p.parentId);
              return {
                parentId: p.parentId,
                parentName: p.parentName || (matchedParent ? matchedParent.name : p.parentId),
                parentEdge: 'ALREADY_LINKED' as ParentEdge
              };
            });
          }
        }
      });
    } else {
      if (node.parentNodeDto && node.parentNodeDto.length > 0) {
        this.editParents = node.parentNodeDto.map(p => ({
          parentId: p.parentId,
          parentName: p.parentName,
          parentEdge: 'ALREADY_LINKED' as ParentEdge
        }));
      }
    }

    this.isEditModalOpen = true;
  }

  closeEditModal(): void {
    this.isEditModalOpen = false;
    this.editNode = {};
    this.editParents = [];
    this.newParentIdToAdd = '';
  }

  toggleParentEdge(parent: ParentNodeDto): void {
    if (parent.parentEdge === 'REMOVE') {
      parent.parentEdge = 'ALREADY_LINKED' as ParentEdge;
    } else {
      parent.parentEdge = 'REMOVE' as ParentEdge;
    }
  }

  addNewParentToEdit(): void {
    if (!this.newParentIdToAdd) return;
    
    const alreadyExists = this.editParents.some(p => p.parentId === this.newParentIdToAdd);
    if (alreadyExists) {
      this.showToast('This parent is already assigned or added.', 400);
      return;
    }

    const selectedOpt = this.editParentOptions.find(o => o.id === this.newParentIdToAdd);

    this.editParents.push({
      parentId: this.newParentIdToAdd,
      parentName: selectedOpt ? selectedOpt.name : '',
      parentEdge: 'ADD' as ParentEdge
    });

    this.newParentIdToAdd = '';
  }

  removeNewlyAddedParent(index: number): void {
    this.editParents.splice(index, 1);
  }

  onUpdateNode(): void {
    if (!this.editNode.name || !this.editNode.category) {
      this.showToast('Name and Category are required for update.', 400);
      return;
    }

    this.isUpdating = true;

    const payload: NodeEntityRequest = {
      id: this.editNode.id,
      name: this.editNode.name,
      category: this.editNode.category,
      entityType: this.editNode.entityType,
      parentNodeDto: this.editParents
    };

    this.seedService.updateSeedNode(payload).subscribe({
      next: (res) => {
        this.isUpdating = false;
        this.showToast(res.message || 'Entity node updated successfully.', res.code || 200);
        this.closeEditModal();
        this.refreshNodesList();
      },
      error: (err: HttpErrorResponse) => {
        this.isUpdating = false;
        this.handleHttpError(err, 'Failed to update entity node');
      }
    });
  }

  onDeleteNode(node: NodeEntityRequest): void {
    if (!node.id || !node.entityType) return;

    if (confirm(`Are you sure you want to delete '${node.name}'? Unlinked downstream items will also be cleared.`)) {
      this.seedService.deleteSeedNode(node.id, node.entityType).subscribe({
        next: (res) => {
          this.showToast(res.message || 'Entity deleted successfully.', res.code || 200);
          this.refreshNodesList();
        },
        error: (err: HttpErrorResponse) => {
          this.handleHttpError(err, 'Failed to delete entity node');
        }
      });
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  onUploadCsv(): void {
    if (!this.selectedFile) {
      this.showToast('Please select a valid CSV file first.', 400);
      return;
    }

    this.isUploading = true;
    this.uploadResult = null;
    this.showToast('Uploading CSV... Awaiting execution.', 200);

    this.notificationService.listenForUploadCompletion(this.userId);

    this.seedService.uploadCsv(this.selectedFile, this.userId).subscribe({
      next: (res) => {
        this.showToast(res.message || 'CSV uploaded. Awaiting batch execution.', res.code || 202);
      },
      error: (err: HttpErrorResponse) => {
        this.isUploading = false;
        this.notificationService.closeSubscription();
        this.handleHttpError(err, 'CSV upload failed');
      }
    });
  }

  onUploadDefaultSeedCsv(): void {
    this.isUploading = true;
    this.uploadResult = null;
    this.showToast('Initiating backend default graph seeding...', 200);

    this.notificationService.listenForUploadCompletion(this.userId);

    this.seedService.seedDefaultGraph(this.userId).subscribe({
      next: (res: ApiResponse) => {
        this.showToast(res.message || 'Default seed processing started.', res.code || 202);
      },
      error: (err: HttpErrorResponse) => {
        this.isUploading = false;
        this.notificationService.closeSubscription();
        this.handleHttpError(err, 'Failed to trigger default backend seeding');
      }
    });
  }

  onDeleteAllData(): void {
    if (this.isDeleting) return;

    if (confirm('Are you sure you want to delete all supply chain graph data? This cannot be undone.')) {
      this.isDeleting = true;
      this.showToast('Initiating graph wipe...', 200);

      this.seedService.deleteAllSeedNodes().subscribe({
        next: (res) => {
          this.isDeleting = false;
          this.showToast(res.message || 'All graph nodes cleared.', res.code || 200);
          this.resetForm();
          this.refreshNodesList();
        },
        error: (err: HttpErrorResponse) => {
          this.isDeleting = false;
          this.handleHttpError(err, 'Failed to clear graph data');
        }
      });
    }
  }

  copyToClipboard(text?: string): void {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.showToast(`Copied "${text}" to clipboard!`, 200);
    });
  }

  get filteredNodes(): NodeEntityRequest[] {
    if (!this.searchFilter.trim()) return this.nodesList;
    const q = this.searchFilter.toLowerCase();
    return this.nodesList.filter(n =>
      (n.name && n.name.toLowerCase().includes(q)) ||
      (n.category && n.category.toLowerCase().includes(q)) ||
      (n.entityType && n.entityType.toLowerCase().includes(q)) ||
      (n.id && n.id.toLowerCase().includes(q))
    );
  }

  private resetForm(): void {
    this.name = '';
    this.category = '';
    this.parentId = '';
  }

  private handleHttpError(err: HttpErrorResponse, fallbackMsg: string): void {
    const status = err.status || 500;
    const msg = err.error?.message || err.message || fallbackMsg;
    this.showToast(msg, status);
  }

  private showToast(msg: string, statusCode: number = 200): void {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastMessage = msg;
    this.toastStatusCode = statusCode;
    this.toastType = statusCode >= 400 ? 'error' : 'success';
    this.toastTimeout = setTimeout(() => { this.toastMessage = null; }, 4500);
  }

  ngOnDestroy(): void {
    if (this.notificationSub) this.notificationSub.unsubscribe();
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
  }
}