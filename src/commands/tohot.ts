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
            console.log(colors.yellow('请输入金额\n'))
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
            console.log(` Trezor 连接状态: ${trezor.isConnected()}`)
            device.on("pin", device.pinCallback);

            device.on('disconnect', function () {
                console.log('Disconnected an opened device');
            });
        } else if (selectDevice === 'ledger') {
            const ledger = new Ledger('mainnet')
            await ledger.init()
            device = ledger;
            type = selectDevice;
            console.log('正在使用ledger....')
            const publicKey = await ledger.getPublicKey()
            const address = await ledger.getBitcoinAddress();
            console.log(`ledger publickKey: ${publicKey} \n  bicoin address  ${address} `)
        }

        const createToHot = new CreateTohot(amount)
        await createToHot.init(device, type)
        await createToHot.contructToHot();

    },
}
