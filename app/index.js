"use strict";

let express = require('express'),
	cookieParser = require('cookie-parser'),
    http = require('http'),
	resolver = require('./steam_user_resolver.js');

resolver.runTests();

const defaultUserSettings = {'methodSet':'default', 'methods':[], 'autocopy':null};

let app = express();
app.use(cookieParser());

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
	let settings = cookieParser.JSONCookie(req.cookies.settings) || defaultUserSettings,
		methodsToTry = [],
		query = decodeURIComponent(req.query.string.trim());

	if (settings.methods && settings.methods.length) {
		//TODO: support custom methods ordering
	} else {
		methodsToTry = resolver.methodSets[settings.methodSet] || resolver.methodSets.default;
	}
	resolver.resolveSteamUser(query, methodsToTry, ret);
});

app.get('/', function(req, res, next) {
    res.sendFile( '/static/' + 'index.html');
});

http.createServer(app).listen(process.env.PORT || 8080, function() {
    console.log('Listening on port ' + (process.env.PORT || 8080));
});
