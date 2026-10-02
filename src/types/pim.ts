export interface RawSupplierRow {
  id?: string;
  mpn: string;
  brand: string;
  vendorName: string;
  purchasePrice?: number | string;
  productName: string;
  uom: string;
  indemedItemId?: string;
  indemedUom?: string;
  mckessonId?: string;
  mckessonUom?: string;
  hcpcs?: string;
  rawAttributes?: string;
  // Optional grouping key if specified by user or raw file
  familyKey?: string;
  [key: string]: any;
}

export type UnitTypeFullName = 
  | "Each"
  | "Box"
  | "Case"
  | "Bag"
  | "Package"
  | "Roll"
  | "Pair"
  | "Bottle"
  | "Vial"
  | "Kit"
  | "Dozen"
  | string;

export interface NormalizedPimRow {
  id: string;
  isParent: boolean;
  isChild: boolean;
  isSingleLineItem: boolean;
  familyId?: string;

  // Exact 25 PIM schema columns
  "SKU": string;
  "Subitem Of": string;
  "MPN": string;
  "Purchase Price": string;
  "BRAND": string;
  "Vendor": string;
  "Product Preferred Vendor": string;
  "PRODUCT NAME": string;
  "Unit Type": string;
  "Uom to Each": string;
  "Stock Description": string;
  "Indemed Item #": string;
  "Indemed UOM": string;
  "Mckesson ID": string;
  "Mckesson UOM": string;
  "Shipping Category": string;
  "Shipping Rate": string;
  "Logo Free Shipping": string;
  "Item Attribute Set": string;
  "G shopping": string;
  "Item Commerce Category": string;
  "Avatax Taxcode": string;
  "Google Product Category": string;
  "Item Manager": string;
  "Category": string;

  // Metadata for UI / audit tracking
  auditNotes?: string[];
  ruleFlags?: {
    isEaExceptionApplied?: boolean;
    isPackagingSuffixApplied?: boolean;
    isUnitTypeFullSpelled?: boolean;
    isIndependenceMedicalRateApplied?: boolean;
    isStrictCategoryMatched?: boolean;
    isFullQuantitySuffixApplied?: boolean;
    isMatrixParentCreated?: boolean;
  };
}

export interface RuleAuditSummary {
  totalRows: number;
  matrixParents: number;
  childVariants: number;
  singleItems: number;
  eaExceptionCount: number;
  packagingSuffixCount: number;
  independenceMedicalCount: number;
  strictCategoryMatches: number;
  nonReferenceCategoryWarnings: number;
}

export interface AutoCategoryMappingResult {
  id: string;
  sku: string;
  mpn: string;
  brand: string;
  productName: string;
  researchedProductType?: string;
  currentCategory: string;
  mappedCategory: string;
  googleProductCategory: string;
  itemCommerceCategory: string;
  confidence: number;
  matchType: string;
  rationale: string;
  isChanged: boolean;
}

