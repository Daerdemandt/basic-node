"use strict";


let express = require('express'),
    mUrl = require('url'),
    http = require('http'),
    CSteamCommunity = require('steamcommunity');

let SteamCommunity = new CSteamCommunity();



const tests = {
    'steamID' : 'STEAM_0:0:61441014',
    'steamID3' : '[U:1:122882028]',
    'steamID64' : '76561198083147756',
    'customURL' : 'daerdemandt',
    'name' : 'Daerdemandt',
    'profile' : 'http://steamcommunity.com/profiles/76561198083147756'
};


let app = express();

function checkOddnessOutputInt (input) {
	let tailNumber = +input.split('').pop(); // WAAAAAAAAGH
	let isEven = (tailNumber === parseFloat(tailNumber) ? !(tailNumber % 2) : void 0); // boolean!
	return isEven ? '0' : '1';
}

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

let stringToSteamId = function(string, cb) {
    const notFound = 'Error: The specified profile could not be found.';
    let tryAsId = function (string, cb) {
        try {
            console.log('trying ' + string);
            let id = new CSteamCommunity.SteamID(string);
            SteamCommunity.getSteamUser(id, cb);
        } catch(error) {
            if (error.stack.startsWith('Error: SteamID must stand for an individual account in the public')) {
                cb(null, null); // not found
            } else if (error.stack.startsWith('Error: Unknown SteamID input format')) {
                cb('Unsupported format, but we are working on it'); //TODO: support URLs
            } else {
                cb(error);
            }
        };
    };

    SteamCommunity.getSteamUser(string, function(err, result) {
        if (!err) {
            cb(null, result);
        } else {
            if (err.stack.startsWith(notFound)) {
                let idParity = checkOddnessOutputInt(string);
		let queryMethodsArray = []; // decide if a particular query is sane, fill array up, then pass it to worker
		if (parseInt(string)) {
			
                    queryMethodsArray.push('STEAM_0:' + idParity + ':' + string);
		    queryMethodsArray.push(string);
                    if(Number.isSafeInteger(parseInt(string))) {
			queryMethodsArray.push('[U:1:' + string + ']');
		    }
		    queryMethodsArray.reverse();
                    tryUntilResult(queryMethodsArray, tryAsId, cb, null); // looks like v3 is the main priority
                }
		else // assuming NaN, trying as url 
		{
		    let asId64 = urlToSteamId(string);
		    tryAsId(asId64, cb);
		}
            }
        }
    });
};
///*
let tryUntilResult = function(items, process, successCallback, stubData) {
    if (0 == items.length) {
        successCallback(stubData);
    } else {
        //let [current, rest] = [items[0], items.slice(1)];
        let current = items[0];
        let rest = items.slice(1);
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
		let theID = data.steamID; // using steamid package for now, may be rewritten to get rid of it later
            res.send({
                'name' : data.name,
		'steamUniverse' : theID.universe,
		'accountType' : theID.type,
		'accountInstance' : theID.instance,
		'steam2Old' : theID.getSteam2RenderedID(),
		'steam2New' : theID.getSteam2RenderedID(true),
		'steamId32' : theID.getSteam3RenderedID(),
		'steam32AccountId' : theID.accountid,
                'steamId64' : theID.toString(),
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
