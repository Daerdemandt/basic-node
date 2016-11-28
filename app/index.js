"use strict";


let express = require('express'),
	cookieParser = require('cookie-parser'),
    mUrl = require('url'),
    http = require('http'),
    monads = require('./monads.js'),
    CSteamCommunity = require('steamcommunity');

let SteamCommunity = new CSteamCommunity();

let opportunisticProcessing = function(options, callback) {
	let E = new monads.ErrorMonad()
	let instructions = [E.try('processing')];
	for (const operation of options) {
		instructions.push(operation);
		instructions.push(E.retry('processing'));
	}
	instructions.pop();
	instructions.push(callback);
	return E.do(...instructions);
};

let mutateInput = (mutate, fun) => function(err, string, cb) {
	try {fun(err, mutate(string), cb)} catch(error) {cb(error)};
};

let toSteamId = (string) => new CSteamCommunity.SteamID(string);

let toSteamUser = function(err, id, cb) {
	if (err) {
		cb(err);
		return;
	}
	if (!id) {
		cb('Empty input provided');
		return;
	}
    SteamCommunity.getSteamUser(id, cb);
};


let nameOutput = (name, fun) => (err, string, rawCb) => fun(err, string, (error, result) => rawCb(error, {'type':name, 'value' : result}));

let isEvenString = (string) => parseInt(string.slice(-1)) % 2;
let onlyIfNumeric = (fun=(x)=>x) => function(data) {
	if(parseInt(data)) {
		return fun(data);
	} else {
		throw `Expected numeric input, got ${data}`;
	}
};

let urlToSteamId = function (url) {
	let dissected = mUrl.parse(url);
	if(dissected.hostname == 'steamcommunity.com') // may or may not start with 'http://'
	{
		let pathArray = dissected.pathname.split('/');
		let trail = pathArray.pop();
		return (trail == '' ? pathArray.pop() : trail); // may or may not end with trailing slash
	}
	else { return null; }
};


let methods = {
	'asId64'	: nameOutput('id64', mutateInput(onlyIfNumeric(), toSteamUser)),
	'asId3Tail'	: nameOutput('id3', mutateInput(
		onlyIfNumeric((string) => toSteamId(`[U:1:${string}]`)),
		toSteamUser
	)),
	'asOldTail'	: nameOutput('old', mutateInput(
		onlyIfNumeric((string) => toSteamId(`STEAM_0:${isEvenString(string)}:${string}`)),
		toSteamUser
	)),
	'asValidId'	: nameOutput('valid', toSteamUser),
	'asUrl'		: nameOutput('url', mutateInput(urlToSteamId, toSteamUser))
};

let stringToSteamId = function(string, cb) {
	let methodsToTry = ['asId64', 'asId3Tail', 'asOldTail', 'asValidId', 'asUrl'].map((name) => methods[name]);
	opportunisticProcessing(methodsToTry, cb)(string);
}

const tests = {
    'steamID' : 'STEAM_0:0:61441014',
    'steamID3' : '[U:1:122882028]',
    'steamID64' : '76561198083147756',
    'customURL' : 'daerdemandt',
    'name' : 'Daerdemandt',
    'profile' : 'http://steamcommunity.com/profiles/76561198083147756'
};


let app = express();

///*
//TODO: implement opportunistingProcessing with something like this:
let tryUntilResult = function(items, process, successCallback, stubData) {
    if (0 == items.length) {
        successCallback(stubData);
    } else {
        let [current, rest] = [items[0], items.slice(1)];
        process(current, function(err, data) {
            if (err || data) {
                successCallback(err, data);
            } else { // no errors, but we need to try other options
                tryUntilResult(rest, process, successCallback, stubData);
            }
        });
    }
}
//*/
app.get('/api/arbitraryStringToSteamId', function(req, res, next) {
    let ret = function(error, data) {
        if (error) {
            res.status(500).send({'error' : error.stack})
        } else if (!data) {
            res.status(404).send({'error' : 'not found'});
        } else {
			console.log(data.type);
			data = data.value;
		let theID = data.steamID; 
            res.send({
                'name' : data.name,
                'steamId64' : theID.toString(),
		'steam32AccountId' : theID.accountid,
		'steamId32' : theID.getSteam3RenderedID(),
		'steam2Old' : theID.getSteam2RenderedID(),
		'steam2New' : theID.getSteam2RenderedID(true),
                'customURL' : data.customURL,
		'profileURL' : 'http://steamcommunity.com/profiles/' + theID.toString(),
		'isGroupchat' : theID.isGroupChat(),
		'isSteamLobby' : theID.isLobby(),
                'memberSince' : data.memberSince,
                'isOnline' : data.onlineState
            }); //TODO: more fields here
        }
    };
    stringToSteamId(decodeURIComponent(req.query.string.trim()), ret);
});

app.get('/', function(req, res, next) {
    res.sendFile( '/static/' + 'index.html');
});

function processConvertQuery(request, response)
{
	response.status(501).send("STUB!");
}


app.post('/api/convert', processConvertQuery);

http.createServer(app).listen(process.env.PORT || 8080, function() {
    console.log('Listening on port ' + (process.env.PORT || 8080));
});
