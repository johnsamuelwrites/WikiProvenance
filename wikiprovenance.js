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
  const languages = document.getElementById(divId);
  const count = {};

  for (const project of projects) {
    count[project] = 0;
  }

  for (const result of results.bindings) {
    for (const variable of vars) {
      for (const project of projects) {
        if (result[variable].value.includes(project)) {
          count[project]++;
        }
      }
    }
  }

  for (const project of projects) {
    const valuediv = document.getElementById(project + "linksvalue");
    const valuespin = document.createElement("div");
    valuespin.innerHTML = " " + count[project] + " ";
    
    if (valuediv.childElementCount === 0) {
      valuediv.innerHTML = "";
    }
    
    valuediv.appendChild(valuespin);
  }
}

function createDivWikipediaLanguageLinks(divId, json) {
  const { head: { vars }, results } = json;
  var languages = document.getElementById(divId);
  var total = document.createElement("h3");
  if (divId.includes("commons")) {
    total.innerHTML = "Total " + results.bindings.length + " category";
  }
  else {
    total.innerHTML = "Total " + results.bindings.length + " languages";
  }
  var valuediv = document.getElementById(divId + "value");
  valuediv.innerHTML = results.bindings.length;
  languages.appendChild(total);

  var table = document.createElement("table");
  var th = document.createElement("tr");
  var td = document.createElement("th");
  td.innerHTML = "Language";
  th.appendChild(td);
  td = document.createElement("th");
  td.innerHTML = "Link";
  th.appendChild(td);
  table.append(th);
  for (const result of results.bindings) {
    for (const variable of vars) {
      tr = document.createElement("tr");

      td = document.createElement("td");
      td.setAttribute('class', "property");
      var language = document.createElement("div");
      language.setAttribute('class', "language");
      languageText = result[variable].value;
      link = result[variable].value;
      languageText = languageText.replace("https://", "");
      languageText = languageText.replace(/\..*/, "");
      var text = document.createTextNode(languageText);
      language.appendChild(text);
      td.append(language);
      tr.appendChild(td)

      td = document.createElement("td");
      var a = document.createElement("a");
      //a.setAttribute('href', link);
      a.setAttribute('href', "./references.html?url="
        + link);
      var text = document.createTextNode(decodeURI(link));
      a.append(text);
      td.appendChild(a);

      tr.appendChild(td)
      table.appendChild(tr);
    }
  }
  languages.appendChild(table);
}

function createDivExternalLinksCount(divId, json) {
  const { head: { vars }, results } = json;
  var valuediv = document.getElementById("externalidentifiersvalue");
  var valuespin = document.createElement("div");
  valuespin.innerHTML = " " + results.bindings.length + " ";
  if (valuediv.childElementCount == 0) {
    valuediv.innerHTML = "";
  }
  valuediv.appendChild(valuespin);
}

function createDivExternalLinks(divId, json) {
  const { head: { vars }, results } = json;
  var references = document.getElementById(divId);
  refs = {};
  var statementTotal = document.createElement("h3");
  statementTotal.innerHTML = "Total " + results.bindings.length + " external identifiers";
  var valuediv = document.getElementById("externalidentifiersvalue");
  valuediv.innerHTML = results.bindings.length;
  references.appendChild(statementTotal);
  var table = document.createElement("table");
  var th = document.createElement("tr");
  var td = document.createElement("th");
  td.innerHTML = "External identifier";
  th.appendChild(td);
  td = document.createElement("th");
  td.innerHTML = "Value";
  th.appendChild(td);
  table.append(th);
  for (const result of results.bindings) {
    tr = document.createElement("tr");

    td = document.createElement("td");
    td.setAttribute('class', "property");
    var a = document.createElement("a");
    a.setAttribute('href', result["property"].value);
    var text = document.createTextNode(result["property"].value.replace("http://www.wikidata.org/entity/", ""));
    a.append(text);
    td.appendChild(a);
    tr.appendChild(td);

    td = document.createElement("td");
    text = null;
    text = document.createTextNode(result["value"].value);
    td.appendChild(text);
    tr.appendChild(td);
    table.appendChild(tr);
  }
  references.appendChild(table);
}

