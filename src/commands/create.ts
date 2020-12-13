import { GluegunToolbox } from 'gluegun'
import ContstructTx from '../api/contructTx'
import TrezorConnector from '../multisign/trezor'
import Ledger from '../multisign/ledger'

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

        let sign: boolean = parameters.first === 'sign';
        let submit: boolean = parameters.second === 'submit' || parameters.first === 'submit';

        const selectDevice = await promtSelectDevice()

        let device: any = null;
        let type: string = selectDevice

        if (selectDevice === 'trezor') {
            const trezor = new TrezorConnector();
            type = selectDevice;
            await trezor.init()
            device = trezor;
            console.log(trezor.isConnected())
        } else if (selectDevice === 'ledger') {
            const ledger = new Ledger('mainnet')
            await ledger.init()
            device = ledger;
            console.log('正在使用ledger....')
            const publicKey = await ledger.getPublicKey()
            console.log(`ledger publickKey: ${publicKey}`)
        }

        const constructTx = new ContstructTx(sign, submit)
        constructTx.init(device, type)
        await constructTx.construct()

    },
}
