import { GluegunToolbox } from 'gluegun'
import ContstructTx from '../api/contructTx'
//import TrezorConnector from '../multisign/trezor'
//import Ledger from '../multisign/ledger'
const { Select } = require('enquirer');


const promtSelectDevice = async () => {
    console.log('\n')
    const prompt = new Select({
        name: 'select device',
        message: 'select device or privateKey',
        choices: ['privateKey ', 'ledger', 'trezor']
    });
    const device = await prompt.run();

    return device;
}


module.exports = {
    name: 'create',
    alias: ['create'],
    run: async (toolbox: GluegunToolbox) => {
        const {
            parameters
        } = toolbox

        const submit = parameters.first === 'sign'
        // const sign = parameters.second === 'submit'

        const selectDevice = await promtSelectDevice()

        console.log(selectDevice)


        const constructTx = new ContstructTx(submit)
        constructTx.init()
        await constructTx.construct()

    },
}
