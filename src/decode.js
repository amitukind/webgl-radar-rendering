function loadJSON(callback) {

    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open('GET', '../resources/2020_01_21_16_17_01.json', true); 
    xobj.onreadystatechange = function () {
        if (xobj.readyState == 4 && xobj.status == "200") {
           
            callback(xobj.responseText);
        }
    };
    xobj.send(null);
}


function init() {
    loadJSON(function (response) {
        // Parse JSON string into object
        var actual_JSON = JSON.parse(response);
        console.log(actual_JSON);
    });
}

init();