function createDivReferencesCount(divId, json) {
  const { head: { vars }, results } = json;
  refs = {};
  for (const result of results.bindings) {
    if (result["reference"] != undefined) {
      if (result['prop'].value in refs) {
        refs[result['prop'].value] += 1;
      }
      else {
        refs[result['prop'].value] = 1;
      }
    }
  }
  if (results.bindings.length != 0) {
    console.log("hello");
    percentage = ((Object.keys(refs).length * 100) / results.bindings.length).toFixed(2);
    var valuediv = document.getElementById("referencesvalue");
    var valuespin = document.createElement("div");
    valuespin.innerHTML = " " + percentage + " ";
    if (valuediv.childElementCount == 0) {
      valuediv.innerHTML = "";
    }
    valuediv.appendChild(valuespin);
  }
}

function createDivReferences(divId, json) {
  const { head: { vars }, results } = json;
  var references = document.getElementById(divId);
  refs = {};
  for (const result of results.bindings) {
    if (result["reference"] != undefined) {
      if (result['prop'].value in refs) {
        refs[result['prop'].value] += 1;
      }
      else {
        refs[result['prop'].value] = 1;
      }
    }
  }
  var statementTotal = document.createElement("h3");
  statementTotal.innerHTML = "Total " + Object.keys(refs).length + " reference statements" +
    " for a total of " + results.bindings.length + " statements";
  if (results.bindings.length != 0) {
    percentage = ((Object.keys(refs).length * 100) / results.bindings.length).toFixed(2);
    statementTotal.innerHTML = statementTotal.innerHTML +
      " (" + percentage + "%)"
    var valuediv = document.getElementById("referencesvalue");
    valuediv.innerHTML = percentage;
  }
  references.appendChild(statementTotal);

  var table = document.createElement("table");
  var th = document.createElement("tr");
  var td = document.createElement("th");
  td.innerHTML = "Property";
  th.appendChild(td);
  td = document.createElement("th");
  td.innerHTML = "Number of statements";
  th.appendChild(td);
  table.append(th);
  data = Object.keys(refs);
  for (i = 0; i < data.length; i++) {
    tr = document.createElement("tr");

    td = document.createElement("td");
    td.setAttribute('class', "property");
    var a = document.createElement("a");
    a.setAttribute('href', data[i]);
    var text = document.createTextNode(data[i].replace("http://www.wikidata.org/prop/", ""));
    a.append(text);
    td.appendChild(a);
    tr.appendChild(td);

    td = document.createElement("td");
    text = null;
    text = document.createTextNode(refs[data[i]]);
    td.appendChild(text);
    tr.appendChild(td);
    table.appendChild(tr);

  }
  references.appendChild(table);
}

function createSpanLabel(divId, json) {
  const { head: { vars }, results } = json;
  var label = document.getElementById("itemLabel");
  for (const result of results.bindings) {
    for (const variable of vars) {
      var valuespin = document.createElement("span");
      valuespin.innerHTML = " * " + result[variable].value + " * ";
      if (label.childElementCount == 0) {
        label.innerHTML = "";
      }
      label.appendChild(valuespin);
    }
  }
}

function getAllWikiLinks(item = "Q1339") {
  if (window.location.search.length > 0) {
    var reg = new RegExp("item=([^&#=]*)");
    var value = reg.exec(window.location.search);
    if (value != null) {
      item = decodeURIComponent(value[1]);
    }
  }

  const sparqlQuery = `
    SELECT ?wikilink
    WHERE 
    {
      ?wikilink schema:about wd:` + item + `.
    }
    order by ?wikilink
    `;
  queryWikidata(sparqlQuery, createDivWikiStatisticsLinks, "statisticssection");
}

function getWikiLinks(wikiproject, item = "Q1339") {
  if (window.location.search.length > 0) {
    var reg = new RegExp("item=([^&#=]*)");
    var value = reg.exec(window.location.search);
    if (value != null) {
      item = decodeURIComponent(value[1]);
    }
  }

  const sparqlQuery = `
    SELECT ?wikilink
    WHERE 
    {
      ?wikilink schema:about wd:` + item + `.
      FILTER REGEX(STR(?wikilink), "` + wikiproject + `.org/") .
    }
    order by ?wikilink
    `;
  queryWikidata(sparqlQuery, createDivWikipediaLanguageLinks, wikiproject + "links");
}

function getExternalLinks() {
  var item = "Q1339";
  if (window.location.search.length > 0) {
    var reg = new RegExp("item=([^&#=]*)");
    var value = reg.exec(window.location.search);
    if (value != null) {
      item = decodeURIComponent(value[1]);
    }
  }

  const sparqlQuery = `
     SELECT ?property ?value 
    {
      ?qualifier rdf:type owl:DatatypeProperty.
      ?property rdf:type wikibase:Property;
         wikibase:propertyType wikibase:ExternalId.
      ?property wikibase:claim ?propertyclaim.
      wd:`+ item + ` ?propertyclaim [?qualifier ?value].
     
    }
order by ?property
    `;
  queryWikidata(sparqlQuery, createDivExternalLinks, "externalidentifiers");
}

