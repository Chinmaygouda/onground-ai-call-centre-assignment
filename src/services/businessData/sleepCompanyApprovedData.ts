import { VerifiedProduct, VerifiedOffer, VerifiedPolicy, ApprovedFAQ } from './types';

const COMMON_METADATA_TEMPLATE = {
  sourceId: 'the-sleep-company-approved-store-v2026',
  sourceName: 'The Sleep Company Verified Store Catalogue',
  isAuthoritative: true,
  version: '2026.10.1',
  lastUpdated: '2026-10-19T08:00:00Z',
  effectiveFrom: '2026-10-01T00:00:00Z',
  effectiveUntil: '2026-10-31T23:59:59Z',
  freshnessStatus: 'CURRENT' as const
};

export const INITIAL_APPROVED_PRODUCTS: VerifiedProduct[] = [
  {
    id: 'ortho-grid',
    slug: 'smartgrid-ortho-mattress',
    name: 'SmartGRID Ortho Mattress',
    category: 'Mattress',
    tagline: 'Patented Japanese SmartGRID Technology for Doctor-Approved Orthopedic Back Support',
    material: 'Patented Food-Grade SmartGRID Hyper-Elastic Polymer + High Resilience Ortho Base Foam',
    keyFeatures: [
      '2500+ air channels for ultra-breathable body cooling',
      'Medium-firm orthopedic firmness endorsed by spine specialists',
      'Smart ergonomic spine alignment with intelligent weight distribution',
      'Zero partner motion disturbance'
    ],
    warrantyYears: 10,
    trialNights: 100,
    variants: [
      {
        sku: 'TSC-OG-Q-7860-6',
        size: 'Queen (78x60)',
        dimensions: '78 x 60 inches (198 x 152 cm)',
        thickness: '6 inches (15.2 cm)',
        mrp: 14999,
        currentPrice: 8490,
        inStock: true
      },
      {
        sku: 'TSC-OG-K-7872-6',
        size: 'King (78x72)',
        dimensions: '78 x 72 inches (198 x 183 cm)',
        thickness: '6 inches (15.2 cm)',
        mrp: 18999,
        currentPrice: 10990,
        inStock: true
      },
      {
        sku: 'TSC-OG-S-7236-6',
        size: 'Single (72x36)',
        dimensions: '72 x 36 inches (183 x 91 cm)',
        thickness: '6 inches (15.2 cm)',
        mrp: 9999,
        currentPrice: 5990,
        inStock: true
      }
    ],
    metadata: {
      ...COMMON_METADATA_TEMPLATE,
      recordId: 'PROD-ORTHO-GRID'
    }
  },
  {
    id: 'smart-luxe',
    slug: 'smartgrid-luxe-mattress',
    name: 'SmartGRID Luxe Mattress',
    category: 'Mattress',
    tagline: '5-Star Hotel Ultra-Plush Comfort with Dual Layer SmartGRID Support',
    material: 'SmartGRID Hyper-Elastic Polymer + 100% Organic Cotton Viscose Cover + High-Density Comfort Core',
    keyFeatures: [
      'Cloud-like plush luxury comfort with adaptive body contouring',
      'Euro-top quilted finish with European aesthetics',
      'Dual-zone temperature dissipation',
      'Hypoallergenic, dust-mite and anti-fungal treatment'
    ],
    warrantyYears: 10,
    trialNights: 100,
    variants: [
      {
        sku: 'TSC-LX-Q-7860-8',
        size: 'Queen (78x60)',
        dimensions: '78 x 60 inches (198 x 152 cm)',
        thickness: '8 inches (20.3 cm)',
        mrp: 22999,
        currentPrice: 13390,
        inStock: true
      },
      {
        sku: 'TSC-LX-K-7872-8',
        size: 'King (78x72)',
        dimensions: '78 x 72 inches (198 x 183 cm)',
        thickness: '8 inches (20.3 cm)',
        mrp: 27999,
        currentPrice: 16990,
        inStock: true
      }
    ],
    metadata: {
      ...COMMON_METADATA_TEMPLATE,
      recordId: 'PROD-SMART-LUXE'
    }
  },
  {
    id: 'elevate-bed',
    slug: 'elevate-smart-adjustable-bed',
    name: 'Elevate Smart Adjustable Bed',
    category: 'Bed',
    tagline: 'Motorized Ergonomic Reclining Frame with Zero-Gravity Preset and Wireless Remote',
    material: 'Reinforced Carbon Structural Steel Frame + Dual Silent German Motors + Fabric Upholstery',
    keyFeatures: [
      'Dual independent head and foot motorized incline controls',
      'One-touch Zero-Gravity, Anti-Snore, and TV viewing presets',
      'Compatible with SmartGRID Ortho and Luxe mattresses',
      'Built-in USB under-bed charging ports'
    ],
    warrantyYears: 5,
    trialNights: 30,
    variants: [
      {
        sku: 'TSC-ELV-Q-7860',
        size: 'Queen (78x60)',
        dimensions: '78 x 60 inches',
        thickness: 'Adjustable frame height: 12-16 inches',
        mrp: 39999,
        currentPrice: 24990,
        inStock: true
      },
      {
        sku: 'TSC-ELV-K-7872',
        size: 'King (78x72)',
        dimensions: '78 x 72 inches',
        thickness: 'Adjustable frame height: 12-16 inches',
        mrp: 47999,
        currentPrice: 29990,
        inStock: true
      }
    ],
    metadata: {
      ...COMMON_METADATA_TEMPLATE,
      recordId: 'PROD-ELEVATE-BED'
    }
  },
  {
    id: 'ergotech-recliner',
    slug: 'ergotech-stylux-recliner',
    name: 'Stylux Ergonomic Recliner Chair',
    category: 'Recliner',
    tagline: 'Multi-Position SmartGRID Recliner with Dual Lumbar Support',
    material: 'Breathable Chenille Microfiber Fabric + High-Grade Steel Mechanism + SmartGRID Seat Cushion',
    keyFeatures: [
      '3-position recline: 90° Work, 120° Reading, 160° Power Nap',
      'Embedded SmartGRID seat cushion for zero tailbone fatigue',
      'Integrated heavy-duty cup holder and side gadget pouch'
    ],
    warrantyYears: 5,
    trialNights: 0,
    variants: [
      {
        sku: 'TSC-REC-GRY',
        size: 'Standard Single Seater',
        dimensions: '38 x 36 x 41 inches',
        thickness: 'Seat depth 22 inches',
        mrp: 32999,
        currentPrice: 19990,
        inStock: true
      }
    ],
    metadata: {
      ...COMMON_METADATA_TEMPLATE,
      recordId: 'PROD-ERGOTECH-RECLINER'
    }
  },
  {
    id: 'contour-pillow',
    slug: 'smart-ergonomic-contour-pillow',
    name: 'Smart Ergonomic Contour Pillow',
    category: 'Accessory',
    tagline: 'Cervical Spine Therapeutic Support with Cooling SmartGRID Mesh',
    material: 'High-Density Memory Foam Core + SmartGRID Layer + Washable Bamboo Viscose Cover',
    keyFeatures: [
      'Dual height contour curves (10cm and 12cm) for side and back sleepers',
      'Dissipates trapped head heat during sleep',
      'Certified cervical spine alignment'
    ],
    warrantyYears: 1,
    trialNights: 0,
    variants: [
      {
        sku: 'TSC-PLW-STD',
        size: 'Standard (24x15 inches)',
        dimensions: '24 x 15 x 4.5 inches',
        thickness: '4.5 inches',
        mrp: 3999,
        currentPrice: 2499,
        inStock: true
      }
    ],
    metadata: {
      ...COMMON_METADATA_TEMPLATE,
      recordId: 'PROD-CONTOUR-PILLOW'
    }
  }
];

