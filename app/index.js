"use strict";


let express = require('express'),
	cookieParser = require('cookie-parser'),
    mUrl = require('url'),
    http = require('http'),
    CSteamCommunity = require('steamcommunity');

let SteamCommunity = new CSteamCommunity();

let opportunisticProcessing = function(options, callback) {
	// Try the first option. If it fails - proceed with the rest recursively.
	if (!options.length) {
		return (data) => callback({error: `No methods were able to process '${data}'`});
	} else {
        let [first, rest] = [options[0], options.slice(1)];
		return (data) => first(null, data, function(err, result) {
			if (!err) {
				return callback(null, result);
			} else {
				return opportunisticProcessing(rest, callback)(data);
			}
		});
	}
}

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

let isOddString = (string) => parseInt(string.slice(-1)) % 2;
let onlyIfNumeric = (fun=(x)=>x) => function(data) {
	if(parseInt(data)) {
		return fun(data);
	} else {
		throw `Expected numeric input, got ${data}`;
	}
};

let urlToSteamId = function (url) {
	let dissected = mUrl.parse(url);
	if(dissected.hostname == 'steamcommunity.com') {
		if (dissected.pathname.startsWith('/id/')) {
			// '/id/gaben/...' -> 'gaben'
			return dissected.pathname.split('/')[2];
		} else if (dissected.pathname.startsWith('/profiles/')) {
			// '/profiles/76561197968052866/...' -> '76561197968052866'
			return dissected.pathname.split('/')[2];
		} else {
			throw `'${url}' does not look like steamcommunity profile url`;
		}
	} else {
		throw `'${url}' does not look like steamcommunity url`;
	}
};


let methods = {
	'asId64'	: nameOutput('id64', mutateInput(onlyIfNumeric(), toSteamUser)),
	'asId3Tail'	: nameOutput('id3', mutateInput(
		onlyIfNumeric((string) => toSteamId(`[U:1:${string}]`)),
		toSteamUser
	)),
	'asOldTail'	: nameOutput('old', mutateInput(
		onlyIfNumeric((string) => toSteamId(`STEAM_0:${isOddString(string)}:${string}`)),
		toSteamUser
	)),
	'asValidId'	: nameOutput('valid', toSteamUser),
	'asUrl'		: nameOutput('url', mutateInput(urlToSteamId, toSteamUser))
};

let resolveSteamUser = function(string, methodsToTry, cb) {
	opportunisticProcessing(methodsToTry.map((name) => methods[name]), cb)(string);
}

const tests = {
    //'steamID' : 'STEAM_0:0:61441014',
    //'steamID3' : '[U:1:122882028]',
    'steamID64' : '76561198083147756',
    'customURL' : 'daerdemandt',
    'name' : 'Daerdemandt',
    'profile' : 'http://steamcommunity.com/profiles/76561198083147756'
};

for (const testCase in tests) {
	const methods = ['asId64', 'asId3Tail', 'asOldTail', 'asValidId', 'asUrl'];
	resolveSteamUser(tests[testCase], methods, function(err, result) {
		if (err || result.value.name != 'Daerdemandt') {
			console.log(`Startup test failed for ${testCase}`);
			console.log(err || `'${result.value.name}' is not Daerdemandt`);
			process.exit();
		}
	});
}


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
	let defaultSettings = {'methodSet':'default', 'methods':[], 'autocopy':null},
		settings = cookieParser.JSONCookie(req.cookies.settings) || defaultSettings,
		methodSets = {
			'default' : ['asId64', 'asId3Tail', 'asOldTail', 'asValidId', 'asUrl'],
			'oldFirst' : ['asOldTail', 'asId64', 'asId3Tail', 'asValidId', 'asUrl']
		};

	let methodsToTry = [],
		query = decodeURIComponent(req.query.string.trim());

	if (settings.methods && settings.methods.length) {
		//TODO: support custom methods ordering
	} else {
		methodsToTry = methodSets[settings.methodSet] || methodSets.default;
	}
	resolveSteamUser(query, methodsToTry, ret);
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
