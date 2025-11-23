/**
 * Wikidata and MediaWiki Data Fetcher
 * Author: John Samuel
 * Refactored for improved modularity and best practices
 */

// ============================================================================
// CONSTANTS AND CONFIGURATION
// ============================================================================

const CONFIG = {
  endpoints: {
    wikidata: 'https://query.wikidata.org/sparql',
    mediawiki: 'https://www.wikidata.org/w/api.php'
  },
  projects: [
    'wikipedia',
    'commons.wikimedia',
    'wikivoyage',
    'wikinews',
    'wikisource',
    'wiktionary',
    'wikiversity',
    'wikibooks',
    'wikiquote',
    'wikispecies'
  ],
  defaults: {
    item: 'Q1339',
    language: 'en',
    searchLimit: 10
  }
};

const SPARQL_QUERIES = {
  allWikiLinks: {
    query: `SELECT ?wikilink WHERE { 
      ?wikilink schema:about wd:{{item}}. 
    } ORDER BY ?wikilink`,
    callback: 'createDivWikiStatisticsLinks',
    elementId: 'statisticssection'
  },
  wikiLinks: {
    query: `SELECT ?wikilink WHERE { 
      ?wikilink schema:about wd:{{item}}. 
      FILTER REGEX(STR(?wikilink), "{{wikiproject}}.org/") . 
    } ORDER BY ?wikilink`,
    callback: 'createDivWikipediaLanguageLinks',
    elementId: '{{wikiproject}}links'
  },
  externalLinks: {
    query: `SELECT ?property ?value {
      ?qualifier rdf:type owl:DatatypeProperty.
      ?property rdf:type wikibase:Property;
        wikibase:propertyType wikibase:ExternalId.
      ?property wikibase:claim ?propertyclaim.
      wd:{{item}} ?propertyclaim [?qualifier ?value].
    } ORDER BY ?property`,
    callback: 'createDivExternalLinks',
    elementId: 'externalidentifiers'
  },
  externalLinksCount: {
    query: `SELECT ?property ?value {
      ?qualifier rdf:type owl:DatatypeProperty.
      ?property rdf:type wikibase:Property;
        wikibase:propertyType wikibase:ExternalId.
      ?property wikibase:claim ?propertyclaim.
      wd:{{item}} ?propertyclaim [?qualifier ?value].
    } ORDER BY ?property`,
    callback: 'createDivExternalLinksCount',
    elementId: 'statisticssection'
  },
  label: {
    query: `SELECT DISTINCT ?label WHERE {
      wd:{{item}} rdfs:label ?label;
      FILTER(lang(?label) = "{{lang}}").
    }`,
    callback: 'createSpanLabel',
    elementId: 'statisticssection'
  },
  referenceCount: {
    query: `SELECT ?statement ?prop ?reference {
      wd:{{item}} ?prop ?statement.
      OPTIONAL { ?statement prov:wasDerivedFrom ?reference }
      FILTER (REGEX(STR(?statement), "http://www.wikidata.org/entity/statement/"))
    } ORDER BY ?statement`,
    callback: 'createDivReferencesCount',
    elementId: 'statisticssection'
  },
  references: {
    query: `SELECT ?statement ?prop ?reference {
      wd:{{item}} ?prop ?statement.
      OPTIONAL { ?statement prov:wasDerivedFrom ?reference }
      FILTER (REGEX(STR(?statement), "http://www.wikidata.org/entity/statement/"))
    } ORDER BY ?statement`,
    callback: 'createDivReferences',
    elementId: 'references'
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Utility class for URL and string manipulation
 */
class URLUtils {
  static getLanguageCode(url) {
    const languagePattern = /^https?:\/\/([a-z]{2,})\./;
    const match = url.match(languagePattern);
    return match ? match[1] : null;
  }

  static getLastPathSegment(url) {
    const parts = url.split('/');
    return parts[parts.length - 1];
  }

  static getProjectFromValue(url) {
    for (const project of CONFIG.projects) {
      if (url.includes(`${project}.org`)) {
        return project;
      }
    }
    return null;
  }
}

/**
 * Utility class for query parameter handling
 */
class QueryParams {
  static get(name, defaultValue = null) {
    if (!window.location.search) return defaultValue;

    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.has(name)
      ? decodeURIComponent(urlParams.get(name))
      : defaultValue;
  }

  static getAll() {
    return new URLSearchParams(window.location.search);
  }
}

/**
 * Template string replacer
 */
class TemplateReplacer {
  static replace(template, params) {
    return template.replace(/{{(\w+)}}/g, (match, key) => {
      if (!(key in params)) {
        console.warn(`Missing parameter: ${key}`);
        return match;
      }
      return params[key];
    });
  }
}

// ============================================================================
// DOM MANIPULATION UTILITIES
// ============================================================================

/**
 * DOM utility class for common operations
 */
class DOMUtils {
  static getElementById(id) {
    const element = document.getElementById(id);
    if (!element) {
      console.warn(`Element not found: ${id}`);
    }
    return element;
  }

  static removeElement(element) {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  }

  static removeElementById(id) {
    const element = DOMUtils.getElementById(id);
    DOMUtils.removeElement(element);
  }

  static clearElement(element) {
    while (element && element.hasChildNodes()) {
      element.removeChild(element.lastChild);
    }
  }

  static createElement(tag, options = {}) {
    const element = document.createElement(tag);

    if (options.className) {
      element.className = options.className;
    }

    if (options.text) {
      element.textContent = options.text;
    }

    if (options.html) {
      element.innerHTML = options.html;
    }

    if (options.attributes) {
      Object.entries(options.attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });
    }

    if (options.children) {
      options.children.forEach(child => element.appendChild(child));
    }

    return element;
  }

  static createHeader(level, text) {
    return DOMUtils.createElement(`h${level}`, { text });
  }

  static createLink(href, text) {
    return DOMUtils.createElement('a', {
      text,
      attributes: { href }
    });
  }
}

/**
 * Table builder utility
 */
class TableBuilder {
  constructor(headers) {
    this.table = document.createElement('table');
    this._addHeaders(headers);
  }

  _addHeaders(headers) {
    const headerRow = document.createElement('tr');
    headers.forEach(headerText => {
      const th = document.createElement('th');
      th.textContent = headerText;
      headerRow.appendChild(th);
    });
    this.table.appendChild(headerRow);
  }

  addRow(cells) {
    const row = document.createElement('tr');
    cells.forEach(cellConfig => {
      const td = document.createElement('td');

      if (cellConfig.className) {
        td.className = cellConfig.className;
      }

      const cellElement = cellConfig.element === 'text'
        ? document.createTextNode(cellConfig.content)
        : DOMUtils.createElement(cellConfig.element, {
          text: cellConfig.content,
          attributes: cellConfig.attributes || {}
        });

      td.appendChild(cellElement);
      row.appendChild(td);
    });

    this.table.appendChild(row);
    return this;
  }

  build() {
    return this.table;
  }
}

// ============================================================================
// DATA FETCHING LAYER
// ============================================================================

/**
 * Generic data fetcher with loading state management
 */
class DataFetcher {
  static async fetch(url, headers = {}) {
    try {
      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  }

  static async fetchWithLoading(url, headers, divId, callback) {
    const div = DOMUtils.getElementById(divId);
    if (!div) return;

    const loadingIndicator = DOMUtils.createElement('h4', {
      text: 'Fetching data...',
      className: 'loading-indicator'
    });

    div.appendChild(loadingIndicator);

    try {
      const data = await this.fetch(url, headers);
      DOMUtils.removeElement(loadingIndicator);
      callback(divId, data);
    } catch (error) {
      DOMUtils.removeElement(loadingIndicator);
      this._showError(div, error);
    }
  }

  static _showError(container, error) {
    const errorMsg = DOMUtils.createElement('div', {
      text: `Error loading data: ${error.message}`,
      className: 'error-message'
    });
    container.appendChild(errorMsg);
  }
}

/**
 * Wikidata SPARQL query handler
 */
class WikidataQuery {
  static query(sparqlQuery, callback, divId) {
    const queryUrl = `${CONFIG.endpoints.wikidata}?query=${encodeURIComponent(sparqlQuery)}&format=json`;
    const headers = { 'Accept': 'application/sparql-results+json' };

    DataFetcher.fetchWithLoading(queryUrl, headers, divId, callback);
  }

  static async queryAsync(sparqlQuery) {
    const queryUrl = `${CONFIG.endpoints.wikidata}?query=${encodeURIComponent(sparqlQuery)}&format=json`;
    const headers = { 'Accept': 'application/sparql-results+json' };

    return await DataFetcher.fetch(queryUrl, headers);
  }
}

/**
 * MediaWiki API query handler
 */
class MediaWikiQuery {
  static query(queryParams, callback, divId) {
    const queryUrl = `${CONFIG.endpoints.mediawiki}?action=${queryParams}&format=json`;

    DataFetcher.fetchWithLoading(queryUrl, {}, divId, callback);
  }

  static async queryAsync(queryParams) {
    const queryUrl = `${CONFIG.endpoints.mediawiki}?action=${queryParams}&format=json`;

    return await DataFetcher.fetch(queryUrl);
  }

  static buildSearchQuery(search, language = CONFIG.defaults.language, limit = CONFIG.defaults.searchLimit) {
    return `wbsearchentities&search=${encodeURIComponent(search)}&language=${language}&props=url&limit=${limit}&origin=*&format=json`;
  }
}

// ============================================================================
// QUERY PROCESSOR
// ============================================================================

/**
 * Processes SPARQL queries with parameter substitution
 */
class QueryProcessor {
  static process(queryName, params) {
    const queryConfig = SPARQL_QUERIES[queryName];

    if (!queryConfig) {
      console.error(`Query configuration not found: ${queryName}`);
      return;
    }

    const { query, callback, elementId } = queryConfig;
    const processedQuery = TemplateReplacer.replace(query, params);
    const processedElementId = TemplateReplacer.replace(elementId, params);

    // Get callback function from window scope
    const callbackFn = window[callback];

    if (typeof callbackFn !== 'function') {
      console.error(`Callback function not found: ${callback}`);
      return;
    }

    WikidataQuery.query(processedQuery, callbackFn, processedElementId);
  }
}

// ============================================================================
// DATA RENDERERS
// ============================================================================

/**
 * Renders wiki statistics links
 */
function createDivWikiStatisticsLinks(divId, json) {
  const { head: { vars }, results } = json;
  const projectCounts = {};

  // Count occurrences per project
  results.bindings.forEach(result => {
    vars.forEach(variable => {
      const project = URLUtils.getProjectFromValue(result[variable].value);
      if (project) {
        projectCounts[project] = (projectCounts[project] || 0) + 1;
      }
    });
  });

  // Update DOM for each project
  Object.entries(projectCounts).forEach(([project, count]) => {
    const valueDiv = DOMUtils.getElementById(`${project}linksvalue`);
    if (valueDiv) {
      valueDiv.innerHTML = '';
      valueDiv.appendChild(DOMUtils.createElement('div', { text: count.toString() }));
    }
  });
}

/**
 * Renders language links for a specific wiki project
 */
function createDivWikipediaLanguageLinks(divId, json) {
  const { head: { vars }, results } = json;
  const container = DOMUtils.getElementById(divId);

  if (!container) return;

  const isCommons = divId.includes('commons');
  const itemType = isCommons ? 'category' : 'languages';

  // Update count
  const valueDiv = DOMUtils.getElementById(`${divId}value`);
  if (valueDiv) {
    valueDiv.textContent = results.bindings.length;
  }

  // Add header
  const header = DOMUtils.createHeader(3, `Total ${results.bindings.length} ${itemType}`);
  container.appendChild(header);

  // Build table
  const tableBuilder = new TableBuilder(['Language', 'Link']);

  results.bindings.forEach(result => {
    vars.forEach(variable => {
      const url = result[variable].value;
      const languageCode = URLUtils.getLanguageCode(url);
      const link = `./references.html?url=${encodeURIComponent(url)}`;

      tableBuilder.addRow([
        {
          element: 'div',
          content: languageCode,
          className: 'property'
        },
        {
          element: 'a',
          content: decodeURI(url),
          attributes: { href: link }
        }
      ]);
    });
  });

  container.appendChild(tableBuilder.build());
}

/**
 * Renders external links count
 */
function createDivExternalLinksCount(divId, json) {
  const { results } = json;
  const valueDiv = DOMUtils.getElementById('externalidentifiersvalue');

  if (valueDiv) {
    valueDiv.innerHTML = '';
    valueDiv.appendChild(DOMUtils.createElement('div', {
      text: results.bindings.length.toString()
    }));
  }
}

/**
 * Renders external links table
 */
function createDivExternalLinks(divId, json) {
  const { results } = json;
  const container = DOMUtils.getElementById(divId);

  if (!container) return;

  // Update count
  const valueDiv = DOMUtils.getElementById('externalidentifiersvalue');
  if (valueDiv) {
    valueDiv.textContent = results.bindings.length;
  }

  // Add header
  const header = DOMUtils.createHeader(3, `Total ${results.bindings.length} external identifiers`);
  container.appendChild(header);

  // Build table
  const tableBuilder = new TableBuilder(['External identifier', 'Value']);

  results.bindings.forEach(result => {
    const propertyId = URLUtils.getLastPathSegment(result.property.value);

    tableBuilder.addRow([
      {
        element: 'a',
        content: propertyId,
        className: 'property',
        attributes: { href: result.property.value }
      },
      {
        element: 'text',
        content: result.value.value
      }
    ]);
  });

  container.appendChild(tableBuilder.build());
}

/**
 * Renders references count
 */
function createDivReferencesCount(divId, json) {
  const { results } = json;
  const referencedStatements = new Set();

  results.bindings.forEach(result => {
    if (result.reference) {
      referencedStatements.add(result.prop.value);
    }
  });

  if (results.bindings.length === 0) return;

  const percentage = ((referencedStatements.size * 100) / results.bindings.length).toFixed(2);
  const valueDiv = DOMUtils.getElementById('referencesvalue');

  if (valueDiv) {
    valueDiv.innerHTML = '';
    valueDiv.appendChild(DOMUtils.createElement('div', { text: percentage }));
  }
}

/**
 * Renders references table
 */
function createDivReferences(divId, json) {
  const { results } = json;
  const container = DOMUtils.getElementById(divId);

  if (!container) return;

  // Count references per property
  const referenceCounts = {};
  results.bindings.forEach(result => {
    if (result.reference) {
      const propValue = result.prop.value;
      referenceCounts[propValue] = (referenceCounts[propValue] || 0) + 1;
    }
  });

  const referencedCount = Object.keys(referenceCounts).length;
  const totalCount = results.bindings.length;
  const percentage = totalCount > 0
    ? ((referencedCount * 100) / totalCount).toFixed(2)
    : '0.00';

  // Update value display
  const valueDiv = DOMUtils.getElementById('referencesvalue');
  if (valueDiv) {
    valueDiv.textContent = percentage;
  }

  // Add header
  const headerText = `Total ${referencedCount} reference statements for a total of ${totalCount} statements (${percentage}%)`;
  const header = DOMUtils.createHeader(3, headerText);
  container.appendChild(header);

  // Build table
  const tableBuilder = new TableBuilder(['Property', 'Number of statements']);

  Object.entries(referenceCounts).forEach(([propUrl, count]) => {
    const propertyId = URLUtils.getLastPathSegment(propUrl);

    tableBuilder.addRow([
      {
        element: 'a',
        content: propertyId,
        className: 'property',
        attributes: { href: propUrl }
      },
      {
        element: 'text',
        content: count.toString()
      }
    ]);
  });

  container.appendChild(tableBuilder.build());
}

/**
 * Renders item label
 */
function createSpanLabel(divId, json) {
  const { head: { vars }, results } = json;
  const labelElement = DOMUtils.getElementById('itemLabel');

  if (!labelElement || results.bindings.length === 0) return;

  results.bindings.forEach(result => {
    vars.forEach(variable => {
      labelElement.innerHTML = '';
      labelElement.appendChild(DOMUtils.createElement('div', {
        text: result[variable].value
      }));
    });
  });
}

/**
 * Renders search results
 */
function createDivSearchResults(divId, json) {
  const container = DOMUtils.getElementById('searchresults');

  if (!container) return;

  DOMUtils.clearElement(container);

  if (!json.search || json.search.length === 0) {
    container.appendChild(DOMUtils.createElement('div', {
      text: 'No results found',
      className: 'no-results'
    }));
    return;
  }

  json.search.forEach(result => {
    const resultDiv = DOMUtils.createElement('div', {
      className: 'search-result',
      children: [
        DOMUtils.createLink(
          `./provenance.html?item=${result.id}`,
          `${result.label} (${result.id})`
        ),
        DOMUtils.createElement('span', {
          text: `: ${result.description} `
        }),
        DOMUtils.createLink(result.concepturi, '(More...)')
      ]
    });

    container.appendChild(resultDiv);
  });
}

// ============================================================================
// PUBLIC API FUNCTIONS
// ============================================================================

/**
 * Fetch all wiki links for an item
 */
function getAllWikiLinks(item = CONFIG.defaults.item) {
  QueryProcessor.process('allWikiLinks', { item });
}

/**
 * Fetch wiki links for a specific project
 */
function getWikiLinks(wikiproject, item = CONFIG.defaults.item) {
  QueryProcessor.process('wikiLinks', { item, wikiproject });
}

/**
 * Fetch external links count
 */
function getExternalLinksCount(item = CONFIG.defaults.item) {
  QueryProcessor.process('externalLinksCount', { item });
}

/**
 * Fetch item label
 */
function getLabel(item, lang = CONFIG.defaults.language) {
  QueryProcessor.process('label', { item, lang });
}

/**
 * Fetch reference count
 */
function getReferenceCount(item = CONFIG.defaults.item) {
  QueryProcessor.process('referenceCount', { item });
}

/**
 * Fetch external links
 */
function getExternalLinks(item = CONFIG.defaults.item) {
  QueryProcessor.process('externalLinks', { item });
}

/**
 * Fetch references
 */
function getReferences(item = CONFIG.defaults.item) {
  QueryProcessor.process('references', { item });
}

/**
 * Search for items
 */
function getItem() {
  const language = QueryParams.get('language', CONFIG.defaults.language);
  const search = QueryParams.get('search', 'search');
  const queryParams = MediaWikiQuery.buildSearchQuery(search, language);

  MediaWikiQuery.query(queryParams, createDivSearchResults, 'searchresults');
}

/**
 * Fetch all links for an item
 */
function getLinks() {
  const item = QueryParams.get('item');

  if (!item) {
    console.error('No item parameter provided');
    return;
  }

  getLabel(item);
  getExternalLinks(item);
  getReferences(item);

  CONFIG.projects.forEach(project => {
    getWikiLinks(project, item);
  });
}

// ============================================================================
// COMPARISON-SPECIFIC FUNCTIONALITY
// ============================================================================

/**
 * Manages comparison state and rendering
 */
class ComparisonManager {
  constructor() {
    this.items = [];
    this.data = new Map();
  }

  /**
   * Initialize comparison for multiple items
   */
  async compareItems(itemIds) {
    this.items = itemIds;
    this.data.clear();

    // Initialize data structure for each item
    itemIds.forEach(itemId => {
      this.data.set(itemId, {
        label: '',
        externalLinks: 0,
        references: 0,
        wikiLinks: {}
      });
    });

    // Fetch data for all items
    await this._fetchAllData();
    this._renderComparison();
  }

  /**
   * Fetch all necessary data for comparison
   */
  async _fetchAllData() {
    const promises = this.items.map(async (item) => {
      try {
        await Promise.all([
          this._fetchLabel(item),
          this._fetchExternalLinksCount(item),
          this._fetchReferencesCount(item),
          this._fetchAllWikiLinks(item)
        ]);
      } catch (error) {
        console.error(`Error fetching data for ${item}:`, error);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Fetch label for an item
   */
  async _fetchLabel(item) {
    const query = TemplateReplacer.replace(SPARQL_QUERIES.label.query, {
      item,
      lang: CONFIG.defaults.language
    });

    try {
      const result = await WikidataQuery.queryAsync(query);
      const bindings = result.results.bindings;

      if (bindings.length > 0) {
        this.data.get(item).label = bindings[0].label.value;
      }
    } catch (error) {
      console.error(`Error fetching label for ${item}:`, error);
      this.data.get(item).label = item;
    }
  }

  /**
   * Fetch external links count for an item
   */
  async _fetchExternalLinksCount(item) {
    const query = TemplateReplacer.replace(
      SPARQL_QUERIES.externalLinksCount.query,
      { item }
    );

    try {
      const result = await WikidataQuery.queryAsync(query);
      this.data.get(item).externalLinks = result.results.bindings.length;
    } catch (error) {
      console.error(`Error fetching external links for ${item}:`, error);
    }
  }

  /**
   * Fetch references count for an item
   */
  async _fetchReferencesCount(item) {
    const query = TemplateReplacer.replace(
      SPARQL_QUERIES.referenceCount.query,
      { item }
    );

    try {
      const result = await WikidataQuery.queryAsync(query);
      const bindings = result.results.bindings;
      const referencedStatements = new Set();

      bindings.forEach(binding => {
        if (binding.reference) {
          referencedStatements.add(binding.prop.value);
        }
      });

      const percentage = bindings.length > 0
        ? ((referencedStatements.size * 100) / bindings.length).toFixed(2)
        : '0.00';

      this.data.get(item).references = parseFloat(percentage);
    } catch (error) {
      console.error(`Error fetching references for ${item}:`, error);
    }
  }

  /**
   * Fetch all wiki links for an item
   */
  async _fetchAllWikiLinks(item) {
    const query = TemplateReplacer.replace(
      SPARQL_QUERIES.allWikiLinks.query,
      { item }
    );

    try {
      const result = await WikidataQuery.queryAsync(query);
      const projectCounts = {};

      result.results.bindings.forEach(binding => {
        const url = binding.wikilink.value;
        const project = URLUtils.getProjectFromValue(url);
        if (project) {
          projectCounts[project] = (projectCounts[project] || 0) + 1;
        }
      });

      this.data.get(item).wikiLinks = projectCounts;
    } catch (error) {
      console.error(`Error fetching wiki links for ${item}:`, error);
    }
  }

  /**
   * Render the comparison table
   */
  _renderComparison() {
    this._renderLabels();
    this._renderStatistics();
  }

  /**
   * Render item labels
   */
  _renderLabels() {
    const labelContainer = DOMUtils.getElementById('itemLabel');
    if (!labelContainer) return;

    DOMUtils.clearElement(labelContainer);

    const labels = this.items.map(item => {
      const itemData = this.data.get(item);
      return `${itemData.label || item} (${item})`;
    });

    labelContainer.textContent = labels.join(' vs ');
  }

  /**
   * Render all statistics
   */
  _renderStatistics() {
    this._renderExternalIdentifiers();
    this._renderReferences();
    this._renderWikiProjects();
  }

  /**
   * Render external identifiers comparison
   */
  _renderExternalIdentifiers() {
    const container = DOMUtils.getElementById('externalidentifiersvalue');
    if (!container) return;

    DOMUtils.clearElement(container);

    const values = this.items.map(item =>
      this.data.get(item).externalLinks
    );

    this._renderComparisonValue(container, values);
  }

  /**
   * Render references comparison
   */
  _renderReferences() {
    const container = DOMUtils.getElementById('referencesvalue');
    if (!container) return;

    DOMUtils.clearElement(container);

    const values = this.items.map(item =>
      `${this.data.get(item).references}%`
    );

    this._renderComparisonValue(container, values);
  }

  /**
   * Render wiki projects comparison
   */
  _renderWikiProjects() {
    CONFIG.projects.forEach(project => {
      const container = DOMUtils.getElementById(`${project}linksvalue`);
      if (!container) return;

      DOMUtils.clearElement(container);

      const values = this.items.map(item => {
        const wikiLinks = this.data.get(item).wikiLinks;
        return wikiLinks[project] || 0;
      });

      this._renderComparisonValue(container, values);
    });
  }

  /**
   * Render comparison values in a container
   */
  _renderComparisonValue(container, values) {
    if (values.length === 1) {
      // Single item - display normally
      container.textContent = values[0].toString();
    } else {
      // Multiple items - display as comparison
      const comparisonDiv = DOMUtils.createElement('div', {
        className: 'comparison-values'
      });

      values.forEach((value, index) => {
        const itemId = this.items[index];
        const itemData = this.data.get(itemId);
        const label = itemData.label || itemId;

        const valueDiv = DOMUtils.createElement('div', {
          className: 'comparison-item',
          children: [
            DOMUtils.createElement('span', {
              className: 'comparison-label',
              text: label
            }),
            DOMUtils.createElement('span', {
              className: 'comparison-value',
              text: value.toString()
            })
          ]
        });

        comparisonDiv.appendChild(valueDiv);
      });

      container.appendChild(comparisonDiv);
    }
  }
}

// Global comparison manager instance
let comparisonManager = null;

/**
 * Enhanced getLinksAndCompare function that properly handles multiple items
 */
async function getLinksAndCompare(event, form) {
  if (event) {
    event.preventDefault();
  }

  // Get items from URL or form
  let compareParam;

  if (form) {
    const compareInput = form.querySelector('#compare');
    compareParam = compareInput ? compareInput.value : null;
  }

  if (!compareParam) {
    compareParam = QueryParams.get('compare', 'Q1339, Q254');
  }

  const items = compareParam
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

  if (items.length === 0) {
    console.error('No valid items to compare');
    return;
  }

  // Show loading state
  showComparisonLoading();

  // Initialize or reuse comparison manager
  if (!comparisonManager) {
    comparisonManager = new ComparisonManager();
  }

  try {
    await comparisonManager.compareItems(items);
    hideComparisonLoading();
  } catch (error) {
    console.error('Error during comparison:', error);
    hideComparisonLoading();
    showComparisonError(error);
  }
}

/**
 * Show loading state for comparison
 */
function showComparisonLoading() {
  const statisticsSection = DOMUtils.getElementById('statisticssection');
  if (!statisticsSection) return;

  // Add loading indicator if not already present
  let loadingIndicator = DOMUtils.getElementById('comparison-loading');

  if (!loadingIndicator) {
    loadingIndicator = DOMUtils.createElement('div', {
      className: 'comparison-loading',
      attributes: { id: 'comparison-loading' },
      children: [
        DOMUtils.createElement('div', {
          className: 'loading-spinner'
        }),
        DOMUtils.createElement('p', {
          text: 'Loading comparison data...'
        })
      ]
    });

    statisticsSection.insertBefore(loadingIndicator, statisticsSection.firstChild);
  }

  // Disable form during loading
  const compareForm = document.querySelector('form');
  if (compareForm) {
    const submitButton = compareForm.querySelector('input[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
    }
  }
}

/**
 * Hide loading state for comparison
 */
function hideComparisonLoading() {
  const loadingIndicator = DOMUtils.getElementById('comparison-loading');
  if (loadingIndicator) {
    DOMUtils.removeElement(loadingIndicator);
  }

  // Re-enable form
  const compareForm = document.querySelector('form');
  if (compareForm) {
    const submitButton = compareForm.querySelector('input[type="submit"]');
    if (submitButton) {
      submitButton.disabled = false;
    }
  }
}

/**
 * Show error message for comparison
 */
function showComparisonError(error) {
  const statisticsSection = DOMUtils.getElementById('statisticssection');
  if (!statisticsSection) return;

  const errorDiv = DOMUtils.createElement('div', {
    className: 'comparison-error',
    children: [
      DOMUtils.createElement('h3', {
        text: 'Error Loading Comparison'
      }),
      DOMUtils.createElement('p', {
        text: error.message || 'An unexpected error occurred'
      })
    ]
  });

  statisticsSection.insertBefore(errorDiv, statisticsSection.firstChild);
}

// ============================================================================
// ALTERNATIVE: SIDE-BY-SIDE TABLE VIEW
// ============================================================================

/**
 * Alternative comparison renderer using a table layout
 */
class TableComparisonRenderer {
  constructor(items, data) {
    this.items = items;
    this.data = data;
  }

  /**
   * Create a comprehensive comparison table
   */
  createComparisonTable() {
    const container = DOMUtils.getElementById('statisticssection');
    if (!container) return;

    // Clear existing comparison tables
    const existingTables = container.querySelectorAll('.comparison-table');
    existingTables.forEach(table => DOMUtils.removeElement(table));

    const table = this._buildTable();

    // Insert after the header
    const header = container.querySelector('h2');
    if (header && header.nextSibling) {
      container.insertBefore(table, header.nextSibling);
    } else {
      container.appendChild(table);
    }
  }

  /**
   * Build the comparison table
   */
  _buildTable() {
    const table = document.createElement('table');
    table.className = 'comparison-table';

    // Add header row with item labels
    const headerRow = this._createHeaderRow();
    table.appendChild(headerRow);

    // Add data rows
    const rows = [
      this._createRow('External Identifiers', item =>
        this.data.get(item).externalLinks
      ),
      this._createRow('Statements with References', item =>
        `${this.data.get(item).references}%`
      ),
      ...this._createWikiProjectRows()
    ];

    rows.forEach(row => table.appendChild(row));

    return table;
  }

  /**
   * Create header row
   */
  _createHeaderRow() {
    const row = document.createElement('tr');

    // First column: metric name
    const metricHeader = document.createElement('th');
    metricHeader.textContent = 'Metric';
    row.appendChild(metricHeader);

    // Subsequent columns: item labels
    this.items.forEach(item => {
      const th = document.createElement('th');
      const itemData = this.data.get(item);
      th.innerHTML = `${itemData.label || item}<br><small>(${item})</small>`;
      row.appendChild(th);
    });

    return row;
  }

  /**
   * Create a data row
   */
  _createRow(label, valueExtractor) {
    const row = document.createElement('tr');

    // First column: label
    const labelCell = document.createElement('td');
    labelCell.className = 'metric-label';
    labelCell.textContent = label;
    row.appendChild(labelCell);

    // Value columns
    this.items.forEach(item => {
      const td = document.createElement('td');
      td.className = 'metric-value';
      td.textContent = valueExtractor(item);
      row.appendChild(td);
    });

    return row;
  }

  /**
   * Create rows for wiki projects
   */
  _createWikiProjectRows() {
    return CONFIG.projects.map(project => {
      const projectName = this._formatProjectName(project);
      return this._createRow(projectName, item => {
        const wikiLinks = this.data.get(item).wikiLinks;
        return wikiLinks[project] || 0;
      });
    });
  }

  /**
   * Format project name for display
   */
  _formatProjectName(project) {
    const nameMap = {
      'wikipedia': 'Wikipedia Articles',
      'commons.wikimedia': 'Commons Categories',
      'wikivoyage': 'Wikivoyage Articles',
      'wikinews': 'Wikinews Articles',
      'wikisource': 'Wikisource Articles',
      'wiktionary': 'Wiktionary Entries',
      'wikiversity': 'Wikiversity Articles',
      'wikibooks': 'Wikibooks Articles',
      'wikiquote': 'Wikiquote Articles',
      'wikispecies': 'Wikispecies Articles'
    };

    return nameMap[project] || project;
  }
}

/**
 * Alternative comparison using table view
 */
async function getLinksAndCompareTable(event, form) {
  await getLinksAndCompare(event, form);

  if (comparisonManager) {
    const renderer = new TableComparisonRenderer(
      comparisonManager.items,
      comparisonManager.data
    );
    renderer.createComparisonTable();
  }
}

/**
 * Handle search form submission
 */
function findItem(event) {
  if (event) {
    event.preventDefault();
  }

  const language = QueryParams.get('language', CONFIG.defaults.language);
  const search = QueryParams.get('search', 'search');
  const queryParams = MediaWikiQuery.buildSearchQuery(search, language);

  MediaWikiQuery.query(queryParams, createDivSearchResults, 'searchresults');
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Initialize event listeners when DOM is ready
 */
function initializeEventListeners() {
  const searchInput = DOMUtils.getElementById('headersearchtext');

  if (searchInput) {
    searchInput.addEventListener('keydown', (event) => {
      if (event.keyCode === 13) { // Enter key
        const search = searchInput.value.trim();

        if (!search) return;

        if (window.location.pathname.includes('compare.html')) {
          getLinksAndCompare();
        } else {
          window.location.href = `./search.html?search=${encodeURIComponent(search)}`;
          findItem(event);
        }
      }
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeEventListeners);
} else {
  initializeEventListeners();
}

// Export for module usage (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    WikidataQuery,
    MediaWikiQuery,
    QueryProcessor,
    getLinks,
    getLinksAndCompare,
    getItem
  };
}