export const INITIAL_APPROVED_OFFERS: VerifiedOffer[] = [
  {
    id: 'OFFER-OCT-FEST',
    code: 'FESTIVE1000',
    title: 'October Festive Sleeping Bonus',
    description: 'Flat ₹1,000 instant discount on orders above ₹10,000',
    flatDiscount: 1000,
    applicableProductIds: ['ortho-grid', 'smart-luxe', 'elevate-bed', 'ergotech-recliner'],
    minimumOrderValue: 10000,
    terms: [
      'Valid until 31 October 2026',
      'Applicable on all prepaid orders (Credit Card, UPI, Netbanking)',
      'Combinable with 0% interest No-Cost EMI'
    ],
    metadata: {
      ...COMMON_METADATA_TEMPLATE,
      recordId: 'OFFER-FESTIVE1000'
    }
  },
  {
    id: 'OFFER-BED-BUNDLE',
    code: 'COMBOPILLOW',
    title: 'Free Contour Pillow with Luxe Mattress',
    description: 'Complimentary Smart Ergonomic Contour Pillow (worth ₹2,499) with any SmartGRID Luxe Mattress purchase',
    applicableProductIds: ['smart-luxe'],
    minimumOrderValue: 13000,
    terms: [
      'Auto-applied at checkout for Luxe mattress variants',
      'Non-transferable for cash value'
    ],
    metadata: {
      ...COMMON_METADATA_TEMPLATE,
      recordId: 'OFFER-COMBOPILLOW'
    }
  }
];

