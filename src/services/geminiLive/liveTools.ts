import { businessDataProvider } from '../businessData/BusinessDataProvider';

export const GEMINI_LIVE_FUNCTION_DECLARATIONS = [
  {
    name: 'searchProducts',
    description:
      'Search for approved products in The Sleep Company store catalogue by keyword, technology, or category (Mattress, Bed, Recliner, Accessory).',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: {
          type: 'STRING',
          description: "Search keyword or product name, e.g. 'ortho', 'luxe', 'bed', 'recliner', 'pillow'"
        },
        category: {
          type: 'STRING',
          description: "Optional product category: 'Mattress', 'Bed', 'Recliner', 'Accessory'"
        }
      },
      required: ['query']
    }
  },
  {
    name: 'getProductDetails',
    description:
      'Retrieve official specifications, materials, warranty, trial terms, and available sizes for a verified product.',
    parameters: {
      type: 'OBJECT',
      properties: {
        productId: {
          type: 'STRING',
          description: "Product ID or slug, e.g. 'ortho-grid', 'smart-luxe', 'elevate-bed', 'ergotech-recliner'"
        }
      },
      required: ['productId']
    }
  },
  {
    name: 'getCurrentPrice',
    description:
      'Retrieve the current verified price, MRP, savings, and stock status for a specific product and size variant. Always invoke this tool before quoting any price to a customer.',
    parameters: {
      type: 'OBJECT',
      properties: {
        productId: {
          type: 'STRING',
          description: "Product ID or name, e.g. 'ortho-grid', 'smart-luxe', 'elevate-bed'"
        },
        sizeOrVariant: {
          type: 'STRING',
          description: "Size or variant, e.g. 'Queen (78x60)', 'King (78x72)', 'Single', or leave empty for base"
        }
      },
      required: ['productId']
    }
  },
  {
    name: 'getActiveOffers',
    description:
      'Retrieve active promotional discounts, coupons, bundle offers, and validity dates for the current billing cycle.',
    parameters: {
      type: 'OBJECT',
      properties: {
        productId: {
          type: 'STRING',
          description: 'Optional product ID to check product-specific offers'
        }
      }
    }
  },
  {
    name: 'getEMIOptions',
    description:
      'Retrieve current 0% interest No-Cost EMI plans, tenure options (3, 6, 9 months), and participating bank eligibility.',
    parameters: {
      type: 'OBJECT',
      properties: {
        productId: {
          type: 'STRING',
          description: 'Product ID to compute EMI plans for'
        },
        amount: {
          type: 'NUMBER',
          description: 'Optional total cart value or price'
        }
      },
      required: ['productId']
    }
  },
  {
    name: 'getWarrantyPolicy',
    description:
      'Retrieve the official 10-year / 5-year warranty terms, sagging depth thresholds, and claim procedures.',
    parameters: {
      type: 'OBJECT',
      properties: {
        productCategory: {
          type: 'STRING',
          description: "Product category: 'Mattress', 'Bed', 'Recliner'"
        }
      }
    }
  },
  {
    name: 'getTrialAndReturnPolicy',
    description:
      'Retrieve the official 100-night risk-free trial terms, 30-night mandatory adaptation period, and free pickup refund policy.',
    parameters: {
      type: 'OBJECT',
      properties: {
        productCategory: {
          type: 'STRING',
          description: "Product category (defaults to 'Mattress')"
        }
      }
    }
  },
  {
    name: 'getDeliveryAvailability',
    description:
      'Check delivery feasibility, estimated arrival days (2-5 business days), and free shipping eligibility for a customer PIN code in India.',
    parameters: {
      type: 'OBJECT',
      properties: {
        pincode: {
          type: 'STRING',
          description: '6-digit Indian PIN code, e.g. 560034'
        },
        productId: {
          type: 'STRING',
          description: 'Optional product ID'
        }
      },
      required: ['pincode']
    }
  },
  {
    name: 'getApprovedFAQ',
    description:
      'Retrieve approved answers to common questions about SmartGRID technology, comparisons with memory foam, and Bengaluru experience centers.',
    parameters: {
      type: 'OBJECT',
      properties: {
        topic: {
          type: 'STRING',
          description: "Topic keyword, e.g. 'smartgrid', 'memory foam', 'stores', 'cleaning'"
        }
      },
      required: ['topic']
    }
  }
];

export async function dispatchLiveToolCall(
  name: string,
  args: Record<string, any>
): Promise<{ output: any; logSummary: string }> {
  console.log(`[GeminiLive:ToolDispatch] Executing tool: ${name}`, args);

  switch (name) {
    case 'searchProducts': {
      const res = await businessDataProvider.searchProducts(args.query, args.category);
      return {
        output: res,
        logSummary: `Searched products for '${args.query}' -> ${res.data?.length || 0} results`
      };
    }

    case 'getProductDetails': {
      const res = await businessDataProvider.getProductDetails(args.productId);
      return {
        output: res,
        logSummary: `Fetched product details for '${args.productId}' (Verified: ${res.verified})`
      };
    }

    case 'getCurrentPrice': {
      const res = await businessDataProvider.getCurrentPrice(args.productId, args.sizeOrVariant);
      return {
        output: res,
        logSummary: res.verified
          ? `Verified price for ${res.data?.productName} (${res.data?.variant.size}): ₹${res.data?.currentPrice} (v${res.metadata?.version})`
          : `Unverified price for '${args.productId}'`
      };
    }

    case 'getActiveOffers': {
      const res = await businessDataProvider.getActiveOffers(args.productId);
      return {
        output: res,
        logSummary: `Retrieved ${res.data?.length || 0} active offer(s) (v${res.metadata?.version})`
      };
    }

    case 'getEMIOptions': {
      const res = await businessDataProvider.getEMIOptions(args.productId, args.amount);
      return {
        output: res,
        logSummary: `Retrieved ${res.data?.eligibleOptions.length || 0} EMI options for ₹${res.data?.cartAmount}`
      };
    }

    case 'getWarrantyPolicy': {
      const res = await businessDataProvider.getWarrantyPolicy(args.productCategory);
      return {
        output: res,
        logSummary: `Retrieved Warranty Policy: ${res.data?.title}`
      };
    }

    case 'getTrialAndReturnPolicy': {
      const res = await businessDataProvider.getTrialAndReturnPolicy(args.productCategory);
      return {
        output: res,
        logSummary: `Retrieved Trial & Return Policy: ${res.data?.title}`
      };
    }

    case 'getDeliveryAvailability': {
      const res = await businessDataProvider.getDeliveryAvailability(args.pincode, args.productId);
      return {
        output: res,
        logSummary: `Checked delivery for PIN ${args.pincode}: Deliverable=${res.data?.deliverable}`
      };
    }

    case 'getApprovedFAQ': {
      const res = await businessDataProvider.getApprovedFAQ(args.topic);
      return {
        output: res,
        logSummary: `Looked up FAQ for topic '${args.topic}' -> ${res.data?.length || 0} FAQ item(s)`
      };
    }

    default: {
      console.warn(`[GeminiLive:ToolDispatch] Unknown tool name: ${name}`);
      return {
        output: {
          verified: false,
          error: 'UNKNOWN_TOOL',
          message: `The tool '${name}' is not recognized in this environment.`
        },
        logSummary: `Unknown tool requested: ${name}`
      };
    }
  }
}
