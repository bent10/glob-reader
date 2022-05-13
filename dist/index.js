var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateMethod = (obj, member, method) => {
  __accessCheck(obj, member, "access private method");
  return method;
};

// src/async.ts
import { join as join2 } from "node:path";
import { promises as fsp2 } from "node:fs";
import { globbyStream } from "globby";

// src/File.ts
import { join } from "node:path";
import { promises as fsp, mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import { Buffer as Buffer2 } from "node:buffer";
import { VFile } from "vfile";
import { matter } from "vfile-matter";
import { is } from "vfile-is";
import { rename } from "vfile-rename";
import { reporter } from "vfile-reporter";
var _writeMap, writeMap_fn, _writeMapSync, writeMapSync_fn, _deleteMap, deleteMap_fn, _deleteMapSync, deleteMapSync_fn, _writeMin, writeMin_fn, _writeMinSync, writeMinSync_fn, _deleteMin, deleteMin_fn, _deleteMinSync, deleteMinSync_fn;
var File = class extends VFile {
  constructor(options) {
    super(options);
    __privateAdd(this, _writeMap);
    __privateAdd(this, _writeMapSync);
    __privateAdd(this, _deleteMap);
    __privateAdd(this, _deleteMapSync);
    __privateAdd(this, _writeMin);
    __privateAdd(this, _writeMinSync);
    __privateAdd(this, _deleteMin);
    __privateAdd(this, _deleteMinSync);
    this.dry = false;
    matter(this, { strip: true });
    if (typeof options === "string" || Buffer2.isBuffer(options) || options instanceof URL) {
    } else if (typeof options === "object") {
      this.dry = !!options.dry;
    }
  }
  get bytes() {
    return this.dry ? 0 : Buffer2.byteLength(this.value || "", "utf8");
  }
  get size() {
    if (this.dry)
      return "0B";
    const units = ["B", "kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    let bytes = this.bytes;
    let i = 0;
    while (bytes >= 1024) {
      bytes /= 1024;
      i++;
    }
    return bytes.toFixed(i === 0 ? 0 : 1) + units[i];
  }
  is(check) {
    return is(this, check);
  }
  rename(renames) {
    rename(this, renames);
  }
  reporter(reporterOptions) {
    return reporter(this, reporterOptions);
  }
  async write() {
    if (this.dry)
      return;
    try {
      await Promise.all([
        this.dirname && fsp.mkdir(join(this.cwd, this.dirname), { recursive: true }),
        fsp.writeFile(join(this.cwd, this.path), this.toString()),
        __privateMethod(this, _writeMap, writeMap_fn).call(this),
        __privateMethod(this, _writeMin, writeMin_fn).call(this)
      ]);
      this.stored = true;
    } catch (error) {
      throw error;
    }
  }
  writeSync() {
    if (this.dry)
      return;
    try {
      this.dirname && mkdirSync(join(this.cwd, this.dirname), { recursive: true });
      writeFileSync(join(this.cwd, this.path), this.toString());
      __privateMethod(this, _writeMapSync, writeMapSync_fn).call(this);
      __privateMethod(this, _writeMinSync, writeMinSync_fn).call(this);
      this.stored = true;
    } catch (error) {
      throw error;
    }
  }
  async delete() {
    if (this.dry)
      return;
    try {
      await Promise.all([
        fsp.unlink(join(this.cwd, this.path)),
        __privateMethod(this, _deleteMap, deleteMap_fn).call(this),
        __privateMethod(this, _deleteMin, deleteMin_fn).call(this)
      ]);
      this.stored = false;
    } catch (error) {
      throw error;
    }
  }
  deleteSync() {
    if (this.dry)
      return;
    try {
      unlinkSync(join(this.cwd, this.path));
      __privateMethod(this, _deleteMapSync, deleteMapSync_fn).call(this);
      __privateMethod(this, _deleteMinSync, deleteMinSync_fn).call(this);
      this.stored = false;
    } catch (error) {
      throw error;
    }
  }
};
_writeMap = new WeakSet();
writeMap_fn = async function() {
  if (!this.map)
    return;
  await fsp.writeFile(join(this.cwd, `${this.path}.map`), JSON.stringify(this.map));
};
_writeMapSync = new WeakSet();
writeMapSync_fn = function() {
  if (!this.map)
    return;
  writeFileSync(join(this.cwd, `${this.path}.map`), JSON.stringify(this.map));
};
_deleteMap = new WeakSet();
deleteMap_fn = async function() {
  if (!this.map)
    return;
  await fsp.unlink(join(this.cwd, `${this.path}.map`));
};
_deleteMapSync = new WeakSet();
deleteMapSync_fn = function() {
  if (!this.map)
    return;
  unlinkSync(join(this.cwd, `${this.path}.map`));
};
_writeMin = new WeakSet();
writeMin_fn = async function() {
  if (!this.min)
    return;
  this.min.code && await fsp.writeFile(join(this.cwd, this.dirname, `${this.stem}.min${this.extname}`), this.min.code);
  this.min.map && await fsp.writeFile(join(this.cwd, this.dirname, `${this.stem}.min${this.extname}.map`), JSON.stringify(this.min.map));
};
_writeMinSync = new WeakSet();
writeMinSync_fn = function() {
  if (!this.min)
    return;
  this.min.code && writeFileSync(join(this.cwd, this.dirname, `${this.stem}.min${this.extname}`), this.min.code);
  this.min.map && writeFileSync(join(this.cwd, this.dirname, `${this.stem}.min${this.extname}.map`), JSON.stringify(this.min.map));
};
_deleteMin = new WeakSet();
deleteMin_fn = async function() {
  if (!this.min)
    return;
  this.min.code && await fsp.unlink(join(this.cwd, this.dirname, `${this.stem}.min${this.extname}`));
  this.min.map && await fsp.unlink(join(this.cwd, this.dirname, `${this.stem}.min${this.extname}.map`));
};
_deleteMinSync = new WeakSet();
deleteMinSync_fn = function() {
  if (!this.min)
    return;
  this.min.code && unlinkSync(join(this.cwd, this.dirname, `${this.stem}.min${this.extname}`));
  this.min.map && unlinkSync(join(this.cwd, this.dirname, `${this.stem}.min${this.extname}.map`));
};

// src/async.ts
async function* readGlob(patterns, options) {
  const {
    encoding,
    dry = false,
    cwd = process.cwd()
  } = typeof options === "string" ? { encoding: options } : options || {};
  const paths = globbyStream(patterns, {
    cwd,
    onlyFiles: true
  });
  for await (const filepath of paths) {
    const [value = "", stat = {}] = dry ? [] : await Promise.all([
      fsp2.readFile(join2(cwd, String(filepath)), encoding),
      fsp2.stat(join2(cwd, String(filepath)))
    ]);
    yield new File({ cwd, path: String(filepath), value, data: { stat }, dry });
  }
}

// src/sync.ts
import { join as join3 } from "node:path";
import { readFileSync, statSync } from "node:fs";
import { globbySync } from "globby";
function* readGlobSync(patterns, options) {
  const {
    encoding,
    dry = false,
    cwd = process.cwd()
  } = typeof options === "string" ? { encoding: options } : options || {};
  const paths = globbySync(patterns, {
    cwd,
    onlyFiles: true
  });
  for (const filepath of paths) {
    const [value = "", stat = {}] = dry ? [] : [
      readFileSync(join3(cwd, filepath), encoding),
      statSync(join3(cwd, filepath))
    ];
    yield new File({ cwd, path: filepath, value, data: { stat }, dry });
  }
}
export {
  File,
  readGlob,
  readGlobSync
};