function getExternalLinksCount(item = "Q1339") {
  const sparqlQuery = `
     SELECT ?property ?value 
    {
      ?qualifier rdf:type owl:DatatypeProperty.
      ?property rdf:type wikibase:Property;
         wikibase:propertyType wikibase:ExternalId.
      ?property wikibase:claim ?propertyclaim.
      wd:`+ item + ` ?propertyclaim [?qualifier ?value].
     
    }
order by ?property
    `;
  queryWikidata(sparqlQuery, createDivExternalLinksCount, "statisticssection");
}

function getLabel(item) {
  lang = "en";
  if (window.location.search.length > 0) {
    var reg = new RegExp("lang=([^&#=]*)");
    var value = reg.exec(window.location.search);
    if (value != null) {
      lang = decodeURIComponent(value[1]);
    }
  }
  const sparqlQuery = `
      SELECT DISTINCT ?label
      WHERE
      {
        wd:`+ item + ` rdfs:label ?label;
        FILTER(lang(?label) = "`+ lang + `").
      }
      `;
  queryWikidata(sparqlQuery, createSpanLabel, "statisticssection");
}

function getReferenceCount(item = "Q1339") {
  const sparqlQuery = `
    SELECT ?statement ?prop ?reference
    {
      wd:` + item + ` ?prop ?statement.
      OPTIONAL{?statement prov:wasDerivedFrom ?reference}
      FILTER(REGEX(STR(?statement), "http://www.wikidata.org/entity/statement/"))
    }
    ORDER by ?statement
    `;
  queryWikidata(sparqlQuery, createDivReferencesCount, "statisticssection");
}

function getReferences(item = "Q1339") {
  if (window.location.search.length > 0) {
    var reg = new RegExp("item=([^&#=]*)");
    var value = reg.exec(window.location.search);
    if (value != null) {
      item = decodeURIComponent(value[1]);
    }
  }
  var div = document.getElementById("itemCode");
  div.innerHTML = item;
  getLabel(item);

  const sparqlQuery = `
    SELECT ?statement ?prop ?reference
    {
      wd:` + item + ` ?prop ?statement.
      OPTIONAL{?statement prov:wasDerivedFrom ?reference}
      FILTER(REGEX(STR(?statement), "http://www.wikidata.org/entity/statement/"))
    }
    ORDER by ?statement
    `;
  queryWikidata(sparqlQuery, createDivReferences, "references");
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
function findItem(e) {
  e.preventDefault();
  var language = "en";
  if (window.location.search.length > 0) {
    var reg = new RegExp("language=([^&#=]*)");
    var value = reg.exec(window.location.search);
    if (value != null) {
      language = decodeURIComponent(value[1]);
    }
  }
  var search = "search";
  if (window.location.search.length > 0) {
    var reg = new RegExp("search=([^&#=]*)");
    var value = reg.exec(window.location.search);
    if (value != null) {
      search = decodeURIComponent(value[1]);
    }
  }
  queryparams = "wbsearchentities&search=" + search + "&language=" +
    language + "&props=url&limit=10&origin=*&format=json";
  queryMediaWiki(queryparams, createDivSearchResults, "searchresults");
}

function getItem() {
  var language = "en";
  if (window.location.search.length > 0) {
    var reg = new RegExp("language=([^&#=]*)");
    var value = reg.exec(window.location.search);
    if (value != null) {
      language = decodeURIComponent(value[1]);
    }
  }
  var search = "search";
  if (window.location.search.length > 0) {
    var reg = new RegExp("search=([^&#=]*)");
    var value = reg.exec(window.location.search);
    if (value != null) {
      search = decodeURIComponent(value[1]);
    }
  }
  queryparams = "wbsearchentities&search=" + search + "&language=" +
    language + "&props=url&limit=10&origin=*&format=json";
  queryMediaWiki(queryparams, createDivSearchResults, "searchresults");
}

function getLinksAndCompare() {
  var compare = "Q1339, Q254";
  if (window.location.search.length > 0) {
    var reg = new RegExp("compare=([^&#=]*)");
    var value = reg.exec(window.location.search);
    if (value != null) {
      compare = decodeURIComponent(unescape(value[1]));
      compare = compare.replace("+", "");
    }
  }
  console.log(compare);
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

function getLinks() {
  getExternalLinks();
  getReferences();

  for (const project of projects) {
    getWikiLinks(project);
  }
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

