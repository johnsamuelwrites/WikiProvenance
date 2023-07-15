/*
 * Author: John Samuel
 */

const projects = [
  "wikipedia",
  "commons.wikimedia",
  "wikivoyage",
  "wikinews",
  "wikisource",
  "wiktionary",
  "wikiversity",
  "wikibooks",
  "wikiquote",
  "wikispecies"
];

const sparqlQueries = {
  allWikiLinks: {
    query: `SELECT ?wikilink WHERE { ?wikilink schema:about wd:{{item}}. } ORDER BY ?wikilink`,
    callback: createDivWikiStatisticsLinks,
    elementId: "statisticssection"
  },
  wikiLinks: {
    query: `SELECT ?wikilink WHERE { ?wikilink schema:about wd:{{item}}. FILTER REGEX(STR(?wikilink), "{{wikiproject}}.org/") . } ORDER BY ?wikilink`,
    callback: createDivWikipediaLanguageLinks,
    elementId: "{{wikiproject}}links"
  },
  externalLinks: {
    query: `SELECT ?property ?value {
      ?qualifier rdf:type owl:DatatypeProperty.
      ?property rdf:type wikibase:Property;
        wikibase:propertyType wikibase:ExternalId.
      ?property wikibase:claim ?propertyclaim.
      wd:{{item}} ?propertyclaim [?qualifier ?value].
    } ORDER BY ?property`,
    callback: createDivExternalLinks,
    elementId: "externalidentifiers"
  },
  externalLinksCount: {
    query: `SELECT ?property ?value {
      ?qualifier rdf:type owl:DatatypeProperty.
      ?property rdf:type wikibase:Property;
        wikibase:propertyType wikibase:ExternalId.
      ?property wikibase:claim ?propertyclaim.
      wd:{{item}} ?propertyclaim [?qualifier ?value].
    } ORDER BY ?property`,
    callback: createDivExternalLinksCount,
    elementId: "statisticssection"
  },
  label: {
    query: `SELECT DISTINCT ?label WHERE {
      wd:{{item}} rdfs:label ?label;
      FILTER(lang(?label) = "{{lang}}").
    }`,
    callback: createSpanLabel,
    elementId: "statisticssection"
  },
  referenceCount: {
    query: `SELECT ?statement ?prop ?reference {
      wd:{{item}} ?prop ?statement.
      OPTIONAL { ?statement prov:wasDerivedFrom ?reference }
      FILTER (REGEX(STR(?statement), "http://www.wikidata.org/entity/statement/"))
    } ORDER BY ?statement`,
    callback: createDivReferencesCount,
    elementId: "statisticssection"
  },
  references: {
    query: `SELECT ?statement ?prop ?reference {
      wd:{{item}} ?prop ?statement.
      OPTIONAL { ?statement prov:wasDerivedFrom ?reference }
      FILTER (REGEX(STR(?statement), "http://www.wikidata.org/entity/statement/"))
    } ORDER BY ?statement`,
    callback: createDivReferences,
    elementId: "references"
  }
};

function fetchData(url, headers, divId, func) {
  var div = document.getElementById(divId);
  var fetchText = document.createElement("h4");
  fetchText.innerHTML = "Fetching data...";
  div.append(fetchText);

  fetch(url, { headers })
    .then(response => {
      if (!response.ok) {
        throw new Error('Error handling Request');
      }
      return response.json();
    })
    .then(data => {
      div.removeChild(fetchText);
      func(divId, data);
    })
    .catch(error => {
      div.removeChild(fetchText);
      console.error('Error:', error);
    });
}

function queryWikidata(sparqlQuery, func, divId) {
  const endpointUrl = 'https://query.wikidata.org/sparql';
  const queryUrl = endpointUrl + '?query=' + encodeURIComponent(sparqlQuery) + '&format=json';
  const headers = { 'Accept': 'application/sparql-results+json' };

  fetchData(queryUrl, headers, divId, func);
}

function queryMediaWiki(queryparams, func, divId) {
  const endpointUrl = 'https://www.wikidata.org/w/api.php';
  const queryUrl = endpointUrl + '?action=' + queryparams + '&format=json';

  fetchData(queryUrl, {}, divId, func);
}

function createDivWikiStatisticsLinks(divId, json) {
  const { head: { vars }, results } = json;
  const count = {};

  results.bindings.forEach(result => {
    vars.forEach(variable => {
      const project = getProjectFromValue(result[variable].value);
      if (project) {
        count[project] = (count[project] || 0) + 1;
      }
    });
  });

  for (const project in count) {
    const valuediv = document.getElementById(project + "linksvalue");
    const valuespin = document.createElement("div");
    valuespin.innerHTML = ` ${count[project]} `;
    valuediv.innerHTML = "";
    valuediv.appendChild(valuespin);
  }
}

