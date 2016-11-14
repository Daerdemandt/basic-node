"use strict";

let express = require('express'),
    http = require('http'),
    steamCommunity = require('steamcommunity');

let steamId = steamCommunity.SteamID;

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
    try {
        let id = new steamId(string);
        cb(null, {'id64':id.toString()});
    } catch(error) {
        if (error.stack.startsWith('Error: Unknown SteamID input format')) {
            cb('Unsupported format, but we are working on it'); //TODO: support logins, nicknames and URLs
        } else {
            cb(error);
        }
    };
};


app.get('/api/arbitraryStringToSteamId', function(req, res, next) {
    let ret = function(error, data) {
        if (error) {
            res.status(500).send({'error' : error})
        } else {
            res.send(data)
        }
    };
    stringToSteamId(req.query.string, ret);
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
