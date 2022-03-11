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

        let rawTx = parameters.first.toString();
        if (isNull(rawTx)) {
            console.log(colors.red('请添加代签原文: trustee-tools submit 000000001000.... '))
            process.exit(0);
        }

        rawTx = remove0x(rawTx);
        const selectDevice = await promtSelectDevice();

        let device: any = null;
        if (selectDevice === 'trezor') {
            const trezor = new TrezorConnector();
            await trezor.init()
            device = trezor;
            console.log("trezro 连接状态:" + trezor.getPublicKey())
            return
        } else if (selectDevice === 'ledger') {
            const ledger = new Ledger('mainnet')
            await ledger.init();
            device = ledger;
            console.log('正在使用ledger....')
            const publicKey = await ledger.getPublicKey()
            console.log(`ledger publickKey: ${publicKey}`)
        }
        const properties = await Api.getInstance().getChainProperties();

        console.log(colors.green(`当前网络类型: ${properties.bitcoinType} \n`));
        console.log(colors.green(`当前赎回脚本: ${remove0x(process.env.redeem_script)} \n`));

        const inputAndOutPutResult = await getInputsAndOutputsFromTx(rawTx,
            properties.bitcoinType);

        if (selectDevice === 'trezor' || selectDevice === 'ledger') {
            try {
                console.log(colors.green(`正在使用${selectDevice}签名....,耗时约几分钟，请耐心等待${selectDevice}数据并确认...`))
                const signData = await device.sign(rawTx, inputAndOutPutResult.txInputs, remove0x(process.env.redeem_script), properties.bitcoinType);
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
