"use strict";

let express = require('express'),
    http = require('http'),
    converter = require('steamid'),
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
    let tryAsId = function () {
        try {
            let id = new CSteamCommunity.SteamID(string);
            SteamCommunity.getSteamUser(id, cb);
        } catch(error) {
            if (error.stack.startsWith('Error: Unknown SteamID input format')) {
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
                tryAsId();
            }
        }
    });
};


app.get('/api/arbitraryStringToSteamId', function(req, res, next) {
    let ret = function(error, data) {
        if (error) {
            res.status(500).send({'error' : error})
        } else {
		let id64 = data.steamID.toString(); // was used in 2 places already, needs a shorthand
		let tonsOfData = new converter(id64); // using steamid package for now, may be rewritten to get rid of it later
            res.send({
                'name' : data.name,
		'Steam Universe' : tonsOfData.universe,
		'Account Type' : tonsOfData.type,
		'Account Instance' : tonsOfData.instance,
		'steam2-old' : tonsOfData.getSteam2RenderedID(),
		'steam2-new' : tonsOfData.getSteam2RenderedID(true),
		'steamId3' : tonsOfData.getSteam3RenderedID(),
		'steam3-accountid' : tonsOfData.accountid,
                'steamId64' : id64,
                'customUrl' : data.customURL,
		'Profile URL' : 'http://steamcommunity.com/profiles/' + id64,
		'is groupchat?' : tonsOfData.isGroupChat(),
		'is Steam Lobby?' : tonsOfData.isLobby(),
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
