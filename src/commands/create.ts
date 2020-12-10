import { GluegunToolbox } from 'gluegun'
import ContstructTx from '../api/contructTx'
// import TrezorConnector from '../multisign/trezor'
// import Ledger from '../multisign/ledger'
//const { Select } = require('enquirer');
// const promtSelectDevice = async () => {
//     console.log('\n')
//     const prompt = new Select({
//         name: 'select device',
//         message: 'select device or privateKey',
//         choices: ['privateKey ', 'ledger', 'trezor']
//     });
//     const device = await prompt.run();

//     return device;
// }


module.exports = {
    name: 'create',
    alias: ['create'],
    run: async (toolbox: GluegunToolbox) => {
        const {
            parameters
        } = toolbox

        let sign: boolean = parameters.first === 'sign';
        let submit: boolean = parameters.second === 'submit' || parameters.first === 'submit';

        // const selectDevice = await promtSelectDevice()

        // let device: any = null;
        // let type: string = 'privateKey'

        // if (selectDevice === 'trezor') {
        //     const trezor = new TrezorConnector();
        //     await trezor.init()
        //     device = trezor;

        // } else if (selectDevice === 'ledger') {
        //     const ledger = new Ledger()
        //     device = ledger;
        // }

        const constructTx = new ContstructTx(sign, submit)
        //constructTx.init(device, type)
        await constructTx.construct()

    },
}
