# Shopify Product Scraper

Extract comprehensive product data from any Shopify store with high speed and reliability. This scraper supports multiple extraction methods including JSON API (recommended), JSON-LD structured data, and HTML parsing to ensure maximum compatibility across all Shopify stores.

## Why Choose This Shopify Scraper?

<ul>
  <li><strong>Multiple Extraction Methods</strong> - Automatically selects the best method: JSON API (fastest), JSON-LD, or HTML parsing</li>
  <li><strong>Complete Product Data</strong> - Extracts titles, prices, variants, images, descriptions, SKUs, inventory, and more</li>
  <li><strong>Smart Pagination</strong> - Automatically handles pagination to scrape entire collections</li>
  <li><strong>Variant Support</strong> - Captures all product variants (sizes, colors, styles) with individual pricing</li>
  <li><strong>Customizable Filtering</strong> - Control stock status, collection targeting, and result limits</li>
  <li><strong>High Performance</strong> - Optimized for speed without compromising data quality</li>
  <li><strong>Proxy Support</strong> - Built-in proxy rotation to avoid rate limiting</li>
</ul>

## Features

<ul>
  <li>Scrape products from any Shopify store</li>
  <li>Extract data from specific collections or search results</li>
  <li>Support for product variants (sizes, colors, options)</li>
  <li>Automatic pagination handling</li>
  <li>JSON API priority for maximum speed</li>
  <li>HTML parsing fallback for compatibility</li>
  <li>Structured data extraction (JSON-LD)</li>
  <li>Filter by stock availability</li>
  <li>Customizable result limits</li>
  <li>Proxy configuration support</li>
</ul>

## Input Configuration

The scraper accepts the following input parameters:

### Required Parameters

