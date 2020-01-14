const {spawnSync} = require('child_process');
const Path = require('path');
const OS = require('os');
const FS = require('fs');
const rimraf = require("rimraf");

class NPM {

    /**
     * Where the package should be located
     * @param target
     */
    constructor(target) {
        this._target = target;
    }

    install(packageName) {
        const tmpFolder = OS.tmpdir() + '/npm-installer/' + packageName;
        if (FS.existsSync(tmpFolder)) {
            rimraf.sync(tmpFolder)
        }

        //Install using npm
        spawnSync(`npm i ${packageName} --prefix ${tmpFolder.replace(/@/g,'\\@')}`, {
            stdio: 'inherit',
            shell: true
        });

        //Move into place
        FS.renameSync(tmpFolder + '/node_modules/' + packageName, this._target);
        FS.renameSync(tmpFolder + '/node_modules', this._target + '/node_modules');

        //Clean up
        rimraf.sync(tmpFolder);
    }

    remove() {
        if (FS.existsSync(this._target)) {
            rimraf.sync(this._target)
        }
    }

    upgrade(packageName) {
        this.remove();
        this.install(packageName);
    }

    link(folder) {
        this.remove();

        const packageFile = Path.join(folder, 'package.json');
        if (!FS.existsSync(packageFile)) {
            throw new Error(`NPM module not found in folder: ${folder}`);
        }

        spawnSync(`ln -s ${folder} ${this._target}`, {
            stdio: 'inherit',
            shell: true
        });

    }
}

module.exports = NPM;