import { GluegunToolbox } from 'gluegun'
import CreateTocold from '../api/createTocold'
import { isNull } from '../utils'
const colors = require('colors')

module.exports = {
    name: 'tocold',
    alias: ['cold'],
    run: async (toolbox: GluegunToolbox) => {
        const {
            parameters
        } = toolbox

        let amount: string = parameters.first;

        if (isNull(amount)) {
            console.log(colors.yellow('请输入金额'))
            process.exit(0)
        }
        const createTocold = new CreateTocold(amount)
        await createTocold.contructToCold();
    },
}
