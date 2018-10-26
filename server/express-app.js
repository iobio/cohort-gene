var express = require('express');
var app = express();
var port = process.env.PORT || 4028;  // SJG changed to coordinate with nv-dev-new deployment
var path = require('path');
var authMap = require('../client/data/auth.json');


app.use(express.static(path.join(__dirname, '..', 'client')));

app.get('/', function(req, res){
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// app.get('/refreshAuthorization', function(req, res) {
//     let hub_api = req.query.hub_api;
//     let redirect_uri = req.query.redirect_uri;
//     let client_id = authMap['client_id'];
//     let oauthLink = `${hub_api}/oauth/authorization?response_type=token&client_id=${client_id}&redirect_uri=${redirect_uri}`;
//     console.log('Last link before sending to hub: ' + oauthLink);
//     //window.testLink = oauthLink;
//     res.redirect(oauthLink);
// });
//
// app.get('/reauthorize?*', function(req, res) {
//   // Add hash back
//   console.log('Made it to express-app and query is: ' + JSON.stringify(req.query));
//   //res.send(req.originalUrl);
//   res.redirect('/');
// })

module.exports = app;
