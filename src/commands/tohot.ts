import { GluegunToolbox } from 'gluegun'
import CreateTohot from '../api/createTohot'
import { promtSelectDevice, isNull } from '../utils'
import TrezorConnector from '../multisign/trezor'
import Ledger from '../multisign/ledger'
const colors = require('colors')
//const { Worker, MessageChannel } = require('worker_threads');

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

        // let code = `
        //     const { parentPort } = require('worker_threads');
        //     parentPort.on('message', (device) => {
        //         console.log('子线程2收到message');
        //         device.on("button", code => {
        //            this.emit("button", code);
        //         });
        //         device.on("pin", code => {
        //            请输入pin码
        //         });
        //     })            
        // `


        const selectDevice = await promtSelectDevice()

        let device: any = null;
        let type: string = selectDevice

        if (selectDevice === 'trezor') {
            const trezor = new TrezorConnector();
            type = selectDevice;
            await trezor.init()
            device = trezor;
            console.log(` Trezor 连接状态: ${trezor.isConnected()}`)
            // const worker = new Worker(code, { eval: true });
            // worker.postMessage(device);
            // console.log('主线程执行完毕 \n');
        } else if (selectDevice === 'ledger') {
            const ledger = new Ledger('mainnet')
            await ledger.init()
            device = ledger;
            type = selectDevice;
            console.log('正在使用ledger....')
            const publicKey = await ledger.getPublicKey()
            console.log(`ledger publickKey: ${publicKey}`)
        }

        const createToHot = new CreateTohot(amount)
        await createToHot.init(device, type)
        await createToHot.contructToHot();

    },
}
