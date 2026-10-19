export type DataFreshnessStatus = 'CURRENT' | 'STALE' | 'UNVERIFIED' | 'EXPIRED';

export interface DataMetadata {
  sourceId: string;
  sourceName: string;
  isAuthoritative: boolean;
  recordId: string;
  version: string;
  lastUpdated: string;
  effectiveFrom: string;
  effectiveUntil: string;
  retrievalTimestamp?: string;
  freshnessStatus: DataFreshnessStatus;
}

export interface ProductVariant {
  sku: string;
  size: string; // e.g. "Queen (78x60)", "King (78x72)", "Single (72x36)"
  dimensions: string;
  thickness: string;
  mrp: number;
  currentPrice: number;
  inStock: boolean;
}

export interface VerifiedProduct {
  id: string;
  slug: string;
  name: string;
  category: 'Mattress' | 'Bed' | 'Recliner' | 'Accessory' | 'Chair';
  tagline: string;
  material: string;
  keyFeatures: string[];
  warrantyYears: number;
  trialNights: number;
  variants: ProductVariant[];
  metadata: DataMetadata;
}

export interface VerifiedOffer {
  id: string;
  code: string;
  title: string;
  description: string;
  discountPercentage?: number;
  flatDiscount?: number;
  applicableProductIds: string[];
  minimumOrderValue: number;
  terms: string[];
  metadata: DataMetadata;
}

export interface EMIOption {
  bank: string;
  tenureMonths: number;
  interestRate: number; // 0 for No-Cost EMI
  monthlyInstallment: number;
  processingFee: number;
  isNoCost: boolean;
}

export interface VerifiedPolicy {
  policyType: 'WARRANTY' | 'TRIAL_AND_RETURN' | 'DELIVERY' | 'PAYMENT';
  title: string;
  summary: string;
  detailedTerms: string[];
  exceptions: string[];
  metadata: DataMetadata;
}

export interface ApprovedFAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  metadata: DataMetadata;
}

export interface BusinessDataResult<T> {
  verified: boolean;
  data?: T;
  error?: string;
  message?: string;
  metadata?: DataMetadata;
}

export interface IBusinessDataProvider {
  searchProducts(query: string, category?: string): Promise<BusinessDataResult<VerifiedProduct[]>>;
  getProductDetails(productId: string): Promise<BusinessDataResult<VerifiedProduct>>;
  getCurrentPrice(productId: string, sizeOrVariant?: string): Promise<BusinessDataResult<{
    productName: string;
    variant: ProductVariant;
    mrp: number;
    currentPrice: number;
    savings: number;
    inStock: boolean;
  }>>;
  getActiveOffers(productId?: string): Promise<BusinessDataResult<VerifiedOffer[]>>;
  getEMIOptions(productId: string, amount?: number): Promise<BusinessDataResult<{
    cartAmount: number;
    eligibleOptions: EMIOption[];
  }>>;
  getWarrantyPolicy(productCategory?: string): Promise<BusinessDataResult<VerifiedPolicy>>;
  getTrialAndReturnPolicy(productCategory?: string): Promise<BusinessDataResult<VerifiedPolicy>>;
  getDeliveryAvailability(pincode: string, productId?: string): Promise<BusinessDataResult<{
    pincode: string;
    deliverable: boolean;
    estimatedDays: number;
    deliveryFee: number;
    codAvailable: boolean;
  }>>;
  getApprovedFAQ(topic: string): Promise<BusinessDataResult<ApprovedFAQ[]>>;

  // Dynamic Cache & Live Synchronization Methods
  invalidateCache(key?: string): void;
  updateProductPrice(productId: string, size: string, newPrice: number): boolean;
  updateOffer(offerId: string, updates: Partial<VerifiedOffer>): boolean;
  resetToDefault(): void;
  getSyncAuditLog(): { timestamp: string; action: string; details: any }[];
}
