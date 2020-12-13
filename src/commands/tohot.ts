import { GluegunToolbox } from 'gluegun'
import CreateTohot from '../api/createTohot'
import { promtSelectDevice, isNull } from '../utils'
import TrezorConnector from '../multisign/trezor'
import Ledger from '../multisign/ledger'
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
            const publicKey = await device.getPublicKey('mainnet');
            console.log(publicKey)
        }

        await device.getPublicKey();
        const createToHot = new CreateTohot(amount)
        await createToHot.init(device, type)
        await createToHot.contructToHot();

    },
}
