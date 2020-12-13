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
            await device.getPublicKey()
            const publicKey = await device.getPublicKey();
            console.log(publicKey)
        }

        await device.getPublicKey()
        const createTocold = new CreateTocold(amount)
        await createTocold.init(device, type)
        await createTocold.contructToCold();

    },
}
