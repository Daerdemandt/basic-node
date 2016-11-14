function performAConvertion (argumentString)
{
	let rq = new XMLHttpRequest(); // create query object
	rq.open('GET', '/api/arbitraryStringToSteamId?string=' +  encodeURIComponent(argumentString), true); // open connection back
	rq.onreadystatechange = function()
		{
			let targetDiv = document.getElementById('container00'); // define hardcoded target
			if(this.readyState == 4 && this.status == 200)
			{
			  // have responseText, may work with it!
			  targetDiv.innerHTML = renderResults(this.responseText); 
			}
			else
			{
			 if(this.status == undefined)
			 {	
			  // state changed, but not our turn. Render waiting animation.
			  targetDiv.innerHTML = renderWaitingAni();
			 }
			 else
			 {
			  // state changed, status defined, but, obviously, not 200. Smth wrong.
			  targetDiv.innerHTML = 'API Error' + (this.responseText != undefined ? ':' + this.responseText  : '');
			 }
			}	
		};

	rq.setRequestHeader('Content-Type', 'text/plain');
	rq.send();
}

function renderResults(resultsJSON) // for an JSON array of answer form a row of colons 
{
	let parsed = JSON.parse(resultsJSON);
	let result = '';
	forEach(parsed, function (element)
		{
			result += '<div class="row">' + formColons(element) + '</div>';
		});
	return result;
}

function formColons(arg) // for each JSON key-value pair, generate a colon.
{
	let result = '';
	for(let key in arg)
	{
		let value = arg[key];
		result += '<div class="col-md-6">' +  value.toString() + '</div>'; 
	}
	return result;
}

function renderWaitingAni()
{
	return '<div id="pleaseWait"></div>'; // hardcoded id. 2bfilled by CSS in background.
}

function fireAway()
{
	let usersDesire = document.getElementById('textfield00').value.toString();
	performAConvertion(usersDesire);
}


