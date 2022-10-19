#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const child_process_1 = __importDefault(require("child_process"));
const chalk_1 = __importDefault(require("chalk"));
const clear_1 = __importDefault(require("clear"));
const clui_1 = __importDefault(require("clui"));
var Spinner = clui_1.default.Spinner;
const dayjs_1 = __importDefault(require("dayjs"));
const lodash_1 = __importDefault(require("lodash"));
const path_1 = __importDefault(require("path"));
const package_json_1 = __importDefault(require("./package.json"));
(0, clear_1.default)();
console.log(chalk_1.default.white.bold("FAST GIT CHANGELOG"));
console.log("version " + chalk_1.default.white.bold(package_json_1.default.version));
const spin = new Spinner("fetching log...");
spin.start();
getLog(process.cwd());
function getLog(repo) {
    var repo = path_1.default.normalize(repo);
    var command = 'git log --format="||start||hash=%h---date=%ci---tags=%d---subject=%s---body=%b@end@" --name-status';
    var exec = child_process_1.default.exec;
    var child = exec(command, function (error, stdout, stderr) {
        if (stderr) {
            spin.stop();
            if (stderr.indexOf("fatal: Not a git repository") !== -1) {
                console.log(chalk_1.default.red.bold("\nNot a git repository\n"));
            }
            else {
                console.log(stderr);
            }
        }
        else {
            spin.message("writing file...");
            var cl_path = path_1.default.join(repo, "CHANGELOG.md");
            fs_1.default.writeFile(cl_path, parseLog(stdout), function (err) {
                spin.stop();
                console.log(err ||
                    "\n" +
                        chalk_1.default.green.bold("\u2714 ") +
                        chalk_1.default.white.bold("CHANGELOG created on ") +
                        chalk_1.default.magenta(cl_path) +
                        "\n");
            });
        }
    });
}
function parseLog(raw) {
    const rawcommits = raw.split("||start||");
    const commits = [];
    for (var i = 1; i < rawcommits.length; i++) {
        var ic = i - 1;
        rawcommits[i] = lodash_1.default.trim(rawcommits[i]).split("@end@");
        commits[ic] = {};
        commits[ic].data = {};
        commits[ic].files = [];
        var tmpdata = lodash_1.default.trim(rawcommits[i][0]).split("---");
        for (var key in tmpdata) {
            var tmpval = tmpdata[key].split("=");
            if (tmpval[0] === "tags") {
                var tmpregex = tmpval[1].match(/v?V?[0-9]*\.[0-9]*\.[0-9]*[0-9][\S]*?[,|)]/);
                if (tmpregex && tmpregex.length) {
                    tmpval[1] = tmpregex[0].slice(0, -1);
                }
                else {
                    tmpval[1] = "";
                }
            }
            commits[ic].data[tmpval[0]] = tmpval[1];
        }
        var tmpfiles = lodash_1.default.trim(rawcommits[i][1]).split("\n");
        for (var ind in tmpfiles) {
            var tmpval = tmpfiles[ind].split("\t");
            commits[ic].files.push({ type: tmpval[0], path: tmpval[1] });
        }
    }
    var md = "";
    commits.reverse();
    for (var k = 0; k < commits.length; k++) {
        var tmpmd = "";
        if (k === commits.length - 1 && !commits[k].data.tags) {
            commits[k].data.tags = "WIP";
        }
        if (commits[k].data.tags) {
            tmpmd =
                "\n`" +
                    commits[k].data.tags +
                    "` " +
                    (0, dayjs_1.default)(commits[k].data.date, "YYYY-MM-DD HH:mm:ss ZZ").format("DD/MM/YYYY HH:mm") +
                    "\n----\n";
        }
        tmpmd += " * " + commits[k].data.subject + ".\n";
        md = tmpmd + md;
    }
    md = "CHANGELOG\n====\n" + md;
    return md;
}
