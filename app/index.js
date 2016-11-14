"use strict";
let 	express = require('express'),
    	http = require('http'),
 //   	steamid = require('steamid'),
    	bodyparser = require('body-parser');

let app = express();

app.get('/', function(req, res, next) {
    res.sendFile( '/static/' + 'index.html');
});

function processConvertQuery(request, response)
{
	response.send("STUB!");
}


app.post('/api/convert', processConvertQuery);

http.createServer(app).listen(process.env.PORT || 8080, function() {
    console.log('Listening on port ' + (process.env.PORT || 8080));
});
