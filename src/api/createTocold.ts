/**
 * 此脚本用于构造冷转热交易
 */

require("dotenv").config();
require("console.table");
import Api from "./chainx";
import { getUnspents, calcTargetUnspents, getInputsAndOutputsFromTx } from "./bitcoin";
const bitcoin = require("bitcoinjs-lib");
const { remove0x } = require("../utils");
const colors = require('colors')


export default class CreateToHot {
    public amount: number;
    public device: any;
    public deviceType: string;
    constructor(rawAmount: string) {
        this.amount = Math.pow(10, 8) * parseFloat(rawAmount);
    }

    async init(device: any, deviceType: string) {
        this.device = device;
        this.deviceType = deviceType;
    }

    async contructToCold() {
        if (!process.env.bitcoin_fee_rate) {
            throw new Error("bitcoin_fee_rate 没有设置");
            process.exit(1);
        }

        if (!process.env.min_change) {
            throw new Error("min_change 没有设置");
            process.exit(1);
        }
        const info = await Api.getInstance().getTrusteeSessionInfo();
        const hotAddr = info.hotAddress.addr;
        const coldAddr = info.coldAddress.addr;
        const required = info.threshold;

        const redeemScript = Buffer.from(
            remove0x(info.hotAddress.redeemScript.toString()),
            "hex"
        );

        const properties = await Api.getInstance().getChainProperties();

        const total = info.trusteeList.length;
        console.log(`bitcoin type ${properties.bitcoinType}`)

        const unspents = await getUnspents(hotAddr, properties.bitcoinType);
        unspents.sort((a, b) => Number(b.amount) - Number(a.amount));


        const [targetInputs, minerFee] = await calcTargetUnspents(
            unspents,
            this.amount,
            process.env.bitcoin_fee_rate,
            required,
            total
        );
        // @ts-ignore
        const inputSum = targetInputs.reduce((sum, input) => sum + input.amount, 0);

        // @ts-ignore
        let change = inputSum - this.amount - minerFee;
        if (change < Number(process.env.min_change)) {
            change = 0;
        }

        this.logMinerFee(minerFee);
        const network =
            properties.bitcoinType === "mainnet"
                ? bitcoin.networks.bitcoin
                : bitcoin.networks.testnet;
        const txb = new bitcoin.TransactionBuilder(network);
        txb.setVersion(1);

        // @ts-ignore
        for (const unspent of targetInputs) {
            txb.addInput(unspent.txid, unspent.vout);
        }

        txb.addOutput(coldAddr, this.amount);
        if (change > 0) {
            txb.addOutput(coldAddr, change);
        }

        if (this.deviceType === 'privateKey') {
            const keyPair = bitcoin.ECPair.fromWIF(
                process.env.bitcoin_private_key,
                network
            );

            let redeem = Buffer.from(remove0x(redeemScript), "hex");
            for (let i = 0; i < txb.__inputs.length; i++) {
                txb.sign(i, keyPair, redeem);
            }

        } else {

            if (!this.device.isConnected()) {
                console.log('硬件钱包未连接，请拔掉设备重新初始化')
            }
            const rawTx = txb.buildIncomplete().toHex();

            try {
                const inputAndOutPutResult = await getInputsAndOutputsFromTx(rawTx,
                    properties.bitcoinType);
                const signData = await this.device.sign(rawTx, inputAndOutPutResult.txInputs, info.hotAddress.redeemScript.replace(/^0x/, ''), properties.bitcoinType);
                console.log(`签名成功: \n ${signData}`)
            } catch (err) {
                console.log(colors.red('签名失败') + JSON.stringify(err))
            }
        }

        this.logInputs(targetInputs);
        this.logOutputs(txb, network);

        const rawTx = txb.buildIncomplete().toHex();
        console.log("生成代签原文:");
        console.log(rawTx);

        process.exit(0)
    }

    logMinerFee(minerFee) {
        console.log("所花手续费:");
        console.log(minerFee / Math.pow(10, 8) + " BTC\n");
    }

    logInputs(inputs) {
        console.log("所花UTXO列表:");
        console.table(
            inputs.map(input => ({
                ...input,
                amount: input.amount / Math.pow(10, 8) + " BTC"
            }))
        );
    }

    logOutputs(txb, network) {
        console.log("提现列表:");
        const normalizedOuts = txb.__tx.outs.map(out => {
            const address = bitcoin.address.fromOutputScript(out.script, network);
            const value = out.value / Math.pow(10, 8);
            return { address, ["value(BTC)"]: value };
        });

        console.table(normalizedOuts);
    }

}