export interface ApiResponse {
  message: string;
  code: number;
  success: boolean;
  data?: any;
}

export type ParentEdge = 'ADD' | 'REMOVE' | 'ALREADY_LINKED';

export enum EntityType {
  SUPPLIER = 'Supplier',
  RAW_MATERIAL = 'RawMaterial',
  COMPONENT = 'Component',
  SUB_ASSEMBLY = 'SubAssembly',
  PRODUCT = 'Product'
}

export interface ParentNodeDto {
  parentId?: string;
  parentName?: string;
  parentEdge?: ParentEdge | string;
}

export interface NodeEntityRequest {
  id?: string;
  name?: string;
  category?: string;
  entityType?: EntityType | string;
  parentNodeDto?: ParentNodeDto[];
}

export interface RowError {
  rowNumber: number;
  entityId: string;
  entityType: string;
  errorMessage: string;
}

export interface BatchUploadResult extends ApiResponse {
  totalRows: number;
  successCount: number;
  failureCount: number;
  errors: RowError[];
}

export interface ImpactedProductDto {
  supplierId?: string;
  supplierName?: string;
  rawMaterialId?: string;
  rawMaterialName?: string;
  componentId?: string;
  componentName?: string;
  subAssemblyId?: string;
  subAssemblyName?: string;
  productId: string;
  productName: string;
  depth: number;
}

export interface ImpactedProductResponse extends ApiResponse {
  impactedProductDto: ImpactedProductDto[];
}

export interface SearchResponse {
  id: string;
  name: string;
  category: string;
  entityType: EntityType | string;
}