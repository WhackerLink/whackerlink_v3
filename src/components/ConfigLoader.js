import * as fs from 'fs';
import yaml from 'js-yaml';
import createDebug from 'debug';

export default new class ConfigLoader {
    #debug;

    constructor() {
        this.#debug = createDebug('WhackerLink:ConfigLoader');
    }

    loadYaml(file) {
        this.#debug('Loading config file "%s"', file);

        try {
            fs.accessSync(file, fs.constants.R_OK);
        } catch (err) {
            this.#debug('Could not read config file "%s"', file);
            throw new Error('Could not read config file check that the file exists and is readable.');
        }

        const config = yaml.load(fs.readFileSync(file, 'utf-8'));
        this.#debug('Loaded config file "%s"', file);

        return config;
    }
}
