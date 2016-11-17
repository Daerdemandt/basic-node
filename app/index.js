"use strict";

let express = require('express'),
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

let urlToSteamId = function (url) {};

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
                let asInt = parseInt(string);
                if (asInt) {
                    let asOld = `STEAM_0:0:${asInt}`;
                    let asV3 = `[U:1:${asInt}]`;
                    tryUntilResult([string, asOld, asV3], tryAsId, cb, null);
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
		'Steam Universe' : theID.universe,
		'Account Type' : theID.type,
		'Account Instance' : theID.instance,
		'steam2-old' : theID.getSteam2RenderedID(),
		'steam2-new' : theID.getSteam2RenderedID(true),
		'steamId3' : theID.getSteam3RenderedID(),
		'steam3-accountid' : theID.accountid,
                'steamId64' : theID.toString(),
                'customUrl' : data.customURL,
		'Profile URL' : 'http://steamcommunity.com/profiles/' + theID.toString(),
		'is groupchat?' : theID.isGroupChat(),
		'is Steam Lobby?' : theID.isLobby(),
                'memberSince' : data.memberSince,
                'online?' : data.onlineState
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
