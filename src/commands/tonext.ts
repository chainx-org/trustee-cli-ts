import { GluegunToolbox } from 'gluegun'
import CreateTohot from '../api/createTonext'
import { isNull } from '../utils'

const colors = require('colors')

module.exports = {
    name: 'tonext',
    alias: ['next'],
    run: async (toolbox: GluegunToolbox) => {
        const {
            parameters
        } = toolbox

        const createToHot = new CreateTohot()
        await createToHot.contructToHot();
    },
}
