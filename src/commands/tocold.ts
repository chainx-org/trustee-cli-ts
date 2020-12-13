import { GluegunToolbox } from 'gluegun'
import CreateTocold from '../api/createTocold'
import { promtSelectDevice, isNull } from '../utils'
import TrezorConnector from '../multisign/trezor'
import Ledger from '../multisign/ledger'
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
            const ledger = new Ledger()
            device = ledger;
            type = selectDevice;
            console.log('正在使用ledger....')
            const publicKey = await ledger.getPublicKey('mainnet')
            console.log(`ledger publickKey: ${publicKey}`)
        }
        const createTocold = new CreateTocold(amount)
        await createTocold.init(device, type)
        await createTocold.contructToCold();

    },
}
