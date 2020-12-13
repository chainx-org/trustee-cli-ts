import { GluegunToolbox } from 'gluegun'
import { promtSelectDevice, isNull, remove0x } from '../utils'
import Api from "../api/chainx";
import { getInputsAndOutputsFromTx } from '../api/bitcoin'
import TrezorConnector from '../multisign/trezor'
import Ledger from '../multisign/ledger'
const colors = require('colors')

module.exports = {
    name: 'sign',
    alias: ['sign'],
    run: async (toolbox: GluegunToolbox) => {
        const {
            parameters
        } = toolbox


        const rawTx = parameters.first.toString();
        if (isNull(rawTx)) {
            console.log(colors.red('请添加代签原文: trustee-tools submit 0x000000001000.... '))
            process.exit(0);
        }

        const selectDevice = await promtSelectDevice()

        let device: any = null;


        if (selectDevice === 'trezor') {
            const trezor = new TrezorConnector();

            await trezor.init()
            device = trezor;
            console.log(trezor.isConnected())
        } else if (selectDevice === 'ledger') {
            const ledger = new Ledger()
            device = ledger;

        }
        const properties = await Api.getInstance().getChainProperties();

        const inputAndOutPutResult = await getInputsAndOutputsFromTx(rawTx,
            properties.bitcoinType);

        const signData = await device.sign(rawTx, inputAndOutPutResult.txInputs, remove0x(process.env.redeem_script), properties.bitcoinType);
        console.log(JSON.stringify(signData))
    },
}