<table>
  <tr>
    <th>Parameter</th>
    <th>Type</th>
    <th>Description</th>
  </tr>
  <tr>
    <td><code>shopUrl</code></td>
    <td>String</td>
    <td>The base URL of the Shopify store (e.g., <code>https://www.allbirds.com</code> or <code>allbirds.com</code>)</td>
  </tr>
</table>

### Optional Parameters

<table>
  <tr>
    <th>Parameter</th>
    <th>Type</th>
    <th>Default</th>
    <th>Description</th>
  </tr>
  <tr>
    <td><code>startUrls</code></td>
    <td>Array</td>
    <td>-</td>
    <td>Specific URLs to scrape (collection pages, product pages). Overrides shopUrl if provided.</td>
  </tr>
  <tr>
    <td><code>collection</code></td>
    <td>String</td>
    <td>"all"</td>
    <td>Collection handle to scrape (e.g., "mens-shoes", "new-arrivals"). Use "all" for all products.</td>
  </tr>
  <tr>
    <td><code>searchQuery</code></td>
    <td>String</td>
    <td>-</td>
    <td>Search for products matching this query instead of scraping a collection.</td>
  </tr>
  <tr>
    <td><code>maxProducts</code></td>
    <td>Integer</td>
    <td>100</td>
    <td>Maximum number of products to scrape. Set to 0 or leave empty for unlimited.</td>
  </tr>
  <tr>
    <td><code>maxPages</code></td>
    <td>Integer</td>
    <td>999</td>
    <td>Maximum number of pages to crawl. Safety limit to prevent infinite loops.</td>
  </tr>
  <tr>
    <td><code>includeVariants</code></td>
    <td>Boolean</td>
    <td>true</td>
    <td>Include all product variants (sizes, colors, etc.) in the output.</td>
  </tr>
  <tr>
    <td><code>includeOutOfStock</code></td>
    <td>Boolean</td>
    <td>true</td>
    <td>Include products that are currently out of stock.</td>
  </tr>
  <tr>
    <td><code>proxyConfiguration</code></td>
    <td>Object</td>
    <td>Residential</td>
    <td>Proxy settings. Residential proxies recommended for best results.</td>
  </tr>
</table>

## Input Examples

### Example 1: Scrape All Products from a Store

```json
{
  "shopUrl": "https://www.allbirds.com",
  "collection": "all",
  "maxProducts": 100
}
```

### Example 2: Scrape Specific Collection

```json
{
  "shopUrl": "https://gymshark.com",
  "collection": "mens-clothing",
  "maxProducts": 50,
  "includeVariants": true
}
```

### Example 3: Search Query

```json
{
  "shopUrl": "https://www.fashionnova.com",
  "searchQuery": "black dress",
  "maxProducts": 30,
  "includeOutOfStock": false
}
```

### Example 4: Multiple URLs

```json
{
  "startUrls": [
    "https://store1.myshopify.com/collections/summer",
    "https://store2.myshopify.com/collections/winter"
  ],
  "maxProducts": 100
}
```

## Output Format

The scraper returns structured data in JSON format. Each product contains the following fields:

### Output Schema

```json
{
  "id": 1234567890,
  "title": "Wool Runner - Natural Grey",
  "handle": "wool-runner-natural-grey",
  "description": "Product description text...",
  "vendor": "Allbirds",
  "product_type": "Shoes",
  "tags": ["sustainable", "comfortable", "casual"],
  "price": 98.00,
  "compare_at_price": 120.00,
  "currency": "USD",
  "available": true,
  "inventory_quantity": 45,
  "sku": "WR-NG-10",
  "barcode": "123456789012",
  "weight": 500,
  "weight_unit": "g",
  "images": [
    "https://cdn.shopify.com/s/files/1/image1.jpg",
    "https://cdn.shopify.com/s/files/1/image2.jpg"
  ],
  "variants": [
    {
      "id": 987654321,
      "title": "Size 10 / Natural Grey",
      "option1": "10",
      "option2": "Natural Grey",
      "option3": null,
      "price": 98.00,
      "compare_at_price": 120.00,
      "sku": "WR-NG-10",
      "available": true,
      "inventory_quantity": 15
    }
  ],
  "url": "https://www.allbirds.com/products/wool-runner-natural-grey",
  "created_at": "2023-01-15T10:30:00Z",
  "updated_at": "2024-12-18T08:20:00Z",
  "published_at": "2023-01-20T09:00:00Z"
}
```

### Key Output Fields

<table>
  <tr>
    <th>Field</th>
    <th>Type</th>
    <th>Description</th>
  </tr>
  <tr>
    <td><code>id</code></td>
    <td>Integer</td>
    <td>Unique product identifier from Shopify</td>
  </tr>
  <tr>
    <td><code>title</code></td>
    <td>String</td>
    <td>Product name/title</td>
  </tr>
  <tr>
    <td><code>handle</code></td>
    <td>String</td>
    <td>URL-friendly product identifier</td>
  </tr>
  <tr>
    <td><code>description</code></td>
    <td>String</td>
    <td>Product description (may include HTML)</td>
  </tr>
  <tr>
    <td><code>vendor</code></td>
    <td>String</td>
    <td>Brand or manufacturer name</td>
  </tr>
  <tr>
    <td><code>product_type</code></td>
    <td>String</td>
    <td>Product category or type</td>
  </tr>
  <tr>
    <td><code>tags</code></td>
    <td>Array</td>
    <td>Product tags for categorization</td>
  </tr>
  <tr>
    <td><code>price</code></td>
    <td>Number</td>
    <td>Current product price</td>
  </tr>
  <tr>
    <td><code>compare_at_price</code></td>
    <td>Number</td>
    <td>Original price (before discount)</td>
  </tr>
  <tr>
    <td><code>currency</code></td>
    <td>String</td>
    <td>Price currency code (USD, EUR, etc.)</td>
  </tr>
  <tr>
    <td><code>available</code></td>
    <td>Boolean</td>
    <td>Whether product is in stock</td>
  </tr>
  <tr>
    <td><code>inventory_quantity</code></td>
    <td>Integer</td>
    <td>Available stock quantity</td>
  </tr>
  <tr>
    <td><code>sku</code></td>
    <td>String</td>
    <td>Stock keeping unit identifier</td>
  </tr>
  <tr>
    <td><code>images</code></td>
    <td>Array</td>
    <td>Array of product image URLs</td>
  </tr>
  <tr>
    <td><code>variants</code></td>
    <td>Array</td>
    <td>All product variants (sizes, colors, etc.)</td>
  </tr>
  <tr>
    <td><code>url</code></td>
    <td>String</td>
    <td>Direct link to product page</td>
  </tr>
</table>

## Use Cases

This Shopify scraper is perfect for:

<ul>
  <li><strong>Price Monitoring</strong> - Track competitor pricing and detect price changes</li>
  <li><strong>Market Research</strong> - Analyze product catalogs and market trends</li>
  <li><strong>Inventory Tracking</strong> - Monitor stock levels and availability</li>
  <li><strong>Product Database</strong> - Build comprehensive product databases for comparison sites</li>
  <li><strong>Competitive Analysis</strong> - Analyze competitor product offerings and pricing strategies</li>
  <li><strong>Dropshipping</strong> - Find products for dropshipping businesses</li>
  <li><strong>Data Analytics</strong> - Gather data for business intelligence and analytics</li>
  <li><strong>SEO Analysis</strong> - Study product descriptions and metadata</li>
</ul>

## How It Works

The scraper uses an intelligent multi-method approach:

<ol>
  <li><strong>JSON API Method (Primary)</strong>
    <p>Attempts to fetch product data directly from Shopify's JSON API endpoints (<code>/products.json</code>, <code>/collections/{handle}/products.json</code>). This is the fastest and most reliable method.</p>
  </li>
  <li><strong>JSON-LD Extraction (Secondary)</strong>
    <p>If JSON API is unavailable, extracts structured data from JSON-LD schema markup embedded in HTML pages.</p>
  </li>
  <li><strong>HTML Parsing (Fallback)</strong>
    <p>As a last resort, parses product information directly from HTML using intelligent selectors that work across different Shopify themes.</p>
  </li>
</ol>

## Performance and Limits

<table>
  <tr>
    <th>Metric</th>
    <th>Value</th>
  </tr>
  <tr>
    <td>Average Speed</td>
    <td>50-200 products per minute (depends on method and store)</td>
  </tr>
  <tr>
    <td>Recommended Memory</td>
    <td>2048 MB</td>
  </tr>
  <tr>
    <td>Timeout</td>
    <td>3600 seconds (1 hour)</td>
  </tr>
  <tr>
    <td>Max Concurrency</td>
    <td>5 requests</td>
  </tr>
  <tr>
    <td>Retry Attempts</td>
    <td>3 per request</td>
  </tr>
</table>

## Best Practices

<ul>
  <li><strong>Automatic Method Selection</strong> - The scraper automatically chooses the fastest available method (JSON API → JSON-LD → HTML parsing)</li>
  <li><strong>Enable Proxies</strong> - Always use residential proxies for large-scale scraping</li>
  <li><strong>Set Reasonable Limits</strong> - Use <code>maxProducts</code> to control cost and runtime</li>
  <li><strong>Include Variants</strong> - Set <code>includeVariants: true</code> for complete product data</li>
  <li><strong>Handle Rate Limits</strong> - Use proxy rotation to avoid rate limiting</li>
  <li><strong>Test First</strong> - Start with small <code>maxProducts</code> values to test configuration</li>
</ul>

## Troubleshooting

### Common Issues and Solutions

<dl>
  <dt><strong>No products extracted</strong></dt>
  <dd>
    <ul>
      <li>Verify the store URL is correct and accessible</li>
      <li>Check if the collection handle exists</li>
      <li>The scraper automatically tries multiple extraction methods - if all fail, the store may have custom protection</li>
      <li>Enable proxy configuration if the store blocks direct access</li>
    </ul>
  </dd>

  <dt><strong>Missing product data</strong></dt>
  <dd>
    <ul>
      <li>Enable <code>includeVariants</code> to get all product information</li>
      <li>The scraper automatically falls back to alternative methods if the primary method fails</li>
    </ul>
  </dd>

  <dt><strong>Rate limiting errors</strong></dt>
  <dd>
    <ul>
      <li>Enable Apify residential proxies in the proxy configuration</li>
      <li>Reduce concurrency by adjusting the actor settings</li>
      <li>Add delays between requests if needed</li>
    </ul>
  </dd>

  <dt><strong>Slow performance</strong></dt>
  <dd>
    <ul>
      <li>The scraper automatically uses the fastest available method (JSON API when possible)</li>
      <li>Ensure proxy configuration is optimal</li>
      <li>Increase memory allocation to 2048 MB or higher</li>
    </ul>
  </dd>
</dl>

## Data Export Options

Export your scraped data in multiple formats:

<ul>
  <li><strong>JSON</strong> - Structured data format, ideal for APIs and applications</li>
  <li><strong>CSV</strong> - Spreadsheet format, perfect for Excel and data analysis</li>
  <li><strong>Excel</strong> - Native Excel format with formatting preserved</li>
  <li><strong>HTML</strong> - Human-readable table format</li>
  <li><strong>XML</strong> - Structured markup format</li>
  <li><strong>RSS</strong> - Feed format for automated monitoring</li>
</ul>

## Integration Options

Integrate the scraper with other tools and platforms:

<ul>
  <li>Schedule regular runs using Apify Scheduler</li>
  <li>Connect to Google Sheets for automatic data updates</li>
  <li>Integrate with webhooks for real-time notifications</li>
  <li>Use Apify API for programmatic access</li>
  <li>Connect to Zapier, Make, or other automation platforms</li>
  <li>Export to databases (PostgreSQL, MongoDB, etc.)</li>
</ul>

## Cost Optimization Tips

<ul>
  <li>Use <code>maxProducts</code> to limit the number of results</li>
  <li>Set <code>includeOutOfStock: false</code> to skip unavailable products</li>
  <li>Use datacenter proxies for stores without strict rate limits (cheaper than residential)</li>
  <li>Schedule scraping during off-peak hours</li>
  <li>Leverage the dataset cache to avoid re-scraping recent data</li>
</ul>

## Privacy and Ethics

<ul>
  <li>This scraper only collects publicly available product information</li>
  <li>Always respect website terms of service</li>
  <li>Use reasonable rate limits to avoid overloading target servers</li>
  <li>Only scrape data you have permission to access</li>
  <li>Comply with data protection regulations (GDPR, CCPA, etc.)</li>
</ul>

## Support

Need help or have questions?

<ul>
  <li>Check the <a href="https://docs.apify.com">Apify Documentation</a></li>
  <li>Visit the <a href="https://discord.com/invite/jyEM2PRvMU">Apify Discord Community</a></li>
  <li>Contact support through the Apify Console</li>
  <li>Review the input examples above for common use cases</li>
</ul>

## Updates and Changelog

The scraper is regularly updated to:

<ul>
  <li>Maintain compatibility with Shopify platform changes</li>
  <li>Improve performance and reliability</li>
  <li>Add new features based on user feedback</li>
  <li>Fix bugs and resolve issues</li>
  <li>Enhance data extraction accuracy</li>
</ul>

## Technical Requirements

<ul>
  <li>Node.js 22 or higher</li>
  <li>Apify platform account</li>
  <li>Proxy configuration (recommended for production use)</li>
  <li>Minimum 2048 MB memory allocation</li>
</ul>

## Related Scrapers

<ul>
  <li>Shopify Store Finder</li>
  <li>Shopify Collection Scraper</li>
  <li>E-commerce Price Monitor</li>
  <li>Product Review Scraper</li>
</ul>

---

<p align="center">
  Built with ❤️ for the Apify community<br>
  <strong>Happy scraping!</strong>
</p>
