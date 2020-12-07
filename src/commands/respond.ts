import { GluegunToolbox } from 'gluegun'
import Respond from '../api/respond'

module.exports = {
    name: 'respond',
    alias: ['r'],
    run: async (toolbox: GluegunToolbox) => {
        const {
            parameters,
            // template: { generate },
            // print: { warning },
        } = toolbox

        const submit = parameters.first === 'submit'
        const respond = new Respond(submit)
        await respond.init()
        await respond.respond()
    },
}
