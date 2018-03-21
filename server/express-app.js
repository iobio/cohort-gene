var express = require('express');
var app = express();
var port = process.env.PORT || 3003;  // SJG changed to coordinate with local hub (was 3001)
var path = require('path');

app.use(express.static(path.join(__dirname, '..', 'client')));

app.get('/', function(req, res){
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

module.exports = app;
