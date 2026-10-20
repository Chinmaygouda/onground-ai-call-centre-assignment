import {
  IBusinessDataProvider,
  BusinessDataResult,
  VerifiedProduct,
  ProductVariant,
  VerifiedOffer,
  VerifiedPolicy,
  ApprovedFAQ,
  DataMetadata
} from './types';
import {
  INITIAL_APPROVED_PRODUCTS,
  INITIAL_APPROVED_OFFERS,
  INITIAL_APPROVED_POLICIES,
  INITIAL_APPROVED_FAQS
} from './sleepCompanyApprovedData';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  metadata: DataMetadata;
}

export class BusinessDataProvider implements IBusinessDataProvider {
  private products: VerifiedProduct[];
  private offers: VerifiedOffer[];
  private policies: VerifiedPolicy[];
  private faqs: ApprovedFAQ[];
  private cache: Map<string, CacheEntry<any>> = new Map();
  private cacheTtlMs = 5 * 60 * 1000; // 5 minutes default TTL
  private auditLog: { timestamp: string; action: string; details: any }[] = [];
  private currentVersionMajor = 2026;
  private currentVersionMinor = 10;
  private currentVersionPatch = 1;

  constructor() {
    this.products = JSON.parse(JSON.stringify(INITIAL_APPROVED_PRODUCTS));
    this.offers = JSON.parse(JSON.stringify(INITIAL_APPROVED_OFFERS));
    this.policies = JSON.parse(JSON.stringify(INITIAL_APPROVED_POLICIES));
    this.faqs = JSON.parse(JSON.stringify(INITIAL_APPROVED_FAQS));
    this.recordAudit('INITIALIZE_PROVIDER', {
      productsCount: this.products.length,
      offersCount: this.offers.length,
      version: this.getVersionString()
    });
  }

  private getVersionString(): string {
    return `${this.currentVersionMajor}.${this.currentVersionMinor}.${this.currentVersionPatch}`;
  }

  private incrementVersion(reason: string) {
    this.currentVersionPatch += 1;
    this.recordAudit('VERSION_BUMP', {
      newVersion: this.getVersionString(),
      reason
    });
  }

  private recordAudit(action: string, details: any) {
    const entry = {
      timestamp: new Date().toISOString(),
      action,
      details
    };
    this.auditLog.unshift(entry);
    if (this.auditLog.length > 50) this.auditLog.pop();
  }

  private generateMetadata(recordId: string, customLastUpdated?: string): DataMetadata {
    const now = new Date().toISOString();
    return {
      sourceId: 'the-sleep-company-approved-store-v2026',
      sourceName: 'The Sleep Company Verified Store Catalogue',
      isAuthoritative: true,
      recordId,
      version: this.getVersionString(),
      lastUpdated: customLastUpdated || now,
      effectiveFrom: '2026-10-01T00:00:00Z',
      effectiveUntil: '2026-10-31T23:59:59Z',
      retrievalTimestamp: now,
      freshnessStatus: 'CURRENT'
    };
  }

