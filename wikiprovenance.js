/*
 * Author: John Samuel
 */

function queryWikidata(sparqlQuery, func, divId) {
     /*
      * Following script is a modified form of automated
      * script generated from Wikidata Query services
      */
     var div = document.getElementById(divId);
     var fetchText = document.createElement("h4"); 
     fetchText.innerHTML = "Fetching data...";
     div.append(fetchText);

     const endpointUrl = 'https://query.wikidata.org/sparql',
     fullUrl = endpointUrl + '?query=' + encodeURIComponent( sparqlQuery )+"&format=json";
     headers = { 'Accept': 'application/sparql-results+json' };

     fetch( fullUrl, { headers } ).then( body => body.json() ).then( json => {
       div.removeChild(fetchText);
       func(divId, json)
    } );
}


function createDivWikipediaLanguageLinks(divId, json) {
  const { head: { vars }, results } = json;
  var languages = document.getElementById(divId);
  var total = document.createElement("h3"); 
  total.innerHTML = "Total " + results.bindings.length + " languages";
  var valuediv = document.getElementById(divId+"value");
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
  for ( const result of results.bindings ) {
    for ( const variable of vars ) {
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
      a.setAttribute('href', link);
      var text = document.createTextNode(decodeURI(link));
      a.append(text);
      td.appendChild(a);
      
      tr.appendChild(td)
      table.appendChild(tr);
    }
  }
  languages.appendChild(table);
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
}

function createDivReferences(divId, json) {
  const { head: { vars }, results } = json;
  var references = document.getElementById(divId);
  refs = {};
  for ( const result of results.bindings ) { 
    if (result["reference"] != undefined) {
      if (result['prop'].value in refs){
        refs[result['prop'].value] +=1;
      }
      else {
        refs[result['prop'].value] =1;
      }
    }
  }
  var statementTotal = document.createElement("h3");
  statementTotal.innerHTML = "Total " + Object.keys(refs).length + " reference statements" +
       " for a total of " + results.bindings.length + " statements";
  if (results.bindings.length != 0) {
    percentage = ((Object.keys(refs).length * 100)/results.bindings.length).toFixed(2);
    statementTotal.innerHTML = statementTotal.innerHTML +
        " ("+ percentage + "%)"
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
  for ( i=0; i<data.length; i++) {
    tr = document.createElement("tr");

    td = document.createElement("td"); 
    td.setAttribute('class', "property");
    var a = document.createElement("a"); 
    a.setAttribute('href', data[i]);
    var text = document.createTextNode(data[i].replace("http://www.wikidata.org/prop/",""));
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

function getWikiLinks(wikiproject) {
  var item = "Q1339";
  if(window.location.search.length > 0) {
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
      FILTER REGEX(STR(?wikilink), ".` + wikiproject + `.org/wiki/") .
    }
    order by ?wikilink
    `;
  queryWikidata(sparqlQuery, createDivWikipediaLanguageLinks, wikiproject+"links");
}

function getExternalLinks() {
  var item = "Q1339";
  if(window.location.search.length > 0) {
    var reg = new RegExp("item=([^&#=]*)");
    var value = reg.exec(window.location.search);
    if (value != null) {
       item = decodeURIComponent(value[1]);
    }
  }

  const sparqlQuery = `
    SELECT ?property 
    {
      ?property rdf:type wikibase:Property;
         wikibase:propertyType wikibase:ExternalId.
      ?property wikibase:claim ?propertyclaim.
      wd:` + item + ` ?propertyclaim []
    }
    order by ?property
    `;
  queryWikidata(sparqlQuery, createDivExternalLinks, "externalidentifiers");
}

function getReferences() {
  var item = "Q1339";
  if(window.location.search.length > 0) {
    var reg = new RegExp("item=([^&#=]*)");
    var value = reg.exec(window.location.search);
    if (value != null) {
       item = decodeURIComponent(value[1]);
    }
  }
  var div = document.getElementById("itemCode");
  div.innerHTML = item;

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

function queryMediaWiki(queryparams, func, divId) {
     var div = document.getElementById(divId);
     var fetchText = document.createElement("h4"); 
     fetchText.innerHTML = "Fetching data...";
     div.append(fetchText);

     const endpointUrl = 'https://www.wikidata.org/w/api.php',
     fullUrl = endpointUrl + '?action=' + queryparams+"&format=json";
   
     fetch( fullUrl, { } ).then( body => body.json() ).then( json => {
       div.removeChild(fetchText);
       func(divId, json)
     } );
}
function createDivSearchResults(divId, json) {
  searchresults = document.getElementById("searchresults");
  while (searchresults.hasChildNodes()) {
    searchresults.removeChild(searchresults.lastChild);
  }
  if("search" in json) {
    for (result in json["search"]) {
      var div = document.createElement("div"); 
      var a = document.createElement("a"); 
      a.setAttribute('href', "./provenance.html?item=" + json["search"][result]["id"]);
      var text = document.createTextNode(json["search"][result]["label"]
                 + " (" + json["search"][result]["id"] +")");
      a.append(text);
      div.append(a);
      var span = document.createElement("span"); 
      var spanText = document.createTextNode(": " +json["search"][result]["description"]+ " ");
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
  if(window.location.search.length > 0) {
    var reg = new RegExp("language=([^&#=]*)");
    var value = reg.exec(window.location.search);
    if (value != null) {
       language = decodeURIComponent(value[1]);
    }
  }
  var search = "search";
  if(window.location.search.length > 0) {
    var reg = new RegExp("search=([^&#=]*)");
    var value = reg.exec(window.location.search);
    if (value != null) {
       search = decodeURIComponent(value[1]);
    }
  }
  queryparams = "wbsearchentities&search="+search+"&language="+
                language + "&props=url&limit=10&origin=*&format=json";
  queryMediaWiki(queryparams, createDivSearchResults, "searchresults");
}

function getLinks() {
  getExternalLinks();
  getReferences();
  getWikiLinks("wikipedia");
  getWikiLinks("wikivoyage");
  getWikiLinks("wikinews");
  getWikiLinks("wikisource");
  getWikiLinks("wiktionary");
  getWikiLinks("wikiversity");
  getWikiLinks("wikibooks");
  getWikiLinks("wikiquote");
  getWikiLinks("wikispecies");
}
document.onkeydown = function(event) {
  event = event || window.event;
  if (event.keyCode == '13') {
    var search = document.getElementById("headersearchtext").value;
    window.location="./search.html?search="+ search;
    findItem(event); 
  } 
}
