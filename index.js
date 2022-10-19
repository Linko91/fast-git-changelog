#!/usr/bin/env node
"use strict"

/*
 _        _         _            
| \      (_)       | |           
| |       _  ____  | |  _   ___  
| |      | ||  _ \ | |_/ ) / _ \ 
| |_____ | || | | ||  _ ( | (_) |
\_______)|_||_| |_||_| \_) \___/ 

*/
////////////////////////////////////
/////// REQUIRE MODULE /////////////
////////////////////////////////////
var os = require("os")
var fs = require("fs")
var child_process = require("child_process")
var chalk = require("chalk")
var clear = require("clear")
var CLI = require("clui")
var Spinner = CLI.Spinner
var figlet = require("figlet")
var dayjs = require("dayjs")
var _ = require("lodash")
var path = require("path")
var pjson = require("./package.json")

clear()
console.log(chalk.white.bold(figlet.textSync("fast git changelog", { font: "slant", horizontalLayout: "full" })))
console.log("version " + chalk.white.bold(pjson.version))

var spin = new Spinner("fetching log...")
spin.start()
getLog(process.cwd())

function getLog(repo) {
	var repo = path.normalize(repo)
	var command = 'git log --format="||start||hash=%h---date=%ci---tags=%d---subject=%s---body=%b@end@" --name-status'

	var exec = child_process.exec
	var child = exec(command, function (error, stdout, stderr) {
		if (stderr) {
			spin.stop()
			if (stderr.indexOf("fatal: Not a git repository") !== -1) {
				console.log(chalk.red.bold("\nNot a git repository\n"))
			} else {
				console.log(stderr)
			}
		} else {
			spin.message("writing file...")
			var cl_path = path.join(repo, "CHANGELOG.md")
			fs.writeFile(cl_path, parseLog(stdout), function (err) {
				spin.stop()
				console.log(
					err ||
						"\n" +
							chalk.green.bold("\u2714 ") +
							chalk.white.bold("CHANGELOG created on ") +
							chalk.magenta(cl_path) +
							"\n"
				)
			})
		}
	})
}

function parseLog(raw) {
	var rawcommits = raw.split("||start||")
	const commits = []

	for (var i = 1; i < rawcommits.length; i++) {
		var ic = i - 1
		rawcommits[i] = _.trim(rawcommits[i]).split("@end@")

		commits[ic] = {}
		commits[ic].data = {}
		commits[ic].files = []

		var tmpdata = _.trim(rawcommits[i][0]).split("---")
		for (var key in tmpdata) {
			var tmpval = tmpdata[key].split("=")
			if (tmpval[0] === "tags") {
				var tmpregex = tmpval[1].match(/v?V?[0-9]*\.[0-9]*\.[0-9]*[0-9][\S]*?[,|)]/)
				if (tmpregex && tmpregex.length) {
					tmpval[1] = tmpregex[0].slice(0, -1)
				} else {
					tmpval[1] = ""
				}
			}
			commits[ic].data[tmpval[0]] = tmpval[1]
		}

		var tmpfiles = _.trim(rawcommits[i][1]).split("\n")
		for (var ind in tmpfiles) {
			var tmpval = tmpfiles[ind].split("\t")
			commits[ic].files.push({ type: tmpval[0], path: tmpval[1] })
		}
	}

	var md = ""

	commits.reverse()

	for (var k = 0; k < commits.length; k++) {
		var tmpmd = ""

		if (k === commits.length - 1 && !commits[k].data.tags) {
			commits[k].data.tags = "WIP"
		}

		if (commits[k].data.tags) {
			tmpmd =
				"\n`" +
				commits[k].data.tags +
				"` " +
				dayjs(commits[k].data.date, "YYYY-MM-DD HH:mm:ss ZZ").format("DD/MM/YYYY HH:mm") +
				"\n----\n"
		}
		tmpmd += " * " + commits[k].data.subject + ".\n"

		md = tmpmd + md
	}

	md = "CHANGELOG\n====\n" + md

	return md
}