export const INITIAL_APPROVED_POLICIES: VerifiedPolicy[] = [
  {
    policyType: 'WARRANTY',
    title: '10-Year Peace of Mind Limited Warranty',
    summary: 'Comprehensive 10-year warranty on all SmartGRID mattresses covering manufacturing defects and structural sagging greater than 1 inch.',
    detailedTerms: [
      'Years 1 to 5: 100% full replacement or repair at zero cost to the customer.',
      'Years 6 to 10: Pro-rata repair or replacement credit based on age of mattress.',
      'Covered: Sagging or body impressions deeper than 1 inch (2.54 cm), fabric stitching splits under normal usage, polymer grid breakage.',
      'Motorized Beds: 5-year warranty on electric motors, frame, and remote control.'
    ],
    exceptions: [
      'Damage caused by improper base support (slats wider than 3 inches apart without center beam).',
      'Burns, liquid stains, or intentional misuse.',
      'Comfort preference changes after the 100-night trial period has lapsed.'
    ],
    metadata: {
      ...COMMON_METADATA_TEMPLATE,
      recordId: 'POLICY-WARRANTY'
    }
  },
  {
    policyType: 'TRIAL_AND_RETURN',
    title: '100-Night Risk-Free In-Home Trial Policy',
    summary: 'Sleep on your mattress for up to 100 nights in your own home. If your back does not love it, we arrange free doorstep pickup and issue a 100% full refund.',
    detailedTerms: [
      'Mandatory Adaptation Period: A minimum of 30 nights of usage is required before initiating a return, allowing your spine and posture to adapt to the orthopedic grid.',
      'Pickup Process: Free doorstep reverse-pickup coordinated by The Sleep Company logistics team.',
      'Refund Timeline: 100% full money-back refund processed to the original payment method within 5-7 business days of pickup verification.',
      'Mattress Condition: Must be clean and free from permanent stains, tears, or liquid contamination (using a mattress protector is strongly recommended).'
    ],
    exceptions: [
      'Customized or non-standard mattress dimensions are non-returnable.',
      'Pillows, bed frames, and recliner chairs are covered by warranty only and do not include the 100-night trial.'
    ],
    metadata: {
      ...COMMON_METADATA_TEMPLATE,
      recordId: 'POLICY-TRIAL'
    }
  },
  {
    policyType: 'DELIVERY',
    title: 'Free Pan-India Doorstep White-Glove Delivery',
    summary: 'Complimentary insured shipping to 18,000+ PIN codes across India within 3 to 5 business days.',
    detailedTerms: [
      'Metro cities (Bengaluru, Mumbai, Delhi-NCR, Hyderabad, Chennai): 48 to 72 hours express delivery.',
      'Tier 2 & 3 cities: 4 to 6 business days.',
      'Delivery fee: 100% Free on all mattress and bed orders.',
      'Cash on Delivery (COD) available up to ₹15,000 cart value; orders above ₹15,000 require prepaid confirmation.'
    ],
    exceptions: [
      'Extreme remote locations (remote islands, high-altitude border zones) may incur supplementary logistics transit fees.'
    ],
    metadata: {
      ...COMMON_METADATA_TEMPLATE,
      recordId: 'POLICY-DELIVERY'
    }
  }
];

export const INITIAL_APPROVED_FAQS: ApprovedFAQ[] = [
  {
    id: 'FAQ-SMARTGRID',
    question: 'How is SmartGRID different from standard Memory Foam or Latex?',
    answer: 'Traditional Memory Foam absorbs body heat and sinks continuously, trapping your spine in a hot cavity. SmartGRID is made of food-grade Japanese hyper-elastic polymer that does not trap heat. Its 2,500+ air channels keep airflow continuous, and its patented structure collapses only at pressure points (shoulders and hips) while firmly supporting the lower lumbar spine.',
    category: 'Product Technology',
    metadata: {
      ...COMMON_METADATA_TEMPLATE,
      recordId: 'FAQ-SMARTGRID'
    }
  },
  {
    id: 'FAQ-STORES',
    question: 'Where can I test the mattresses in person in Bengaluru?',
    answer: 'The Sleep Company operates official Experience Centers in Bengaluru at Koramangala (100ft Road), Indiranagar (12th Main), Whitefield (Phoenix Marketcity), and Jayanagar (4th Block). Experience centers are open 7 days a week from 10:30 AM to 8:30 PM.',
    category: 'Store Locations',
    metadata: {
      ...COMMON_METADATA_TEMPLATE,
      recordId: 'FAQ-STORES'
    }
  }
];
