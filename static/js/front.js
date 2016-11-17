const typingStoppedDelay = 500;//ms
const typingElementId = '#textfield00';
const emptyInputMessage = 'Input is empty';

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
	if (argumentString == '')
	{
		renderStub();
	}
	else
	{
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
}

function renderResults(resultsJSON) {// for an JSON array of answer form a row of colons
    //TODO: use a *table* to display the table
	return '<div class="row">' + formColons(JSON.parse(resultsJSON)) + '</div>';
}

function renderStub() // called when convertion discovers empty input
{
	let targetDiv = document.getElementById('container00');
	targetDiv.innerHTML = `	<div class="row">
	       				<div class="col-md-12">
						${emptyInputMessage}
					</div>
				</div>`;
}

function formColons(arg) { // for each JSON key-value pair, generate a colon.
	let result = '';
	for(let key in arg) {
	    if (arg[key]) {
		    result += `<div class="col-md-4">
		        ${key.toString()}
		    </div>`;
		    result += `<div class="col-md-8">
		        <button class="btn" data-clipboard-target="#${key}" title="Copy ${key} to clipboard" style="margin-right:2em">
				    <img src="/static/clipboard.png" style="width:2em">
				</button>
		        <span id="${key}">${arg[key].toString()}</span>
		    </div>`;
		}
	}
	return result;
}

function renderWaitingAni() {
	return '<div id="pleaseWait"></div>'; // hardcoded id. 2bfilled by CSS in background.
}

