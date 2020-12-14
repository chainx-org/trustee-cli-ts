import { GluegunToolbox } from 'gluegun'
import CreateTocold from '../api/createTocold'
import { promtSelectDevice, isNull } from '../utils'
import TrezorConnector from '../multisign/trezor'
import Ledger from '../multisign/ledger'
const colors = require('colors')
const { Worker } = require('worker_threads');

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

        let code = `
            const { parentPort } = require('worker_threads');
            parentPort.on('pin', (device) => {
                console.log('子线程2收到message');
                device.on("pin", device.pinCallback;
            })            
        `

        const selectDevice = await promtSelectDevice()

        let device: any = null;
        let type: string = selectDevice

        if (selectDevice === 'trezor') {
            const trezor = new TrezorConnector();
            type = selectDevice;
            await trezor.init()
            device = trezor;
            console.log("trezro 连接状态:" + trezor.isConnected())
            const worker = new Worker(code);
            worker.postMessage(device);
        } else if (selectDevice === 'ledger') {
            const ledger = new Ledger('mainnet');
            await ledger.init();
            device = ledger;
            type = selectDevice;
            console.log('正在使用ledger....');
            const publicKey = await ledger.getPublicKey();
            console.log(`ledger publickKey: ${publicKey}`)
        }
        const createTocold = new CreateTocold(amount)
        await createTocold.init(device, type)
        await createTocold.contructToCold();

    },
}
