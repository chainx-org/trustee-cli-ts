import { GluegunToolbox } from 'gluegun'

module.exports = {
    name: 'create',
    alias: ['create'],
    run: async (toolbox: GluegunToolbox) => {
        const {
            parameters,
            // template: { generate },
            print: { warning },
        } = toolbox

        const submit = parameters.first

        console.log(`paramters 1: ${submit} `)

        process.exit(0)
    },
}
