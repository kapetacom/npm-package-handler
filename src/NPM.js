const { spawnSync } = require('child_process');
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
        spawnSync(`npm pack --pack-destination ${escapedPath} ${packageName}`, {
            stdio: 'inherit',
            shell: true,
            env: filteredEnv,
        });

        spawnSync(
            `tar -xzf ${escapedPath}/${packageName.replace(/@/g, '').replace('/', '-')}-*.tgz -C ${escapedPath}`,
            {
                stdio: 'inherit',
                shell: true,
            }
        );

        spawnSync(`npm i --omit=dev`, {
            stdio: 'inherit',
            shell: true,
            cwd: tmpFolder + '/package',
            env: filteredEnv,
        });

        //Move into place
        FSExtra.moveSync(tmpFolder + '/package', this._target, { overwrite: true });
        //Clean up
        FSExtra.removeSync(tmpFolder);
    }

    remove() {
        try {
            // use lstat to check if there is an existing symlink
            // throws if nothing is there, but returns file stats even for invalid links
            // we can't rely on fs.exists, since invalid symlinks return false
            if (FS.lstatSync(this._target)) {
                FSExtra.removeSync(this._target);
            }
        } catch (e) {}
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

        FSExtra.mkdirpSync(Path.dirname(this._target));
        FSExtra.createSymlinkSync(folder, this._target);
    }
}

module.exports = NPM;
