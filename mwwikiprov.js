function queryMediaWiki(queryparams, func, lang, divId, url) {
  var div = document.getElementById(divId);
  var fetchText = document.createElement("h4");
  fetchText.innerHTML = "Fetching data...";
  div.append(fetchText);

  const endpointUrl = 'https://' + lang + ".wikipedia.org/w/api.php";
  fullUrl = endpointUrl + queryparams + '&origin=*&format=json';
  console.log(fullUrl);


  fetch(fullUrl, {}).then(body => body.json()).then(json => {
    div.removeChild(fetchText);
    console.log(json);
    func(divId, json, url);
  });
}

function showReferences(divId, json, url) {
  console.log("helloooooooooooooooo");
  str = json["parse"]["wikitext"]["*"];
  var tempString = str;

  // Multiline global case-insensitive search
  var regex = /<ref(\s|.)*?<\/ref>/igm;
  var pos = 0;
  var count = 0;

  //Getting the count of references
  while ((pos = tempString.search(regex)) > -1) {
    count++;
    console.log("count: " + count + " :" + pos);
    tempString = tempString.substring(pos + 1);
  }

  tempString = str;
  var count = 0;
  while ((referenceStrings = regex.exec(tempString)) != null) {
    count++;
    console.log("count " + count + " :" + referenceStrings[0]);
  }

  var referenceDetails = document.getElementById(divId);
  console.log(referenceDetails);
  var referenceCount = document.createElement("p");
  var referenceCountTxt = document.createTextNode("Total " + count + " references");
  referenceCount.append(referenceCountTxt);
  console.log(referenceCount);
  referenceDetails.append(referenceCount);
}

function analyseReferences() {
  url = "https://en.wikipedia.org/wiki/Main_Page";
  if (window.location.search.length > 0) {
    var reg = new RegExp("url=([^&#=]*)");
    var value = reg.exec(window.location.search);
    if (value != null) {
      url = decodeURIComponent(value[1]);
    }
  }
  var regex = /wiki\/.*$/;
  title = regex.exec(url);
  title = title[0].replace("wiki/", "");
  queryparams = '?action=parse&page=' + title + '&prop=wikitext'
  console.log(title);

  var div = document.getElementById("itemCode");
  div.innerHTML = title.replace(/_/g, " ");

  var lang = url.replace("https://", "");
  lang = lang.replace(/.wikipedia.*/, "");
  console.log(lang);

  queryMediaWiki(queryparams, showReferences, lang, "references", url);
}
