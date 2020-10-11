const express = require('express')
const Stream = require('stream').Transform
const http = require('http');
const compression = require('compression');
const fs = require('fs');
const app = express()
const diff = require('diff')
const path = require('path')
const fse = require('fs-extra');
const axios = require('axios');
var requester = require('sync-request')
const routes = require('./routes.json');
var mime = require('mime-types')
var keys = Object.keys(routes);
let cache = new Map();
var log = new Stream();
app.get('/status', (req, resp) => {
	var naplo = log.read();
	var used = process.memoryUsage().heapUsed / 1024 / 1024;
	used = Math.round(used * 100) / 100;
	log.push(naplo);
	resp.header('Content-Type', 'text/html; charset=UTF-8');
	resp.end(`<html><head>	<title>Deltaféra - Napló</title>	<script>setInterval(function() {  var xhttp = new XMLHttpRequest();  xhttp.onreadystatechange = function() {    if (this.readyState == 4 && this.status == 200) {     document.getElementById("memory").innerHTML = this.responseText;    }  };  xhttp.open("GET", "memory", true); xhttp.send();}, 1000);</script></head><body><a id="memory">Memória: ${used} MB</a><br><br><br><br><a style="-webkit-user-select: none;  -moz-user-select: none; /* Firefox */-ms-user-select: none; /* IE10+/Edge */user-select: none; /* Standard */">${naplo}</a></body></html>`);
})
app.get('/memory', (req, resp) => {
	var naplo = log.read();
	var used = process.memoryUsage().heapUsed / 1024 / 1024;
	used = Math.round(used * 100) / 100;
	log.push(naplo);
	resp.header('Content-Type', 'text/html; charset=UTF-8');
	resp.end('<a id="memory">Memória: ' + used + ' MB</a>');
})
keys.forEach(function(key, index) {
	app.get(key, (req, resp) => {
		if (routes[key]['rewrite'] !== undefined) {
			resp.header('Content-Type', mime.lookup(path.extname(req.originalUrl)));
			if (cache.has(routes[key]['rewrite'])) {
				resp.end(cache.get(routes[key]['rewrite']));
			} else {
				fs.readFile(routes[key]['rewrite'], function(e, d) {
					if (e) {
						console.log(e);
					}
					cache.set(routes[key]['rewrite'], d);
					log.push('[' + new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '') + "] [Cache] Beolvasva: " + routes[key]['rewrite'] + '<br>')
					console.log("[Cache] Beolvasva: " + routes[key]['rewrite']);
					resp.end(d);
				});
			}
		} else if (routes[key]['merge'] !== undefined) {
			resp.header('Content-Type', mime.lookup(path.extname(req.originalUrl)));
			if (cache.has(routes[key]['merge'])) {
				resp.end(cache.get(routes[key]['merge']));
			} else {
				var merged = new Stream();
				routes[key]['merge'].split(';').forEach(function(k,i) {
					var res = requester('GET', 'http://bioszfera.com/' + k)
					merged.push(res.getBody())
				})
				var merged2 = merged.read() + '';
				cache.set(routes[key]['merge'],merged2);
				resp.end(cache.get(routes[key]['merge']));
			}
		}else {
			var modding = routes[key]['mod'] == 'none' ? false : true;
			req.originalUrl = req.originalUrl == '/' ? '/index.html' : req.originalUrl;
			var original = routes[key]['original'].replace('$REQ', req.originalUrl);
			if (cache.has(original)) {
				if (modding) {
					fs.readFile(routes[key]['mod'], function(e, d) {
						if (e) {
							console.log(e);
						}
						resp.header('Content-Type', mime.lookup(path.extname(req.originalUrl)) + '; charset=UTF-8');
						resp.end(diff.applyPatch(cache.get(original) + '', d + ''));
					});
				} else {
					resp.header('Content-Type', mime.lookup(path.extname(req.originalUrl)) + '; charset=UTF-8');
					resp.end(cache.get(original));
				}
			} else {
				var modding = routes[key]['mod'] == 'none' ? false : true;
				var original = routes[key]['original'].replace('$REQ', req.originalUrl);
				var options = {
					host: 'bioszfera.com',
					path: original
				}
				var request = http.request(options, function(res) {
					var data = new Stream();
					res.on('data', function(chunk) {
						data.push(chunk);
					});
					res.on('end', function() {
						var contentType = res.headers['content-type'];
						resp.header("Content-Type", 'Content-Type', 'text/html; charset=UTF-8');
						var all = data.read();
						if (res.statusCode == 404) {
							if (cache.has('404.html')) {
								resp.end(cache.get('404.html'));
							}else{
								fs.readFile('404.html', 'UTF-8', function(e, d) {
									if (e) {
										console.log(e);
									}
									cache.set('404.html', d);
									log.push('[' + new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '') + "] [Cache] Beolvasva: 404.html<br>")
									console.log("[Cache] Beolvasva: 404.html");
									resp.end(d);
								});
							}
						}else if (res.statusCode == 403 || res.statusCode == 301) {
							if (cache.has('403.html')) {
								resp.end(cache.get('403.html'));
							}else{
								fs.readFile('403.html', 'UTF-8', function(e, d) {
									if (e) {
										console.log(e);
									}
									cache.set('403.html', d);
									log.push('[' + new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '') + "] [Cache] Beolvasva: 403.html<br>")
									console.log("[Cache] Beolvasva: 403.html");
									resp.end(d);
								});
							}
						}else{
						cache.set(original, all);
						log.push('[' + new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '') + "] [Cache] Mentve: " + original + '<br>')
						console.log("[Cache] Mentve: " + original);
						if (modding) {
							fs.readFile(routes[key]['mod'], 'utf8', function(e, d) {
								if (e) {
									console.log(e);
								}
								resp.end(diff.applyPatch(all + '', d + ''));
							});
						} else {
							resp.end(all);
						}
						}
					});
				});
				request.on('error', function(e) {
					console.log(e.message);
				});
				request.end();
			}
		}
	})
});
app.use(compression());

function ensureDirectoryExistence(filePath) {
	var dirname = path.dirname(filePath);
	if (fs.existsSync(dirname)) {
		return true;
	}
	ensureDirectoryExistence(dirname);
	fs.mkdirSync(dirname);
}

function exists(file) {
	try {
		if (fs.existsSync(file)) {
			return true;
		}
	} catch (err) {
		return false;
	}
	return false;
}
app.listen(process.env.PORT || 3000, () => {
	var port = process.env.PORT || 3000;
	log.push('[' + new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '') + '] Deltaféra elindult itt: http://localhost:' + port + '<br>');

	console.log('Deltaféra elindult itt: http://localhost:'  + port)
})