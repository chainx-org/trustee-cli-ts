import { GluegunToolbox } from 'gluegun'

module.exports = {
    name: 'create',
    alias: ['create'],
    run: async (toolbox: GluegunToolbox) => {
        const {
            //parameters,
            // template: { generate },
            print: { warning },
        } = toolbox

        // const sign = parameters.first
        // const submit = parameters.second

        // console.log(`paramters 1: ${needSign}  paramters 2: ${needSubmit}`)


        warning(`Generated file at models/-model.ts`)
        process.exit(0)
    },
}
