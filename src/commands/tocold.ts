import { GluegunToolbox } from 'gluegun'
import CreateToCold from '../api/createTocold'


module.exports = {
    name: 'tocold',
    alias: ['tc'],
    run: async (toolbox: GluegunToolbox) => {
        const {
            parameters
        } = toolbox

        let amount: string = parameters.first;


        const constructToCold = new CreateToCold(amount)
        await constructToCold.contructToCold()

    },
}