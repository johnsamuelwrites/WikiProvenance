/**
 * Queries MediaWiki API and processes the response
 * @param {string} queryParams - URL query parameters for the API
 * @param {Function} callback - Function to handle the API response
 * @param {string} lang - Language code (e.g., 'en', 'fr')
 * @param {string} divId - ID of the target div element
 * @param {string} url - Original Wikipedia URL
 */
async function queryMediaWiki(queryParams, callback, lang, divId, url) {
  const div = document.getElementById(divId);

  if (!div) {
    console.error(`Element with ID "${divId}" not found`);
    return;
  }

  const fetchText = document.createElement('h4');
  fetchText.textContent = 'Fetching data...';
  fetchText.className = 'loading-message';
  div.appendChild(fetchText);

  // Validate language code
  const sanitizedLang = encodeURIComponent(lang);
  const endpointUrl = `https://${sanitizedLang}.wikipedia.org/w/api.php`;
  const fullUrl = `${endpointUrl}${queryParams}&origin=*&format=json`;

  console.log('Fetching:', fullUrl);

  try {
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json();

    // Remove loading message
    if (fetchText.parentNode) {
      div.removeChild(fetchText);
    }

    console.log('API Response:', json);

    // Check for API errors
    if (json.error) {
      throw new Error(`MediaWiki API error: ${json.error.info}`);
    }

    callback(divId, json, url);

  } catch (error) {
    console.error('Error fetching data:', error);

    if (fetchText.parentNode) {
      div.removeChild(fetchText);
    }

    const errorMessage = document.createElement('p');
    errorMessage.textContent = `Error: ${error.message}`;
    errorMessage.className = 'error-message';
    errorMessage.style.color = 'red';
    div.appendChild(errorMessage);
  }
}

/**
 * Extracts and displays reference count from Wikipedia article
 * @param {string} divId - ID of the target div element
 * @param {Object} json - MediaWiki API response
 * @param {string} url - Original Wikipedia URL
 */
function showReferences(divId, json, url) {
  console.log('Processing references...');

  // Validate JSON structure
  if (!json.parse || !json.parse.wikitext || !json.parse.wikitext['*']) {
    console.error('Invalid JSON structure:', json);
    const errorDiv = document.getElementById(divId);
    if (errorDiv) {
      const errorMsg = document.createElement('p');
      errorMsg.textContent = 'Error: Unable to parse article content';
      errorMsg.style.color = 'red';
      errorDiv.appendChild(errorMsg);
    }
    return;
  }

  const wikitext = json.parse.wikitext['*'];

  // Improved regex for matching references
  // Handles both <ref>...</ref> and <ref ... /> formats
  const refRegex = /<ref(?:\s[^>]*)?>[\s\S]*?<\/ref>|<ref[^>]*\/>/gi;

  // Extract all references
  const references = wikitext.match(refRegex) || [];
  const count = references.length;

  console.log(`Found ${count} references`);

  // Log first few references for debugging
  references.slice(0, 3).forEach((ref, index) => {
    console.log(`Reference ${index + 1}:`, ref.substring(0, 100) + '...');
  });

  const referenceDetails = document.getElementById(divId);

  if (!referenceDetails) {
    console.error(`Element with ID "${divId}" not found`);
    return;
  }

  // Clear previous content
  referenceDetails.innerHTML = '';

  const referenceCount = document.createElement('p');
  referenceCount.textContent = `Total ${count} reference${count !== 1 ? 's' : ''} found`;
  referenceCount.className = 'reference-count';
  referenceDetails.appendChild(referenceCount);

  // Optionally, display individual references
  if (count > 0 && count <= 10) {
    const refList = document.createElement('ul');
    refList.className = 'reference-list';

    references.forEach((ref, index) => {
      const listItem = document.createElement('li');
      // Strip HTML tags for preview
      const preview = ref.replace(/<[^>]*>/g, '').substring(0, 100);
      listItem.textContent = `${index + 1}. ${preview}...`;
      refList.appendChild(listItem);
    });

    referenceDetails.appendChild(refList);
  }
}

/**
 * Main function to analyze references from a Wikipedia URL
 */
function analyseReferences() {
  let url = 'https://en.wikipedia.org/wiki/Main_Page';

  // Parse URL from query string
  if (window.location.search.length > 0) {
    const urlParams = new URLSearchParams(window.location.search);
    const urlParam = urlParams.get('url');

    if (urlParam) {
      url = decodeURIComponent(urlParam);
    }
  }

  // Validate Wikipedia URL
  const wikiUrlRegex = /^https:\/\/[a-z]{2,3}\.wikipedia\.org\/wiki\/.+$/;
  if (!wikiUrlRegex.test(url)) {
    console.error('Invalid Wikipedia URL:', url);
    alert('Please provide a valid Wikipedia URL');
    return;
  }

  // Extract article title
  const titleMatch = url.match(/\/wiki\/(.+)$/);

  if (!titleMatch) {
    console.error('Could not extract title from URL:', url);
    return;
  }

  const title = titleMatch[1];
  const encodedTitle = encodeURIComponent(title);

  console.log('Article title:', title);

  // Display title
  const titleDiv = document.getElementById('itemCode');
  if (titleDiv) {
    titleDiv.textContent = title.replace(/_/g, ' ');
  }

  // Extract language code
  const langMatch = url.match(/^https:\/\/([a-z]{2,3})\.wikipedia\.org/);
  const lang = langMatch ? langMatch[1] : 'en';

  console.log('Language:', lang);

  // Build query parameters
  const queryParams = `?action=parse&page=${encodedTitle}&prop=wikitext`;

  // Query MediaWiki API
  queryMediaWiki(queryParams, showReferences, lang, 'references', url);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', analyseReferences);
} else {
  // DOMContentLoaded already fired
  analyseReferences();
}