function createDivWikipediaLanguageLinks(divId, json) {
  const { head: { vars }, results } = json;
  const languages = document.getElementById(divId);
  const total = document.createElement("h3");
  total.innerHTML = `Total ${results.bindings.length} ${divId.includes("commons") ? "category" : "languages"}`;
  const valuediv = document.getElementById(divId + "value");
  valuediv.innerHTML = results.bindings.length;
  languages.appendChild(total);

  const table = createTable(["Language", "Link"]);
  results.bindings.forEach(result => {
    vars.forEach(variable => {
      const tr = document.createElement("tr");

      const languageText = getLanguageWithoutProtocol(result[variable].value);
      const languageTd = createTableCell("property", "div", languageText);
      tr.appendChild(languageTd);

      const link = "./references.html?url=" + result[variable].value;
      const linkText = decodeURI(result[variable].value);
      const linkTd = createTableCell(null, "a", linkText, { href: link });
      tr.appendChild(linkTd);

      table.appendChild(tr);
    });
  });

  languages.appendChild(table);
}

function createDivExternalLinksCount(divId, json) {
  const { results } = json;
  const valuediv = document.getElementById("externalidentifiersvalue");
  const valuespin = document.createElement("div");
  valuespin.innerHTML = ` ${results.bindings.length} `;
  valuediv.innerHTML = "";
  valuediv.appendChild(valuespin);
}

function createDivExternalLinks(divId, json) {
  const { head: { vars }, results } = json;
  const references = document.getElementById(divId);
  const statementTotal = createHeader(`Total ${results.bindings.length} external identifiers`);
  const valuediv = document.getElementById("externalidentifiersvalue");
  valuediv.innerHTML = results.bindings.length;
  references.appendChild(statementTotal);

  const table = createTable(["External identifier", "Value"]);
  results.bindings.forEach(result => {
    const tr = document.createElement("tr");

    const property = getValueWithoutProtocol(result["property"].value);
    const propertyTd = createTableCell("property", "a", property, { href: result["property"].value });
    tr.appendChild(propertyTd);

    const valueTd = createTableCell(null, "text", result["value"].value);
    tr.appendChild(valueTd);

    table.appendChild(tr);
  });

  references.appendChild(table);
}

function createDivReferencesCount(divId, json) {
  const { results } = json;
  const refs = {};

  results.bindings.forEach(result => {
    if (result["reference"] !== undefined) {
      const propValue = result['prop'].value;
      refs[propValue] = (refs[propValue] || 0) + 1;
    }
  });

  if (results.bindings.length !== 0) {
    const percentage = ((Object.keys(refs).length * 100) / results.bindings.length).toFixed(2);
    const valuediv = document.getElementById("referencesvalue");
    valuediv.innerHTML = "";
    valuediv.appendChild(createSpanValue(percentage));
  }
}

function createDivReferences(divId, json) {
  const { head: { vars }, results } = json;
  const references = document.getElementById(divId);
  const refs = {};
  results.bindings.forEach(result => {
  if (result.reference !== undefined) {
    const propValue = result.prop.value;
    refs[propValue] = (refs[propValue] || 0) + 1;
  }
  });

  const total = `Total ${Object.keys(refs).length} reference statements for a total of ${results.bindings.length} statements`;
  const percentage = ((Object.keys(refs).length * 100) / results.bindings.length).toFixed(2);
  const statementTotal = createHeader(`${total} (${percentage}%)`);
  const valuediv = document.getElementById("referencesvalue");
  valuediv.innerHTML = percentage;
  references.appendChild(statementTotal);

  const table = createTable(["Property", "Number of statements"]);
  Object.keys(refs).forEach(prop => {
    const tr = document.createElement("tr");

    const property = getValueWithoutProtocol(prop);
    const propertyTd = createTableCell("property", "a", property, { href: prop });
    tr.appendChild(propertyTd);

    const valueTd = createTableCell(null, "text", refs[prop]);
    tr.appendChild(valueTd);

    table.appendChild(tr);
  });

  references.appendChild(table);
}


function createHeader(text) {
  const header = document.createElement("h3");
  header.innerHTML = text;
  return header;
}

function createTable(headers) {
  const table = document.createElement("table");
  const tr = document.createElement("tr");
  headers.forEach(header => {
    const th = document.createElement("th");
    th.innerHTML = header;
    tr.appendChild(th);
  });
  table.appendChild(tr);
  return table;
}

function createTableCell(className, element, text, attributes) {
  const td = document.createElement("td");
  if (className) {
    td.setAttribute("class", className);
  }
  const cellElement = document.createElement(element);
  cellElement.innerHTML = text;
  if (attributes) {
    for (const key in attributes) {
      cellElement.setAttribute(key, attributes[key]);
    }
  }
  td.appendChild(cellElement);
  return td;
}

