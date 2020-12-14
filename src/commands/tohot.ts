import { GluegunToolbox } from 'gluegun'
import CreateTohot from '../api/createTohot'
import { isNull } from '../utils'

const colors = require('colors')

module.exports = {
    name: 'tohot',
    alias: ['hot'],
    run: async (toolbox: GluegunToolbox) => {
        const {
            parameters
        } = toolbox

        let amount: string = parameters.first;

        if (isNull(amount)) {
            console.log(colors.yellow('请输入金额\n'))
            process.exit(0)
        }
        const createToHot = new CreateTohot(amount)
        await createToHot.contructToHot();

    },
}
