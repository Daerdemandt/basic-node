"use strict";
let express = require('express'),
    http = require('http');

let app = express();

app.get('/', function(req, res, next) {
    res.send('It works!');
});

http.createServer(app).listen(process.env.PORT || 8080, function() {
    console.log('Listening on port ' + (process.env.PORT || 8080));
});
