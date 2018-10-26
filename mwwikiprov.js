function queryMediaWiki(queryparams, func, lang, divId, url) {
     var div = document.getElementById(divId);
     var fetchText = document.createElement("h4"); 
     fetchText.innerHTML = "Fetching data...";
     div.append(fetchText);

     const endpointUrl = 'https://' + lang + ".wikipedia.org/w/api.php',
     fullUrl = endpointUrl + '?action=' + queryparams+"&format=json";
   
     fetch( fullUrl, { } ).then( body => body.json() ).then( json => {
       div.removeChild(fetchText);
       func(divId, json, url)
     } );
}

function analyseReferences() {
  var tempString = str;

  // Multiline global case-insensitive search
  var regex = /<ref(\s|.)*?<\/ref>/igm;
  var pos = 0;
  var count = 0;

  //Getting the count of references
  while((pos = tempString.search(regex)) > -1) {
    count++;
    console.log( "count: " + count + " :" + pos);
    tempString = tempString.substring(pos + 1);
  }

  tempString = str;
  var count = 0;
  while((referenceStrings  = regex.exec(tempString)) != null) {
    count++;
    console.log("count "+ count + " :" + referenceStrings[0]);
  }
}
