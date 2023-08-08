const { spawn } = require('@kapeta/nodejs-process');
const Path = require('path');
const FS = require('fs');
const FSExtra = require('fs-extra');
const OS = require('os');
const tar = require('tar');
class NPM {
    /**
     * Where the package should be located
     * @param target
     */
    constructor(target) {
        this._target = target;
    }

    async install(packageName) {
        const tmpFolder = OS.tmpdir() + '/npm-installer/' + packageName;
        if (FS.existsSync(tmpFolder)) {
            FSExtra.removeSync(tmpFolder);
        }

        //Make sure parent dir is there
        FSExtra.mkdirpSync(Path.dirname(this._target));
        FSExtra.mkdirpSync(tmpFolder);

        //Get rid of any npm environment variables - will confuse the process.
        const filteredEnv = {};
        Object.entries(process.env).forEach(([key, value]) => {
            if (key.toLowerCase().startsWith('npm_')) {
                return;
            }

            filteredEnv[key] = value;
        });

        //Install using npm
        const escapedPath = tmpFolder.replace(/@/g, '\\@');
        await spawn(`npm pack --pack-destination ${escapedPath} ${packageName}`, [], {
            stdio: 'inherit',
            shell: true,
            env: filteredEnv,
        }).wait();

        const tarFiles = FSExtra.readdirSync(tmpFolder).filter(file => /.tgz$/.test(file));

        if (tarFiles.length !== 1) {
            throw new Error('Invalid kapeta asset');
        }

        const absolutePath = Path.join(tmpFolder, tarFiles[0]);

        console.log('Extracting %s to %s', absolutePath, this._target);
        FSExtra.mkdirpSync(this._target);

        await tar.extract({
            file: absolutePath,
            cwd: this._target,
            strip: 1 //Needed since we've got a random root directory we want to ignore
        });

        await spawn(`npm i --omit=dev`, [], {
            stdio: 'inherit',
            shell: true,
            cwd: this._target,
            env: filteredEnv,
        }).wait();

        //Clean up
        FSExtra.removeSync(tmpFolder);
    }

    remove() {
        try {
            // use lstat to check if there is an existing symlink
            // throws if nothing is there, but returns file stats even for invalid links
            // we can't rely on fs.exists, since invalid symlinks return false
            if (FS.lstatSync(this._target) ||
                FS.existsSync(this._target)) {
                FSExtra.removeSync(this._target);
            }
        } catch (e) {}
    }

    async upgrade(packageName) {
        this.remove();
        return await this.install(packageName);
    }

    link(folder) {
        this.remove();

        const packageFile = Path.join(folder, 'package.json');
        if (!FS.existsSync(packageFile)) {
            throw new Error(`NPM module not found in folder: ${folder}`);
        }

        FSExtra.mkdirpSync(Path.dirname(this._target));
        FSExtra.createSymlinkSync(folder, this._target);
    }
}

module.exports = NPM;
