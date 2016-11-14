const typingStoppedDelay = 500;//ms
const typingElementId = '#textfield00';

function onJQueryReady(method) {
    window.jQuery ? method() : setTimeout(function() { onJQueryReady(method) }, 50);
}

onJQueryReady(function(){watchTyping($(typingElementId), performAConvertion);});

function watchTyping(element, action){
    $element = $(element);
    let lastKeydown = 0;
    let actIfNoMoreKeystrokes = function() {
        if ((new Date).getTime() - lastKeydown >= typingStoppedDelay) {
            action($element.val());
        }
    };
    let onEachUpdate = function(){
        lastKeydown = (new Date).getTime();
        setTimeout(actIfNoMoreKeystrokes, typingStoppedDelay)
    };
    $element.on('keydown', onEachUpdate);
    $element.bind('paste', onEachUpdate);
}


function performAConvertion (argumentString) {
    //TODO: display stub on empty input
	let rq = new XMLHttpRequest(); // create query object
	rq.open('GET', '/api/arbitraryStringToSteamId?string=' +  encodeURIComponent(argumentString), true); // open connection back
	rq.onreadystatechange = function() {
		let targetDiv = document.getElementById('container00'); // define hardcoded target
		if (rq.readyState == 4) {
		    if (rq.status == 200) {
		         targetDiv.innerHTML = renderResults(rq.responseText);
		    } else {
		        targetDiv.innerHTML = 'API Error' + (rq.responseText != undefined ? ':' + rq.responseText  : '');
		    }
		} else {
		    targetDiv.innerHTML = renderWaitingAni();
		}
	};

	rq.setRequestHeader('Content-Type', 'application/json');
	rq.send();
}

function renderResults(resultsJSON) {// for an JSON array of answer form a row of colons
    //TODO: use a *table* to display the table
	return '<div class="row">' + formColons(JSON.parse(resultsJSON)) + '</div>';
}

function formColons(arg) { // for each JSON key-value pair, generate a colon.
	let result = '';
	for(let key in arg) {
		result += '<div class="col-md-6">' +  key.toString() + '</div>';
		result += '<div class="col-md-6">' +  arg[key].toString() + '</div>';
	}
	return result;
}

function renderWaitingAni() {
	return '<div id="pleaseWait"></div>'; // hardcoded id. 2bfilled by CSS in background.
}

