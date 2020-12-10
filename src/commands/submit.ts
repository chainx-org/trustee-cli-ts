import { GluegunToolbox } from 'gluegun'
import SubmitTx from '../api/submitTx'
import { isNull } from '../utils'

const colors = require('colors')

module.exports = {
    name: 'submit',
    alias: ['submit'],
    run: async (toolbox: GluegunToolbox) => {
        const {
            parameters
        } = toolbox

        const rawTx = parameters.first.toString();
        if (isNull(rawTx)) {
            console.log(colors.red('请添加代签原文: trustee-tools submit 0x000000001000.... '))
            process.exit(0);
        }

        const submit = new SubmitTx(rawTx);
        await submit.contructSubmit();
    },
}
