const fs = require('fs');
const diff = require('Diff')

const readline = require("readline");
/*const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});*/

//CONFIG
var input = 'private/index.html';
var patched = ['private/egyebek.html','private/index2.html','private/jegyzetek.html','private/velemeny.html','private/bongeszo.html'];
var page = ['-egyebek','-index','-jegyzetek','-velemeny','-bongeszo'];

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
patched.forEach(function(item, index) {
	fs.readFile(input, 'utf8', function(e, d) {
		if (e) {
			console.log(e); 
		}
		fs.readFile(item, 'utf8', function(err, data) {
			if (err) {
				console.log(err); 
			}
			makePatch(page[index], createPatch(d + '', data + ''))
		});
	});
})
