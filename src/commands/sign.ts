import { GluegunToolbox } from 'gluegun'
import { promtSelectDevice, isNull, remove0x } from '../utils'
import Api from "../api/chainx";
import { getInputsAndOutputsFromTx } from '../api/bitcoin'
import TrezorConnector from '../multisign/trezor'
import Ledger from '../multisign/ledger'
const bitcoin = require("bitcoinjs-lib");
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
            console.log("trezro 连接状态:" + trezor.isConnected())
        } else if (selectDevice === 'ledger') {
            const ledger = new Ledger('mainnet')
            await ledger.init();
            device = ledger;
            console.log('正在使用ledger....')
            const publicKey = await ledger.getPublicKey()
            console.log(`ledger publickKey: ${publicKey}`)
        }
        const properties = await Api.getInstance().getChainProperties();

        const inputAndOutPutResult = await getInputsAndOutputsFromTx(rawTx,
            "mainnet");
        console.log(`selectDevice ${selectDevice}`)
        if (selectDevice === 'trezor' || selectDevice === 'ledger') {
            console.log(`trezor sign 111`)
            try {
                console.log(selectDevice)
                console.log(`trezor sign 222 ${properties.bitcoinType}`)

                const signData = await device.sign(rawTx, inputAndOutPutResult.txInputs, remove0x(process.env.redeem_script), 'mainnet');
                console.log(`trezor sign 111`)
                console.log(colors.green(`签名成功\n`))
                console.log(colors.red(`签名后交易原文:\n  ${JSON.stringify(signData)}`))
                process.exit(0);
            } catch (err) {
                console.log(colors.red('签名失败:' + JSON.stringify(err)))
                process.exit(0);
            }

        } else {

            const tx = bitcoin.Transaction.fromHex(remove0x(rawTx));
            const txb = bitcoin.TransactionBuilder.fromTransaction(tx, bitcoin.networks.bitcoin);

            const keyPair = bitcoin.ECPair.fromWIF(
                process.env.bitcoin_private_key,
                bitcoin.networks.bitcoin
            );
            const redeemScript = Buffer.from(remove0x(process.env.redeem_script), "hex");
            try {
                for (let i = 0; i < tx.ins.length; i++) {
                    txb.sign(i, keyPair, redeemScript);
                }
            } catch (e) {
                console.error("签名出错：", e);
                process.exit(1);
            }

        }
    },
}
