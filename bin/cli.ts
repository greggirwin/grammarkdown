﻿/*!
 *  Copyright 2015 Ron Buckton (rbuckton@chronicles.org)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
import * as nopt from "nopt";
import * as path from "path";
import { readFileSync, writeFileSync } from "fs";
import { readPackageSync } from "./read-package";
import { Dict } from "../lib/core";
import { CompilerOptions, EmitFormat, getDefaultOptions } from "../lib/options";
import { Grammar } from "../lib/grammar";

try {
	require("source-map-support").install();
}
catch (e) { }

interface CommandLineOptions {
	[key: string]: any;
	argv: {
		remain: string[] 
		cooked: string[]
		original: string[]
	};
	"usage": boolean,
	"version": boolean,
	"out": string,
	"format": string[],
	"parsedFormats": EmitFormat[],
	"emit": boolean,
	"emit-on-error": boolean,
	"checks": boolean
}

function main(): void {
	let options = parseOptions();
	if (options.usage) {
		printUsage();
	}
	else if (options.version) {
		printVersion();
	}
	else {
		performCompilation(options);
	}
}

function parseOptions(): CommandLineOptions {
	const options = <CommandLineOptions>nopt({
		"usage": Boolean,
		"version": Boolean,
		"out": [path, null],
		"format": [Array, "markdown", "md", /* "html", */ "ecmarkup", "emu", "ecmu", null],
		"no-emit": Boolean,
		"no-emit-on-error": Boolean,
		"no-checks": Boolean,
	}, {
		"h": "--usage",
		"help": "--usage",
		"v": "--version",
		"o": "--out",
		"f": "--format",
		"md": ["--format", "markdown"],
		// "html": ["--format", "html"]
	});
	
	if (options.argv.original.length === 0) {
		options.usage = true;
		return options;
	}
	
	if (options.argv.remain.length > 1) {
		options.usage = true;
		return options;;
	}
	
	if (options.usage || options.version) {
		return options;
	}
	
	if (options.emit === undefined) {
		options.emit = true;
	}
	
	if (options["emit-on-error"] === undefined) {
		options["emit-on-error"] = true;
	}
	
	if (options.checks === undefined) {
		options.checks = true;
	}
	
	let parsedFormats: EmitFormat[] = [];
	if (options.format) {
		let parsedFormatSet = new Dict<boolean>();
		for (let format of options.format) {
			let parsedFormat: EmitFormat;
			switch (format.toLowerCase()) {
				case "md":
				case "markdown":
					parsedFormat = EmitFormat.markdown;
					break;
					
				case "html":
					parsedFormat = EmitFormat.html;
					break;
					
				case "ecmarkup":
				case "ecmu":
				case "emu":
					parsedFormat = EmitFormat.ecmarkup;
					break;
					
				default:
					options.usage = true;
					return options;
			}
			
			if (!Dict.has(parsedFormatSet, parsedFormat)) {
				parsedFormats.push(parsedFormat);
				Dict.set(parsedFormatSet, parsedFormat, true);
			}
		}
	}
	
	if (parsedFormats.length === 0) {
		parsedFormats.push(EmitFormat.markdown);
	}
	
	options.parsedFormats = parsedFormats;	
	return options;
}

function printUsage(): void {
	let package = readPackageSync(path.resolve(__dirname, "../package.json"));
	console.log(`Version ${package.version}`);
	console.log("Syntax:   grammarkdown [options] [files]");
	console.log();
	console.log("Examples: grammarkdown es6.grammar");
	console.log("          grammarkdown --out es6.md --format markdown es6.grammar");
	console.log();
	console.log("Options:");
	console.log(" -h, --help                       Print this message.");
	console.log(" -v, --version                    Print the version.");
	console.log(" -o, --out FILE                   Specify the output file. If multiple formats are provided, their ");
	console.log("                                  relevant extensions will be appended to the end of the file.");
	//console.log(" -f, --format FORMAT              One or more output formats: 'markdown', 'html', or 'ecmarkup'.");
	console.log(" -f, --format FORMAT              One or more output formats: 'markdown' or 'ecmarkup'.");
	console.log(" --no-emit                        Does not emit output.");
	console.log(" --no-emit-on-error               Does not emit output if there are errors.");
	console.log(" --no-checks                      Does not perform static checking of the grammar.");
	console.log(" --md                             Shortcut for: --format markdown");
	//console.log(" --html                           Shortcut for: --format md");
}

function printVersion(): void {
	let package = readPackageSync(path.resolve(__dirname, "../package.json"));
	console.log(package.version);
}

function performCompilation(options: CommandLineOptions): void {
	let compilerOptions = getDefaultOptions();
	if (options.out) compilerOptions.out = options.out;
	if (!options.checks) compilerOptions.noChecks = true;
	if (!options.emit) compilerOptions.noEmit = true;
	if (!options["emit-on-error"]) compilerOptions.noEmitOnError = true;
	
	let inputFiles = options.argv.remain;
	let grammar = new Grammar(inputFiles, compilerOptions);
	grammar.bind();
	grammar.check();
	
	if (!compilerOptions.noEmit) {
		if (!compilerOptions.noEmitOnError || grammar.diagnostics.count() <= 0) {
			for (let format of options.parsedFormats) {
				compilerOptions.format = format;
				grammar.resetEmitter();
				grammar.emit();
			}
		}
	}
	
	if (grammar.diagnostics.count() > 0) {
		grammar.diagnostics.forEach(message => console.log(message));
		process.exit(-1);
	}
}

main();