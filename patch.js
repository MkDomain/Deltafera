const fs = require('fs');
const diff = require('Diff')

const readline = require("readline");
/*const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});*/

//CONFIG
var input = 'index.html';
var patched = 'index2.html';
var page = '-index';

function createPatch(original, modified) {
	return diff.createPatch('file.txt', original, modified, '', '');
}

function makePatch(page, patch) {
	fs.writeFile("mods/" + page + ".patch", patch, function(err) {
		if (err) {
			return console.log(err);
		}
		console.log("The file was saved!");
	});
}
fs.readFile(input, 'utf8', function(e, d) {
	if (e) {
		console.log(e); 
	}
	fs.readFile(patched, 'utf8', function(err, data) {
		if (err) {
			console.log(err); 
		}
		makePatch(page, createPatch(d + '', data + ''))
	});
});