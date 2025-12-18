// Helper utilities for Shopify Product Scraper
import { Actor } from 'apify';
import { gotScraping } from 'got-scraping';
import { load } from 'cheerio';

const { log } = Actor;

/**
 * Remove the GUID from Shopify IDs
 * @param {string} str
 */
export const removeGuid = (str) => {
    return +`${str}`.replace(/^gid:\/\/shopify\/[^\/]+\//, '');
};

/**
 * Convert property name to snake_case
 * @param {string} str
 */
export const toSnakeCase = (str) => {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
};

/**
 * Safe ISO date conversion
 * @param {string} date
 */
export const safeIsoDate = (date) => {
    try {
        return new Date(date).toISOString();
    } catch (e) {
        return null;
    }
};

/**
 * Normalize Shopify store URL
 * @param {string} url
 */
export const normalizeShopifyUrl = (url) => {
    try {
        const parsed = new URL(url);
        return `${parsed.protocol}//${parsed.hostname}`;
    } catch {
        return url.startsWith('http') ? url : `https://${url}`;
    }
};

/**
 * Extract base domain from URL
 * @param {string} url
 */
export const getBaseDomain = (url) => {
    try {
        const parsed = new URL(url);
        return `${parsed.protocol}//${parsed.hostname}`;
    } catch {
        return null;
    }
};

/**
 * Clean text from HTML
 * @param {string} html
 */
export const cleanText = (html) => {
    if (!html) return '';
    const $ = load(html);
    $('script, style, noscript, iframe').remove();
    return $.root().text().replace(/\s+/g, ' ').trim();
};

/**
 * Remove query string from URL
 * @param {string} url
 */
export const removeUrlQueryString = (url) => `${url}`.split('?', 2)[0];

/**
 * Create unique non-empty array
 * @param {any[]} arr
 */
export const uniqueNonEmptyArray = (arr) => [...new Set([...arr])].filter((s) => s);

/**
 * Extract variant attributes (size, color, etc.)
 * @param {Record<string, any>} variant
 * @param {Record<string, any>} product
 */
export const getVariantAttributes = (variant, product) => {
    const { options } = product;

    if (!options || /(Default|title)/i.test(`${options?.[0]?.name}`)) {
        return { name: 'Default', props: {} };
    }

    const name = [];
    const props = {};

    for (let i = 0; i < options.length; i++) {
        const prop = `option${i + 1}`;
        if (prop in variant) {
            const optionName = options[i].name;
            props[toSnakeCase(optionName)] = variant[prop];
            name.push(`${optionName}: ${variant[prop]}`);
        }
    }

    return { name: name.join(' / '), props };
};

/**
 * Check robots.txt for sitemap URLs
 * @param {string} baseUrl
 * @param {any} proxyConfiguration
 */
export const checkRobotsTxt = async (baseUrl, proxyConfiguration) => {
    const robotsUrl = new URL('/robots.txt', baseUrl).toString();
    
    try {
        const response = await gotScraping({
            url: robotsUrl,
            timeout: { response: 20000, request: 17000 },
            proxyUrl: proxyConfiguration?.newUrl(`${Date.now()}`),
            retry: { limit: 2 },
        });

        if (![200, 301, 302].includes(response.statusCode)) {
            return null;
        }

        const { body } = response;
        
        // Verify it's a Shopify store
        if (!body.includes('Shopify')) {
            log.warning(`${baseUrl} may not be a Shopify store`);
        }

        // Extract sitemap URLs
        const sitemapMatches = body.match(/Sitemap:\s*(.+?)$/gm);
        if (sitemapMatches) {
            return sitemapMatches
                .map(match => match.replace(/^Sitemap:\s*/i, '').trim())
                .filter(url => url.includes('sitemap') || url.includes('xml'));
        }

        return null;
    } catch (error) {
        log.warning(`Failed to fetch robots.txt for ${baseUrl}`, { error: error.message });
        return null;
    }
};

/**
 * Parse sitemap XML to extract product URLs
 * @param {string} sitemapUrl
 * @param {any} proxyConfiguration
 */
export const parseSitemap = async (sitemapUrl, proxyConfiguration) => {
    try {
        const response = await gotScraping({
            url: sitemapUrl,
            timeout: { response: 30000, request: 25000 },
            proxyUrl: proxyConfiguration?.newUrl(`${Date.now()}`),
            retry: { limit: 2 },
        });

        if (![200, 301, 302].includes(response.statusCode)) {
            return [];
        }

        const $ = load(response.body, { xmlMode: true });
        const urls = [];

        // Extract URLs from sitemap
        $('url loc, sitemap loc').each((_, el) => {
            const url = $(el).text().trim();
            if (url) urls.push(url);
        });

        log.info(`Extracted ${urls.length} URLs from sitemap: ${sitemapUrl}`);
        return urls;
    } catch (error) {
        log.warning(`Failed to parse sitemap ${sitemapUrl}`, { error: error.message });
        return [];
    }
};

/**
 * Transform product data to standard format
 * @param {Record<string, any>} product
 * @param {string} baseUrl
 * @param {boolean} includeVariants
 */
export const transformProduct = (product, baseUrl, includeVariants = true) => {
    if (!product) return null;

    const variants = Array.isArray(product.variants) ? product.variants : [];
    const images = Array.isArray(product.images) ? product.images : [];
    
    // Create image map by variant ID
    const imageMap = new Map();
    images.forEach(img => {
        if (img.variant_ids && img.variant_ids.length > 0) {
            img.variant_ids.forEach(variantId => {
                imageMap.set(variantId, img.src);
            });
        }
    });

    // Images without variant IDs
    const generalImages = images
        .filter(img => !img.variant_ids || img.variant_ids.length === 0)
        .map(img => removeUrlQueryString(img.src));

    const results = [];

    const variantsToProcess = includeVariants ? variants : [variants[0]].filter(Boolean);

    for (const variant of variantsToProcess) {
        const { name: variantName, props: variantProps } = getVariantAttributes(variant, product);
        
        // Get images for this variant
        const variantImage = imageMap.get(variant.id);
        const variantImages = uniqueNonEmptyArray([
            variantImage,
            ...generalImages,
            product.image?.src,
        ].filter(Boolean).map(removeUrlQueryString));

        const result = {
            id: removeGuid(product.id) || null,
            variant_id: removeGuid(variant.id) || null,
            title: product.title || null,
            handle: product.handle || null,
            description: cleanText(product.body_html || product.description || '') || null,
            vendor: product.vendor || null,
            product_type: product.product_type || product.productType || null,
            tags: Array.isArray(product.tags) 
                ? product.tags 
                : (product.tags || '').split(/,\s*/g).filter(Boolean),
            
            // Variant-specific data
            variant_title: variant.title || variantName || null,
            variant_name: variantName || null,
            sku: variant.sku || null,
            barcode: variant.barcode || null,
            
            // Pricing
            price: variant.price ? parseFloat(variant.price) : null,
            compare_at_price: variant.compare_at_price ? parseFloat(variant.compare_at_price) : null,
            currency: 'USD',
            
            // Availability
            available: variant.available !== false,
            inventory_quantity: variant.inventory_quantity || 0,
            inventory_policy: variant.inventory_policy || null,
            
            // Physical properties
            weight: variant.weight || null,
            weight_unit: variant.weight_unit || null,
            requires_shipping: variant.requires_shipping || false,
            
            // Variant attributes
            ...variantProps,
            
            // Images
            images: variantImages,
            featured_image: variantImages[0] || null,
            
            // URLs
            url: `${baseUrl}/products/${product.handle}`,
            
            // Timestamps
            created_at: safeIsoDate(product.created_at || product.createdAt),
            updated_at: safeIsoDate(product.updated_at || product.updatedAt),
            published_at: safeIsoDate(product.published_at || product.publishedAt),
            
            // Metadata
            scraped_at: new Date().toISOString(),
        };

        results.push(result);
    }

    return results.length === 1 ? results[0] : results;
};

/**
 * Validate if URL is a Shopify product URL
 * @param {string} url
 */
export const isProductUrl = (url) => {
    return /\/products\/[^\/]+/.test(url);
};

/**
 * Validate if URL is a Shopify collection URL
 * @param {string} url
 */
export const isCollectionUrl = (url) => {
    return /\/collections\/[^\/]+/.test(url);
};

/**
 * Extract collection handle from URL
 * @param {string} url
 */
export const extractCollectionHandle = (url) => {
    const match = url.match(/\/collections\/([^\/\?]+)/);
    return match ? match[1] : null;
};

/**
 * Create error info for failed requests
 * @param {any} request
 * @param {Error} error
 */
export const createErrorInfo = (request, error) => {
    return {
        url: request.url,
        error: error.message,
        stack: error.stack,
        retries: request.retryCount,
        timestamp: new Date().toISOString(),
    };
};
