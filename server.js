'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var dns = require('dns');
var cors = require('cors');
var Schema = mongoose.Schema;

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/ 
// mongoose.connect(process.env.MONGOLAB_URI);
mongoose.connect(process.env.MONGO_URI);

// Mongoose Model and Functions
var urlSchema = new Schema({
  short_url: {
    type: Number,
    required: true,
    unique: true
  },
  original_url: {
    type: String,
    required: true,
    unique: true
  }
});

var UrlTable = mongoose.model('UrlTable', urlSchema);

var createShortUrl = function(url, done) {
  var newUrl = new UrlTable({ original_url: url, short_url: Date.now() });
  newUrl.save((err, data) => {
    if(err) { return done(err) }
    return done(null, data);
  });
};

var findUrlByShortUrl = function(shortUrl, done) {
  UrlTable.findOne({ short_url: shortUrl }, (err, data) => {
    if(err) { return done(err) }
    return done(null, data);
  });
};

var findUrl = function(url, done) {
  UrlTable.findOne({ original_url: url }, (err, data) => {
    if(err) { return done(err) }
    return done(null, data);
  });
};

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

  
// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});

app.post('/api/shorturl/new', function(req, res, next) {
  let urlToSave = req.body.url.replace(/(http)(s){0,1}:\/\//i, '');
  dns.lookup(urlToSave, (err, addresses, family) => {
    console.log(urlToSave, addresses);
    if(err) {
      console.log(err);
      res.json({'error': 'invalid URL'});
    } else {
      return findUrl(urlToSave, (err, existingUrl) => {
        if(err) { return next(err); }

        if(existingUrl) {
          res.json({ original_url: existingUrl.original_url, short_url: existingUrl.short_url });
        } else {
          createShortUrl(urlToSave, (err, newUrl) => {
            if(err) { return next(err); }
            res.json({ original_url: newUrl.original_url, short_url: newUrl.short_url });
          });
        }
      });
    }
  });  
});

app.get('/api/shorturl/:short_url', (req, res, next) => {
  findUrlByShortUrl(req.params.short_url, (err, url) => {
    if(err) { return next(err); }
    return res.redirect('http://' + url.original_url);
  });
});

app.listen(port, function () {
  console.log('Node.js listening ...');
});