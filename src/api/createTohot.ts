/**
 * 此脚本用于构造冷转热交易
 */

require("dotenv").config();
require("console.table");
import Api from "./chainx";
import { getUnspents, calcTargetUnspents } from "./bitcoin";
const bitcoin = require("bitcoinjs-lib");
const colors = require('colors')


export default class CreateToHot {
    public amount: number;
    public device: any;
    public deviceType: string;
    constructor(rawAmount: string) {
        this.amount = Math.pow(10, 8) * parseFloat(rawAmount);
    }


    async contructToHot() {
        if (!process.env.bitcoin_fee_rate) {
            throw new Error("bitcoin_fee_rate 没有设置");
            process.exit(1);
        }

        if (!process.env.min_change) {
            throw new Error("min_change 没有设置");
            process.exit(1);
        }
        const info = await Api.getInstance().getTrusteeSessionInfo(0);
        const hotAddr = info.hotAddress.addr;
        const coldAddr = info.coldAddress.addr;
        const required = info.threshold;

        // const redeemScript = Buffer.from(
        //     remove0x(info.coldAddress.redeemScript.toString()),
        //     "hex"
        // );

        console.log(colors.yellow(`redeem script ${info.coldAddress.redeemScript.toString()}`))

        const properties = await Api.getInstance().getChainProperties();

        const total = info.trusteeList.length;
        console.log(`bitcoin type ${properties.bitcoinType}`)

        const unspents = await getUnspents(coldAddr, properties.bitcoinType);
        unspents.sort((a, b) => {
            return b.amount - a.amount
        });

        let [targetInputs, minerFee] = await calcTargetUnspents(
            unspents,
            this.amount,
            process.env.bitcoin_fee_rate,
            required,
            total
        );
        // @ts-ignore
        const inputSum = targetInputs.reduce((sum, input) => sum + input.amount, 0);

         // 尝试对交易原文进行限制
         if (!minerFee) {
            throw new Error("手续费计算错误");
        } else {
            minerFee = parseInt(parseFloat(minerFee.toString()).toFixed(0));
        }

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

        txb.addOutput(hotAddr, this.amount);
        if (change > 0) {
            txb.addOutput(coldAddr, change);
        }

        this.logInputs(targetInputs);

        const rawTx = txb.buildIncomplete().toHex();
        console.log("未签原始交易:\n");
        console.log(colors.green(rawTx));
        process.exit(0);

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

}
