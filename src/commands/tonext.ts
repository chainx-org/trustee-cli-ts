import { GluegunToolbox } from 'gluegun'
import { isNull } from '../utils'
import CreateToNext from "../api/createTonext";

const colors = require('colors')

module.exports = {
    name: 'tonext',
    alias: ['next'],
    run: async (toolbox: GluegunToolbox) => {
        const {
            parameters
        } = toolbox

        const createToNext = new CreateToNext()
        await createToNext.contructToNext();
    },
}