function createAnchor(href, text) {
  const a = document.createElement("a");
  a.setAttribute("href", href);
  a.innerHTML = text;
  return a;
}

function getValueWithoutProtocol(value) {
  return value.replace(/.*\//, "");
}

function getLanguageWithoutProtocol(languageText) {
      languageText = languageText.replace("https://", "");
      return languageText.replace(/\..*/, "");
      
}

function createSpanValue(value) {
  const valuespin = document.createElement("div");
  valuespin.innerHTML = ` ${value} `;
  return valuespin;
}

function createSpanLabel(divId, json) {
  const { head: { vars }, results } = json;
  const label = document.getElementById("itemLabel");

  results.bindings.forEach(result => {
    vars.forEach(variable => {
      const valuespin = createSpanValue(result[variable].value);
      label.innerHTML = "";
      label.appendChild(valuespin);
    });
  });
}

function createDivSearchResults(divId, json) {
  searchresults = document.getElementById("searchresults");
  while (searchresults.hasChildNodes()) {
    searchresults.removeChild(searchresults.lastChild);
  }
  if ("search" in json) {
    for (result in json["search"]) {
      var div = document.createElement("div");
      var a = document.createElement("a");
      a.setAttribute('href', "./provenance.html?item=" + json["search"][result]["id"]);
      var text = document.createTextNode(json["search"][result]["label"]
        + " (" + json["search"][result]["id"] + ")");
      a.append(text);
      div.append(a);
      var span = document.createElement("span");
      var spanText = document.createTextNode(": " + json["search"][result]["description"] + " ");
      span.append(spanText);
      div.append(span);

      var more = document.createElement("a");
      more.setAttribute('href', json["search"][result]["concepturi"]);
      var moretext = document.createTextNode("(More...)");
      more.append(moretext);
      div.append(more);
      searchresults.append(div);
    }
  }
}

function getAllWikiLinks(item = "Q1339") {
  processQuery("allWikiLinks", { item });
}

function executeQuery(sparqlQuery, callback, elementId) {
  queryWikidata(sparqlQuery, callback, elementId);
}

function processQuery(queryName, params) {
  const { query, callback, elementId } = sparqlQueries[queryName];
  const processedQuery = query.replace(/{{(\w+)}}/g, (match, key) => params[key]);
  const processedElementId = elementId.replace(/{{(\w+)}}/g, (match, key) => params[key]);
  executeQuery(processedQuery, callback, processedElementId);
}


function getWikiLinks(wikiproject, item = "Q1339") {
  processQuery("wikiLinks", { item, wikiproject });
}

function getExternalLinksCount(item = "Q1339") {
  processQuery("externalLinksCount", { item });
}

function getLabel(item, lang = "en") {
  processQuery("label", { item, lang });
}

function getReferenceCount(item = "Q1339") {
  processQuery("referenceCount", { item });
}

function getExternalLinks(item = "Q1339") {
  processQuery("externalLinks", { item });
}

function getReferences(item = "Q1339") {
  processQuery("references", { item });
}

function getItem() {
  const language = getQueryParam("language") || "en";
  const search = getQueryParam("search") || "search";

  const queryparams = `wbsearchentities&search=${search}&language=${language}&props=url&limit=10&origin=*&format=json`;
  queryMediaWiki(queryparams, createDivSearchResults, "searchresults");
}

function getQueryParam(name) {
  if (window.location.search) {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has(name)) {
      return decodeURIComponent(urlParams.get(name));
    }
  }
  return null;
}


function getLinks() {
  const item = getQueryParam('item');
  getLabel(item);
  getExternalLinks(item);
  getReferences(item);

  for (const project of projects) {
    getWikiLinks(project, item);
  }
}

function getLinksAndCompare() {
  var compare = getQueryParam("compare") || "Q1339, Q254";
  compare = decodeURIComponent(compare).replace("+", "");

  items = compare.split(",");
  for (var i in items) {
    item = items[i];
    item = item.replace(/\s/g, '');
    getLabel(item);
    getExternalLinksCount(item);
    getReferenceCount(item);
    getAllWikiLinks(item);
  }
}

function findItem(e) {
  e.preventDefault();

  const language = getQueryParam("language") || "en";
  const search = getQueryParam("search") || "search";
  const queryparams = `wbsearchentities&search=${search}&language=${language}&props=url&limit=10&origin=*&format=json`;

  queryMediaWiki(queryparams, createDivSearchResults, "searchresults");
}


document.getElementById("headersearchtext").addEventListener("keydown", function(event) {
  event = event || window.event;
  console.log(event.target.id);

  if (event.keyCode === 13) {
    var search = this.value;

    if (window.location.pathname.includes("compare.html")) {
      getLinksAndCompare(event);
    } else {
      window.location.href = "./search.html?search=" + encodeURIComponent(search);
      findItem(event);
    }
  }
});

