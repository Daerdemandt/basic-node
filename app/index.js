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
        cb(null, id.toString());
    } catch(error) {
        if (error.stack.startsWith('Error: Unknown SteamID input format')) {
            cb('Unsupported format, but we are working on it'); //TODO: support logins, nicknames and URLs
        } else {
            cb(error);
        }
    };
};


app.get('/parseSteamId', function(req, res, next) {
    let ret = function(error, data) {
        if (error) {
            res.send({'error' : error})
        } else {
            res.send(data)
        }
    };
    stringToSteamId(tests['name'], ret);
});

http.createServer(app).listen(process.env.PORT || 8080, function() {
    console.log('Listening on port ' + (process.env.PORT || 8080));
});
