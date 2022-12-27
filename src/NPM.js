const {spawnSync} = require('child_process');
const Path = require('path');
const FS = require('fs');
const FSExtra = require('fs-extra');
const OS = require('os');
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
            FSExtra.removeSync(tmpFolder);
        }

        //Make sure parent dir is there
        FSExtra.mkdirpSync(Path.dirname(this._target));

        //Get rid of any npm environment variables - will confuse the process.
        const filteredEnv = {};
        Object.entries(process.env).forEach(([key,value]) => {
            if (key.toLowerCase().startsWith('npm_')) {
                return;
            }

            filteredEnv[key] = value;
        });

        //Install using npm
        spawnSync(`npm i ${packageName} --prefix ${tmpFolder.replace(/@/g,'\\@')}`, {
            stdio: 'inherit',
            shell: true,
            env: filteredEnv
        });

        //Move into place
        FSExtra.moveSync(tmpFolder + '/node_modules/' + packageName, this._target);
        FSExtra.moveSync(tmpFolder + '/node_modules', this._target + '/node_modules');
        //Clean up
        FSExtra.removeSync(tmpFolder);

    }

    remove() {
        if (FS.existsSync(this._target)) {
            FSExtra.removeSync(this._target);
        }
    }

    upgrade(packageName) {
        this.remove();
        this.install(packageName);
    }

    link(folder) {
        this.remove();

        //Make sure parent dir is there
        FSExtra.mkdirpSync(Path.dirname(this._target));
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