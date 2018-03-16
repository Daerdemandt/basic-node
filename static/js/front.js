const typingStoppedDelay = 500;//ms
const typingElementId = '#textfield00';
const emptyInputMessage = 'Input is empty.';
const pleaseWaitMessage = 'Working...';
const noUserMessage = 'Specified user cannot be found.';
const answerFieldsEnum = {	'name' : 'Steam User Name',
		                'steamId64' : 'Steam CommunityID 64bit format',
				'steam32AccountId' : 'CommunityID32 trailing number',
				'steamId32' : 'Steam CommunityID 32bit format',
				'steam2Old' : 'Old Steam ID format',
				'steam2New' : 'New Steam ID format',
		                'customURL' : 'Steam Community Custom URL',
				'profileURL' : 'Link to Steam Community Profile',
				'isGroupchat' : 'Is this Account a Steam GroupChat?',
				'isSteamLobby' : 'Is this Account a Steam Lobby?',
		                'memberSince' : 'On Steam since: ',
		                'isOnline' : 'Visibility Status'
};


function onJQueryReady(method) {
    window.jQuery ? method() : setTimeout(function() { onJQueryReady(method) }, 50);
}

onJQueryReady(function(){ 
	document.getElementById('inputarea00').className = 'col-md-6 app-query-idle';
	watchTyping($(typingElementId), performAConvertion);
});

function watchTyping(element, action){
    $element = $(element);
    let lastKeydown = 0;
    let actIfNoMoreKeystrokes = function() {
        if ((new Date).getTime() - lastKeydown >= typingStoppedDelay) {
            action($element.val());
        }
    };
    let onEachUpdate = function(e){
        lastKeydown = (new Date).getTime();
	if((!e.altKey) && (!e.ctrlKey) && (!e.metaKey)) {  
            setTimeout(actIfNoMoreKeystrokes, typingStoppedDelay);
	    document.getElementById('inputarea00').className = 'col-md-6 app-query-idle';
	}
    };
    $element.on('keydown', onEachUpdate);
    $element.bind('paste', onEachUpdate);
}


function performAConvertion (argumentString) {
	if (argumentString == '')
	{
		document.getElementById('inputarea00').className = 'col-md-6 app-query-empty-input';
		renderStub();
	}
	else
	{
	let rq = new XMLHttpRequest(); // create query object
	rq.open('GET', '/api/arbitraryStringToSteamId?string=' +  encodeURIComponent(argumentString), true); // open connection back
	rq.onreadystatechange = function() {
		let targetDiv = document.getElementById('container00'); // define hardcoded target
		let inputDiv = document.getElementById('inputarea00'); // a target for styling
		if (rq.readyState == 4) {
		    if (rq.status == 200) {
			 inputDiv.className = 'col-md-6 app-query-success';
		         targetDiv.innerHTML = renderResults(rq.responseText);
		    } else 
			if (rq.status == 404) {
			inputDiv.className = 'col-md-6 app-query-no-user'
			renderNotFound();
			} 
			else {
			inputDiv.className = 'col-md-6 app-query-no-user'
		        targetDiv.innerHTML = '<p>API Error. Have you accidentally provided malformed input?</p>'; 
		        targetDiv.innerHTML += '<p>Exactly, error is: </p>' + '<p>' + (rq.responseText != undefined ? rq.responseText  : 'Totally unknown error') + '</p>';
		        targetDiv.innerHTML += '<p>If you are 100% sure your input is valid, please contact devs for some bugsquashing to happen.</p>';
		    }
		} else {
		    inputDiv.className = 'col-md-6 app-query-working';
		    renderWaitingAni();
		}
	};

	renderWaitingAni(); // will be overwritten with renderResults() later
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
		        ${answerFieldsEnum[key].toString()}
		    </div>`;
		    result += `<div class="col-md-8">
		        <button class="app-btn" data-clipboard-target="#${key}" title="Copy ${key} to clipboard">
				    <img class="app-cblabel" src="/static/clipboard.png">
				</button>
		        <span id="${key}">${key.toString() == 'profileURL' ?
					'<a href="' + arg[key].toString() + '" target="_blank">'+ arg[key].toString() +'</a>'
				: 
					(arg[key].toString())}</span>
		    </div>`;
		}
	}
	return result;
}

function renderNotFound() {
	let targetDiv = document.getElementById('container00');
	targetDiv.innerHTML = `<div id="noSuchSteamUser" class="row">
					<div class="col-md-12">
						${noUserMessage}
					</div>
				</div>`;
}

function renderWaitingAni() {
	let targetDiv = document.getElementById('container00');
	targetDiv.innerHTML = `<div id="pleaseWait" class="row">
			<div class="col-md-12">
				${pleaseWaitMessage}
			</div>
			<div class="col-md-12">
				<img class="app-waitingani img-rounded" src="/static/steam_ani.gif">
			</div>
		</div>`;
}

let defaultSettings = {'methodSet':'default', 'methods':[], 'autocopy':null},
	settings = {};

let saveSettings = function() {
	document.cookie = `settings=${encodeURIComponent(JSON.stringify(settings))};max-age=${60*60*24*365}`;
};

let loadSettings = function() {
	let settingsCookie = document.cookie.replace(/(?:(?:^|.*;\s*)settings\s*\=\s*([^;]*).*$)|^.*$/,"$1");
	settings = settingsCookie ? JSON.parse(decodeURIComponent(settingsCookie)) : defaultSettings;
};
loadSettings();

let showSettings = function() {
	alert(JSON.stringify(settings));
};
