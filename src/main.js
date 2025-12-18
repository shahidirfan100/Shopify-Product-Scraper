// Shopify Product Scraper - Production Grade Implementation
import { Actor, log } from 'apify';
import { CheerioCrawler, Dataset } from 'crawlee';
import { gotScraping } from 'got-scraping';
import { load as cheerioLoad } from 'cheerio';
import * as helpers from './helpers.js';

await Actor.init();

async function main() {
    try {
        const input = (await Actor.getInput()) || {};
        const {
            shopUrl,
            startUrls,
            collection,
            searchQuery = '',
            maxProducts = 50,
            maxPages = 999,
            includeVariants = true,
            includeOutOfStock = true,
            proxyConfiguration,
        } = input;

        // Internal configuration - not user configurable
        const debugLog = false;
        const maxConcurrency = 5;
        const maxRequestRetries = 3;

        if (debugLog) {
            log.setLevel(log.LEVELS.DEBUG);
        }

        const MAX_PRODUCTS = Number.isFinite(+maxProducts) && maxProducts > 0 ? maxProducts : Number.MAX_SAFE_INTEGER;
        const MAX_PAGES = Number.isFinite(+maxPages) && maxPages > 0 ? maxPages : 999;

        // Proxy configuration
        const proxyConf = proxyConfiguration 
            ? await Actor.createProxyConfiguration({ ...proxyConfiguration }) 
            : undefined;

        if (!proxyConf) {
            log.warning('No proxy configuration provided. This may lead to rate limiting.');
        }

        // Build initial URLs
        const initialUrls = [];
        
        if (Array.isArray(startUrls) && startUrls.length) {
            initialUrls.push(...startUrls.map(u => typeof u === 'string' ? u : u.url).filter(Boolean));
        }
        
        if (shopUrl) {
            const baseUrl = helpers.normalizeShopifyUrl(shopUrl);
            if (collection) {
                initialUrls.push(`${baseUrl}/collections/${collection}`);
            } else if (searchQuery) {
                initialUrls.push(`${baseUrl}/search?q=${encodeURIComponent(searchQuery)}`);
            } else {
                initialUrls.push(`${baseUrl}/collections/all`);
            }
        }

        if (!initialUrls.length) {
            throw new Error('Please provide either shopUrl or startUrls');
        }

        log.info(`Starting scraper with ${initialUrls.length} initial URLs`);

        // State management
        let saved = 0;
        const seenProducts = new Set();
        const failedUrls = [];

        // Try to fetch products via Shopify JSON API
        async function fetchProductsViaJsonApi(baseUrl, page = 1) {
            try {
                const jsonUrl = `${baseUrl}/products.json?limit=250&page=${page}`;
                log.debug(`Fetching JSON API: ${jsonUrl}`);
                
                const response = await gotScraping({
                    url: jsonUrl,
                    responseType: 'json',
                    proxyUrl: proxyConf ? await proxyConf.newUrl() : undefined,
                    timeout: { request: 30000 },
                    retry: { limit: 2 },
                });

                if (response.statusCode === 200 && response.body?.products) {
                    log.info(`✓ JSON API returned ${response.body.products.length} products (page ${page})`);
                    return response.body.products;
                }
                
                return null;
            } catch (err) {
                log.debug(`JSON API failed for ${baseUrl}: ${err.message}`);
                return null;
            }
        }

        // Fetch collection products via JSON API
        async function fetchCollectionViaJsonApi(collectionUrl, page = 1) {
            try {
                const collectionJsonUrl = `${collectionUrl}/products.json?limit=250&page=${page}`;
                log.debug(`Fetching collection JSON: ${collectionJsonUrl}`);
                
                const response = await gotScraping({
                    url: collectionJsonUrl,
                    responseType: 'json',
                    proxyUrl: proxyConf ? await proxyConf.newUrl() : undefined,
                    timeout: { request: 30000 },
                    retry: { limit: 2 },
                });

                if (response.statusCode === 200 && response.body?.products) {
                    log.info(`✓ Collection JSON API returned ${response.body.products.length} products (page ${page})`);
                    return response.body.products;
                }
                
                return null;
            } catch (err) {
                log.debug(`Collection JSON API failed: ${err.message}`);
                return null;
            }
        }

        // Fetch individual product via JSON API
        async function fetchSingleProductJson(productUrl) {
            try {
                const jsonUrl = `${productUrl}.json`;
                log.debug(`Fetching product JSON: ${jsonUrl}`);
                
                const response = await gotScraping({
                    url: jsonUrl,
                    responseType: 'json',
                    proxyUrl: proxyConf ? await proxyConf.newUrl() : undefined,
                    timeout: { request: 30000 },
                    retry: { limit: 2 },
                });

                if (response.statusCode === 200 && response.body?.product) {
                    return response.body.product;
                }
                
                return null;
            } catch (err) {
                log.debug(`Product JSON API failed for ${productUrl}: ${err.message}`);
                return null;
            }
        }

        // Extract product from JSON-LD
        function extractFromJsonLd($, baseUrl) {
            try {
                const scripts = $('script[type="application/ld+json"]');
                for (let i = 0; i < scripts.length; i++) {
                    const content = $(scripts[i]).html();
                    if (!content) continue;
                    
                    const parsed = JSON.parse(content);
                    const items = Array.isArray(parsed) ? parsed : [parsed];
                    
                    for (const item of items) {
                        if (!item) continue;
                        const type = item['@type'];
                        if (type === 'Product') {
                            const offers = item.offers;
                            const price = offers?.price || offers?.[0]?.price || null;
                            const currency = offers?.priceCurrency || offers?.[0]?.priceCurrency || 'USD';
                            const availability = offers?.availability || offers?.[0]?.availability || null;
                            const inStock = availability ? availability.includes('InStock') : true;

                            return {
                                title: item.name || null,
                                description: item.description || null,
                                vendor: item.brand?.name || null,
                                product_type: item.category || null,
                                price: price ? parseFloat(price) : null,
                                currency,
                                available: inStock,
                                images: item.image ? (Array.isArray(item.image) ? item.image : [item.image]) : [],
                                sku: offers?.sku || offers?.[0]?.sku || null,
                            };
                        }
                    }
                }
            } catch (err) {
                log.debug(`JSON-LD extraction failed: ${err.message}`);
            }
            return null;
        }

        // Parse products from HTML (fallback)
        function parseProductsFromHtml($, baseUrl) {
            const products = [];
            const productSelectors = [
                '.product-item',
                '.product-card',
                '[data-product-id]',
                '.grid-product',
                '.product',
                'article[data-product]',
            ];

            let productElements = [];
            for (const selector of productSelectors) {
                productElements = $(selector);
                if (productElements.length > 0) {
                    log.debug(`Found ${productElements.length} products using selector: ${selector}`);
                    break;
                }
            }

            productElements.each((_, el) => {
                try {
                    const $el = $(el);
                    
                    const title = $el.find('.product-title, .product-card__title, h3, h2, a').first().text().trim() || null;
                    const link = $el.find('a[href*="/products/"]').first().attr('href') || $el.find('a').first().attr('href');
                    const url = link ? (link.startsWith('http') ? link : `${baseUrl}${link}`) : null;
                    const handle = url ? url.split('/products/')[1]?.split('?')[0] : null;
                    
                    const priceText = $el.find('.price, [class*="price"], .product-price').first().text().trim();
                    const priceMatch = priceText.match(/[\d,]+\.?\d*/);
                    const price = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : null;
                    
                    const img = $el.find('img').first();
                    const imageSrc = img.attr('src') || img.attr('data-src') || img.attr('data-srcset')?.split(' ')[0];
                    const image = imageSrc ? (imageSrc.startsWith('http') ? imageSrc : `https:${imageSrc}`) : null;

                    const soldOutText = $el.text().toLowerCase();
                    const available = !soldOutText.includes('sold out') && !soldOutText.includes('unavailable');

                    if (title || url) {
                        products.push({
                            title,
                            handle,
                            url,
                            price,
                            available,
                            images: image ? [image] : [],
                        });
                    }
                } catch (err) {
                    log.debug(`Failed to parse product element: ${err.message}`);
                }
            });

            return products;
        }

        // Find next page URL
        function findNextPageUrl($, currentUrl) {
            const nextLink = $('a.next, a[rel="next"], .pagination__next a, [class*="pagination"] a').filter((_, el) => {
                const text = $(el).text().toLowerCase();
                return text.includes('next') || text === '›' || text === '»';
            }).first().attr('href');

            if (nextLink) {
                return nextLink.startsWith('http') 
                    ? nextLink 
                    : `${helpers.getBaseDomain(currentUrl)}${nextLink}`;
            }

            return null;
        }

        // Save products to dataset
        async function saveProducts(products, baseUrl) {
            if (!products || products.length === 0) return 0;

            let savedCount = 0;

            for (const product of products) {
                if (saved >= MAX_PRODUCTS) break;

                const productUrl = product.url || `${baseUrl}/products/${product.handle}`;
                
                // Skip if already scraped
                if (seenProducts.has(productUrl)) continue;
                
                // Skip out of stock if not included
                if (!includeOutOfStock && product.available === false) continue;

                // Transform and save
                const transformed = helpers.transformProduct(product, baseUrl, includeVariants);
                
                if (transformed) {
                    const items = Array.isArray(transformed) ? transformed : [transformed];
                    
                    for (const item of items) {
                        if (saved >= MAX_PRODUCTS) break;
                        await Dataset.pushData(item);
                        saved++;
                        savedCount++;
                    }
                    
                    seenProducts.add(productUrl);
                }
            }

            return savedCount;
        }

        // Main crawler
        const crawler = new CheerioCrawler({
            proxyConfiguration: proxyConf,
            maxRequestRetries,
            useSessionPool: true,
            persistCookiesPerSession: false,
            maxConcurrency,
            requestHandlerTimeoutSecs: 60,
            sessionPoolOptions: {
                maxPoolSize: 20,
                sessionOptions: {
                    maxErrorScore: 3,
                    maxUsageCount: 50,
                },
            },
            
            async requestHandler({ request, $, log: crawlerLog }) {
                if (saved >= MAX_PRODUCTS) {
                    crawlerLog.info(`Reached maximum products limit (${MAX_PRODUCTS})`);
                    return;
                }

                const baseUrl = helpers.getBaseDomain(request.url);
                const pageNo = request.userData?.pageNo || 1;

                if (pageNo > MAX_PAGES) {
                    crawlerLog.info(`Reached max pages limit (${MAX_PAGES})`);
                    return;
                }

                crawlerLog.info(`Processing page ${pageNo}: ${request.url} (${saved}/${MAX_PRODUCTS} products)`);

                let products = [];

                // Priority 1: Try JSON API for collection pages
                if (request.url.includes('/collections/')) {
                    const collectionProducts = await fetchCollectionViaJsonApi(request.url.split('?')[0], pageNo);
                    if (collectionProducts && collectionProducts.length > 0) {
                        products = collectionProducts;
                        crawlerLog.info(`✓ Extracted ${products.length} products via Collection JSON API`);
                    }
                } else if (helpers.isProductUrl(request.url)) {
                    // Single product page
                    const product = await fetchSingleProductJson(request.url.split('?')[0]);
                    if (product) {
                        products = [product];
                        crawlerLog.info(`✓ Extracted product via Product JSON API`);
                    }
                } else {
                    // Try general products JSON API
                    const jsonProducts = await fetchProductsViaJsonApi(baseUrl, pageNo);
                    if (jsonProducts && jsonProducts.length > 0) {
                        products = jsonProducts;
                        crawlerLog.info(`✓ Extracted ${products.length} products via JSON API`);
                    }
                }

                // Priority 2: Try JSON-LD extraction if no products found
                if (products.length === 0) {
                    const jsonLdProduct = extractFromJsonLd($, baseUrl);
                    if (jsonLdProduct) {
                        products = [jsonLdProduct];
                        crawlerLog.info('✓ Extracted product from JSON-LD');
                    }
                }

                // Priority 3: Fallback to HTML parsing if still no products
                if (products.length === 0) {
                    products = parseProductsFromHtml($, baseUrl);
                    if (products.length > 0) {
                        crawlerLog.info(`✓ Extracted ${products.length} products via HTML parsing`);
                    }
                }

                // Save products
                const savedCount = await saveProducts(products, baseUrl);
                crawlerLog.info(`Saved ${savedCount} products (Total: ${saved}/${MAX_PRODUCTS})`);

                // Handle pagination if we haven't reached limits
                if (saved < MAX_PRODUCTS && pageNo < MAX_PAGES && products.length > 0) {
                    const nextPageUrl = findNextPageUrl($, request.url);
                    if (nextPageUrl) {
                        crawlerLog.info(`Found next page: ${nextPageUrl}`);
                        await crawler.addRequests([{
                            url: nextPageUrl,
                            userData: { pageNo: pageNo + 1 },
                        }]);
                    } else {
                        crawlerLog.info('No more pages found');
                    }
                }
            },

            async failedRequestHandler({ request, error }) {
                const errorInfo = helpers.createErrorInfo(request, error);
                log.error(`Request failed after ${request.retryCount} retries`, errorInfo);
                
                failedUrls.push(errorInfo);
                
                await Dataset.pushData({
                    '#failed': true,
                    ...errorInfo,
                });
            },
        });

        // Add initial requests
        await crawler.addRequests(initialUrls.map(url => ({ 
            url, 
            userData: { pageNo: 1 } 
        })));

        // Run the crawler
        log.info('Starting crawler...');
        await crawler.run();

        // Final statistics
        log.info('═══════════════════════════════════════');
        log.info(`✓ Scraping completed successfully`);
        log.info(`✓ Total products scraped: ${saved}`);
        log.info(`✓ Unique products: ${seenProducts.size}`);
        log.info(`✓ Failed requests: ${failedUrls.length}`);
        log.info('═══════════════════════════════════════');

        // Save statistics
        await Actor.setValue('STATS', {
            totalProducts: saved,
            uniqueProducts: seenProducts.size,
            failedRequests: failedUrls.length,
            completedAt: new Date().toISOString(),
        });

    } catch (error) {
        log.error(`Fatal error: ${error.message}`, { stack: error.stack });
        throw error;
    } finally {
        await Actor.exit();
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
