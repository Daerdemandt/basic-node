//TODO: repair clipboard.js refusing to work with certain elements (links, customUrls, ?)
const typingStoppedDelay = 500;//ms
const typingElementId = '#textfield00';
const emptyInputMessage = 'Input is empty';
const pleaseWaitMessage = 'Working...';

function $$(selector, element)
{
	return (element || document).querySelectorAll(selector);
}

function onDOMReady(fn)
{
	if (document.readyState != 'loading')
	{
		fn();
	}
	else
	{
		document.addEventListener('DOMContentLoaded', fn);
	}
}

onDOMReady(function(){ watchTyping(typingElementId, performAConvertion); });

function watchTyping(element, action){
    let elt = $$(element).item(0); // grab first one we see, guaranteed to exist while typingElementId exists
    let lastKeydown = 0;
    let actIfNoMoreKeystrokes = function() {
        if ((new Date).getTime() - lastKeydown >= typingStoppedDelay) {
            action(elt.value);
        }
    };
    let onEachUpdate = function(){
        lastKeydown = (new Date).getTime();
        setTimeout(actIfNoMoreKeystrokes, typingStoppedDelay)
    };
    elt.addEventListener('keydown', onEachUpdate);
    elt.addEventListener('paste', onEachUpdate);
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
	renderWaitingAni(); // will be overwritten with renderResults() later
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
		        <button class="app-btn" data-clipboard-target="#${key}" title="Copy ${key} to clipboard">
				    <img class="app-cblabel" src="/static/clipboard.png">
				</button>
		        <span id="${key}">${arg[key].toString()}</span>
		    </div>`;
		}
	}
	return result;
}

function renderWaitingAni() {
	let targetDiv = document.getElementById('container00');
	targetDiv.innerHTML = `<div id="pleaseWait" class="row">
			<div class="col-md-10">
				${pleaseWaitMessage}
			</div>
			<div class="col-md-2">
				<img class="app-waitingani img-rounded" src="/static/steam_ani.gif">
			</div>
		</div>`;
}

