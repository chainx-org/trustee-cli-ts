import { GluegunToolbox } from 'gluegun'

module.exports = {
    name: 'init',
    alias: ['init'],
    run: async (toolbox: GluegunToolbox) => {
        const {
            parameters,
            // template: { generate },
            print: { warning },
        } = toolbox

        const name = parameters.first


        warning(`Generated file at models/${name}-model.ts`)
    },
}
