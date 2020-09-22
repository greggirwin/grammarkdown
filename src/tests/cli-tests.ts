/*!
 * Copyright (c) 2020 Ron Buckton (rbuckton@chronicles.org)
 *
 * This file is licensed to you under the terms of the MIT License, found in the LICENSE file
 * in the root of this repository or package.
 */

import { assert, expect } from "chai";
import { execSync, spawnSync } from "child_process";

describe("cli", () => {
  it("exits cleanly when given good input", () => {
    execSync("node bin/grammarkdown src/tests/resources/specs/es6.grammar --noEmit", { stdio: "ignore", encoding: "utf8" });
  });

  it("exits with an error when given bad input", () => {
    assert.throws(() => {
      execSync("node bin/grammarkdown src/tests/resources/specs/test.grammar --noEmit", { stdio: "ignore", encoding: "utf8" });
    });
  });

  it("prints help given --help", () => {
    let help = execSync("node bin/grammarkdown --help", { encoding: "utf8" });
    assert(/Prints this message/.test(help));
  });

  it("prints version given --version", () => {
    let version = execSync("node bin/grammarkdown --version", { encoding: "utf8" });
    assert.strictEqual(version.trim(), process.env.npm_package_version!.trim());
  });

  it("prints diagnostics given --diagnostics", () => {
    const { stderr } = spawnSync(process.execPath, ["bin/grammarkdown", "src/tests/resources/specs/es6.grammar", "--noEmit", "--diagnostics"], { stdio: "pipe", encoding: "utf8" });
    expect(stderr).matches(/^ioRead:\s+\d+ms$/m);
    expect(stderr).matches(/^ioWrite:\s+\d+ms$/m);
    expect(stderr).matches(/^parse:\s+\d+ms$/m);
    expect(stderr).matches(/^bind:\s+\d+ms$/m);
    expect(stderr).matches(/^check:\s+\d+ms$/m);
    expect(stderr).matches(/^emit:\s+\d+ms$/m);
  });
});