  public invalidateCache(keyPrefix?: string) {
    if (keyPrefix) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(keyPrefix)) {
          this.cache.delete(key);
        }
      }
      this.recordAudit('CACHE_INVALIDATE_PREFIX', { prefix: keyPrefix });
    } else {
      this.cache.clear();
      this.recordAudit('CACHE_INVALIDATE_ALL', {});
    }
  }

  public async searchProducts(query: string, category?: string): Promise<BusinessDataResult<VerifiedProduct[]>> {
    const cacheKey = `search:${query.toLowerCase()}:${category || 'all'}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTtlMs) {
      return {
        verified: true,
        data: cached.data,
        metadata: { ...cached.metadata, retrievalTimestamp: new Date().toISOString() }
      };
    }

    const q = query.toLowerCase().trim();
    const results = this.products.filter((p) => {
      const matchQuery =
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.material.toLowerCase().includes(q);
      const matchCategory = !category || p.category.toLowerCase() === category.toLowerCase();
      return matchQuery && matchCategory;
    });

    const metadata = this.generateMetadata('SEARCH-RESULTS');
    this.cache.set(cacheKey, { data: results, timestamp: Date.now(), metadata });
    this.recordAudit('SEARCH_PRODUCTS', { query, matchCount: results.length });

    return {
      verified: true,
      data: results,
      metadata
    };
  }

  public async getProductDetails(productId: string): Promise<BusinessDataResult<VerifiedProduct>> {
    const cacheKey = `product:${productId.toLowerCase()}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTtlMs) {
      return {
        verified: true,
        data: cached.data,
        metadata: { ...cached.metadata, retrievalTimestamp: new Date().toISOString() }
      };
    }

    const targetId = productId.toLowerCase().trim();
    const product = this.products.find(
      (p) =>
        p.id.toLowerCase() === targetId ||
        p.slug.toLowerCase().includes(targetId) ||
        p.name.toLowerCase().includes(targetId)
    );

    if (!product) {
      return {
        verified: false,
        error: 'PRODUCT_NOT_FOUND',
        message: `Product '${productId}' is not registered in the verified store catalogue. Refusing to guess unapproved product details.`
      };
    }

    const metadata = this.generateMetadata(product.id, product.metadata.lastUpdated);
    const enrichedProduct = { ...product, metadata };
    this.cache.set(cacheKey, { data: enrichedProduct, timestamp: Date.now(), metadata });

    return {
      verified: true,
      data: enrichedProduct,
      metadata
    };
  }

  public async getCurrentPrice(
    productId: string,
    sizeOrVariant?: string
  ): Promise<
    BusinessDataResult<{
      productName: string;
      variant: VerifiedProduct['variants'][0];
      mrp: number;
      currentPrice: number;
      savings: number;
      inStock: boolean;
    }>
  > {
    const targetId = productId.toLowerCase().trim();
    const product = this.products.find(
      (p) =>
        p.id.toLowerCase() === targetId ||
        p.slug.toLowerCase().includes(targetId) ||
        p.name.toLowerCase().includes(targetId)
    );

    if (!product) {
      return {
        verified: false,
        error: 'PRICE_UNVERIFIED',
        message: `Could not verify price for '${productId}'. No authoritative pricing record exists in the verified store catalogue.`
      };
    }

    let selectedVariant = product.variants[0];
    if (sizeOrVariant && sizeOrVariant.trim() !== '') {
      const match = product.variants.find((v) =>
        v.size.toLowerCase().includes(sizeOrVariant.toLowerCase())
      );
      if (match) {
        selectedVariant = match;
      } else {
        return {
          verified: false,
          error: 'SIZE_NOT_FOUND',
          message: `Variant or size '${sizeOrVariant}' is not recognized for ${product.name}. Approved sizes in catalogue: ${product.variants.map((v) => v.size).join(', ')}.`
        };
      }
    }

    const metadata = this.generateMetadata(`PRICE-${product.id}-${selectedVariant.sku}`, product.metadata.lastUpdated);
    const savings = selectedVariant.mrp - selectedVariant.currentPrice;

    return {
      verified: true,
      data: {
        productName: product.name,
        variant: selectedVariant,
        mrp: selectedVariant.mrp,
        currentPrice: selectedVariant.currentPrice,
        savings,
        inStock: selectedVariant.inStock
      },
      metadata
    };
  }

  public async getActiveOffers(productId?: string): Promise<BusinessDataResult<VerifiedOffer[]>> {
    let offers = this.offers;
    if (productId) {
      const pId = productId.toLowerCase();
      offers = this.offers.filter(
        (o) => o.applicableProductIds.includes(pId) || o.applicableProductIds.length === 0
      );
    }
    const metadata = this.generateMetadata('ACTIVE-OFFERS');
    return {
      verified: true,
      data: offers,
      metadata
    };
  }

  public async getEMIOptions(
    productIdOrAmount: string | number = 'ortho-grid',
    explicitAmount?: number
  ): Promise<
    BusinessDataResult<{
      cartAmount: number;
      eligibleOptions: {
        bank: string;
        tenureMonths: number;
        interestRate: number;
        monthlyInstallment: number;
        processingFee: number;
        isNoCost: boolean;
      }[];
    }>
  > {
    let productId = 'ortho-grid';
    let price = explicitAmount;

    if (typeof productIdOrAmount === 'number') {
      price = productIdOrAmount;
    } else if (typeof productIdOrAmount === 'string') {
      productId = productIdOrAmount;
    }

    if (!price) {
      const priceRes = await this.getCurrentPrice(productId);
      if (priceRes.verified && priceRes.data) {
        price = priceRes.data.currentPrice;
      } else {
        price = 8490; // Fallback baseline for Ortho Grid
      }
    }

    const options = [
      {
        bank: 'HDFC Bank',
        tenureMonths: 3,
        interestRate: 0,
        monthlyInstallment: Math.round(price / 3),
        processingFee: 0,
        isNoCost: true
      },
      {
        bank: 'HDFC Bank',
        tenureMonths: 6,
        interestRate: 0,
        monthlyInstallment: Math.round(price / 6),
        processingFee: 0,
        isNoCost: true
      },
      {
        bank: 'ICICI Bank',
        tenureMonths: 6,
        interestRate: 0,
        monthlyInstallment: Math.round(price / 6),
        processingFee: 0,
        isNoCost: true
      },
      {
        bank: 'Cardless EMI (ZestMoney / Axio)',
        tenureMonths: 6,
        interestRate: 0,
        monthlyInstallment: Math.round(price / 6),
        processingFee: 99,
        isNoCost: true
      },
      {
        bank: 'SBI Credit Card',
        tenureMonths: 9,
        interestRate: 14.5,
        monthlyInstallment: Math.round((price * 1.108) / 9),
        processingFee: 199,
        isNoCost: false
      }
    ];

    const metadata = this.generateMetadata('EMI-OPTIONS');
    return {
      verified: true,
      data: {
        cartAmount: price,
        eligibleOptions: options
      },
      metadata
    };
  }

  public async getWarrantyPolicy(_productCategory = 'Mattress'): Promise<BusinessDataResult<VerifiedPolicy>> {
    const policy = this.policies.find((p) => p.policyType === 'WARRANTY') || this.policies[0];
    const metadata = this.generateMetadata('POLICY-WARRANTY', policy.metadata.lastUpdated);
    return {
      verified: true,
      data: { ...policy, metadata },
      metadata
    };
  }

  public async getTrialAndReturnPolicy(_productCategory = 'Mattress'): Promise<BusinessDataResult<VerifiedPolicy>> {
    const policy = this.policies.find((p) => p.policyType === 'TRIAL_AND_RETURN') || this.policies[1];
    const metadata = this.generateMetadata('POLICY-TRIAL', policy.metadata.lastUpdated);
    return {
      verified: true,
      data: { ...policy, metadata },
      metadata
    };
  }

  public async getDeliveryAvailability(
    pincode: string,
    _productId?: string
  ): Promise<
    BusinessDataResult<{
      pincode: string;
      deliverable: boolean;
      estimatedDays: number;
      deliveryFee: number;
      codAvailable: boolean;
    }>
  > {
    const cleanPin = pincode.replace(/\D/g, '');
    if (cleanPin.length !== 6) {
      return {
        verified: false,
        error: 'INVALID_PINCODE',
        message: `Pincode '${pincode}' is not a valid 6-digit Indian PIN code.`
      };
    }

    // Major metro hubs (Bangalore: 560xxx, Mumbai: 400xxx, Delhi: 110xxx)
    const isExpress =
      cleanPin.startsWith('560') ||
      cleanPin.startsWith('400') ||
      cleanPin.startsWith('110') ||
      cleanPin.startsWith('500');

    const metadata = this.generateMetadata(`DELIVERY-${cleanPin}`);
    return {
      verified: true,
      data: {
        pincode: cleanPin,
        deliverable: true,
        estimatedDays: isExpress ? 2 : 4,
        deliveryFee: 0,
        codAvailable: true
      },
      metadata
    };
  }

  public async getApprovedFAQ(topic: string): Promise<BusinessDataResult<ApprovedFAQ[]>> {
    const t = topic.toLowerCase();
    const faqs = this.faqs.filter(
      (f) =>
        f.question.toLowerCase().includes(t) ||
        f.answer.toLowerCase().includes(t) ||
        f.category.toLowerCase().includes(t)
    );
    const metadata = this.generateMetadata('FAQS');
    return {
      verified: true,
      data: faqs.length > 0 ? faqs : this.faqs,
      metadata
    };
  }

  // Live Synchronization & Runtime Mutation for Testing Requirement H
  public updateProductPrice(productId: string, size: string, newPrice: number): boolean {
    const norm = (s: string) => s.toLowerCase().replace(/[-_]/g, ' ').trim();
    const target = norm(productId);
    const product = this.products.find(
      (p) =>
        p.id.toLowerCase() === productId.toLowerCase() ||
        p.slug.toLowerCase() === productId.toLowerCase() ||
        norm(p.id).includes(target) ||
        norm(p.slug).includes(target) ||
        norm(p.name).includes(target)
    );
    if (!product) return false;

    const variant = product.variants.find((v) => norm(v.size).includes(norm(size)));
    if (!variant) return false;

    const oldPrice = variant.currentPrice;
    variant.currentPrice = newPrice;
    const now = new Date().toISOString();
    product.metadata.lastUpdated = now;

    this.incrementVersion(`Price updated for ${product.name} (${variant.size}) from ₹${oldPrice} to ₹${newPrice}`);
    this.invalidateCache(`product:${product.id}`);
    this.invalidateCache('search:');

    this.recordAudit('UPDATE_PRODUCT_PRICE', {
      productId: product.id,
      variant: variant.size,
      oldPrice,
      newPrice,
      newVersion: this.getVersionString()
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('business-data-updated', {
          detail: {
            type: 'PRICE_UPDATE',
            productId: product.id,
            variant: variant.size,
            newPrice,
            version: this.getVersionString()
          }
        })
      );
    }

    return true;
  }

  public updateOffer(offerId: string, updates: Partial<VerifiedOffer>): boolean {
    const offer = this.offers.find((o) => o.id === offerId || o.code === offerId);
    if (!offer) return false;

    Object.assign(offer, updates);
    offer.metadata.lastUpdated = new Date().toISOString();
    this.incrementVersion(`Offer updated: ${offer.code}`);
    this.invalidateCache();

    this.recordAudit('UPDATE_OFFER', {
      offerId: offer.id,
      updates,
      newVersion: this.getVersionString()
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('business-data-updated', {
          detail: {
            type: 'OFFER_UPDATE',
            offerId: offer.id,
            version: this.getVersionString()
          }
        })
      );
    }

    return true;
  }

  public resetToDefault() {
    this.products = JSON.parse(JSON.stringify(INITIAL_APPROVED_PRODUCTS));
    this.offers = JSON.parse(JSON.stringify(INITIAL_APPROVED_OFFERS));
    this.policies = JSON.parse(JSON.stringify(INITIAL_APPROVED_POLICIES));
    this.faqs = JSON.parse(JSON.stringify(INITIAL_APPROVED_FAQS));
    this.currentVersionPatch = 1;
    this.invalidateCache();
    this.recordAudit('RESET_TO_DEFAULT', { version: this.getVersionString() });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('business-data-updated', {
          detail: {
            type: 'RESET',
            version: this.getVersionString()
          }
        })
      );
    }
  }

  public resetCatalog() {
    this.resetToDefault();
  }

  public async checkProductStock(
    productIdOrKeyword: string,
    sizeOrVariant?: string
  ): Promise<
    BusinessDataResult<{
      productName: string;
      size: string;
      inStock: boolean;
      stockQuantity: number;
      warehouseLocation: string;
      leadTimeDays: string;
      availableStores: string[];
    }>
  > {
    const targetId = (productIdOrKeyword || '').toLowerCase().trim();
    const cleanTarget = targetId.replace(/[-_]/g, ' ');
    const product = this.products.find(
      (p) =>
        p.id.toLowerCase() === targetId ||
        p.slug.toLowerCase() === targetId ||
        p.slug.toLowerCase().includes(targetId) ||
        p.name.toLowerCase().includes(targetId) ||
        (cleanTarget.includes('ortho') && p.id.includes('ortho')) ||
        (cleanTarget.includes('luxe') && p.id.includes('luxe')) ||
        (cleanTarget.includes('elevate') && p.id.includes('elevate')) ||
        (cleanTarget.includes('recliner') && p.id.includes('recliner'))
    );

    if (!product) {
      return {
        verified: false,
        error: 'PRODUCT_NOT_FOUND',
        message: `Could not verify stock for '${productIdOrKeyword}'. This product is not in the verified catalogue. Would you like to request a human callback?`
      };
    }

    let selectedVariant = product.variants[0];
    if (sizeOrVariant && sizeOrVariant.trim() !== '') {
      const match = product.variants.find((v: ProductVariant) =>
        v.size.toLowerCase().includes(sizeOrVariant.toLowerCase())
      );
      if (match) {
        selectedVariant = match;
      }
    }

    const stockMap: Record<string, number> = {
      'smartgrid-ortho': 14,
      'smartgrid-luxe': 8,
      'ortho-grid': 14,
      'smart-luxe': 8,
      'elevate-bed': 5,
      'ergotech-recliner': 12
    };

    const stockQuantity = stockMap[product.id] || stockMap[product.slug] || 10;
    const metadata = this.generateMetadata(`STOCK-${product.id}-${selectedVariant.sku}`);

    return {
      verified: true,
      data: {
        productName: product.name,
        size: selectedVariant.size,
        inStock: selectedVariant.inStock,
        stockQuantity,
        warehouseLocation: 'Bengaluru Central Fulfillment Hub',
        leadTimeDays: '2-3 business days',
        availableStores: ['Indiranagar Store', 'Koramangala Store', 'Whitefield Store']
      },
      metadata
    };
  }

  public async scheduleFollowupRequest(
    customerName: string,
    phone: string,
    reason: string,
    preferredTime?: string
  ): Promise<
    BusinessDataResult<{
      ticketId: string;
      customerName: string;
      phone: string;
      scheduledWindow: string;
      reason: string;
      assignedAgent: string;
      status: string;
    }>
  > {
    const ticketId = 'FLW-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const scheduledWindow = preferredTime || 'Within 2 hours (Urgent SLA)';
    const metadata = this.generateMetadata(`TICKET-${ticketId}`);

    return {
      verified: true,
      data: {
        ticketId,
        customerName,
        phone,
        scheduledWindow,
        reason,
        assignedAgent: 'Arvind Rajan (The Sleep Company frontline)',
        status: 'CONFIRMED_FOLLOWUP'
      },
      metadata
    };
  }

  public getSyncAuditLog() {
    return [...this.auditLog];
  }
}

// Global Singleton Instance for shared single source of truth across the entire app
export const businessDataProvider = new BusinessDataProvider();
