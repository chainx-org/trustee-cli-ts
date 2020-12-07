import { GluegunToolbox } from 'gluegun'
import ContstructTx from '../api/contructTx'

module.exports = {
    name: 'create',
    alias: ['create'],
    run: async (toolbox: GluegunToolbox) => {
        const {
            parameters
        } = toolbox

        const submit = parameters.first === 'submit'

        const constructTx = new ContstructTx(submit)
        constructTx.init()
        await constructTx.construct()

    },
}
