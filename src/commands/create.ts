import { GluegunToolbox } from 'gluegun'
import ContstructTx from '../api/contructTx'

module.exports = {
    name: 'create',
    alias: ['create'],
    run: async (toolbox: GluegunToolbox) => {
        const {
            parameters,
            // template: { generate },
            print: { warning },
        } = toolbox

        const submit = parameters.first === 'submit'

        const constructTx = new ContstructTx(submit)
        constructTx.init()
        await constructTx.construct()

        // console.log(`paramters 1: ${needSign}  paramters 2: ${needSubmit}`)


        warning(`Generated file at models/-model.ts`)
        process.exit(0)
    },
}
