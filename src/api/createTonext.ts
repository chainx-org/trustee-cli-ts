/**
 * 此脚本用于构造冷转热交易
 */

import {fromBech32ToScript} from "./types";

require("dotenv").config();
require("console.table");
import Api from "./chainx";
import {getUnspents, calcTargetUnspents} from "./bitcoin";

const bitcoin = require("bitcoinjs-lib");
const colors = require('colors')


export default class CreateToHot {
    public device: any;
    public deviceType: string;

    async contructToHot() {
        if (!process.env.bitcoin_fee_rate) {
            throw new Error("bitcoin_fee_rate 没有设置");
            process.exit(1);
        }

        if (!process.env.min_change) {
            throw new Error("min_change 没有设置");
            process.exit(1);
        }
        const info = await Api.getInstance().getTrusteeSessionInfo(-2);
        const nextInfo = await Api.getInstance().getTrusteeSessionInfo(-1);
        const coldAddr = info.coldAddress.addr;
        const nextColdAddr = nextInfo.coldAddress.addr;
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
        
        let amount = 0;
        unspents.forEach(item => { amount += item.amount });

        let bytes =
            unspents.length * (48 + 73 * required + 34 * total) +
            34 * 2 +
            14;

        let preMinerFee = parseInt(
            // @ts-ignore
            (Number(process.env.bitcoin_fee_rate) * bytes) / 1000, 10
        );

        amount = amount - preMinerFee;

        const [targetInputs, minerFee] = await calcTargetUnspents(
            unspents,
            amount,
            process.env.bitcoin_fee_rate,
            required,
            total
        );
        // @ts-ignore
        const inputSum = targetInputs.reduce((sum, input) => sum + input.amount, 0);

        // @ts-ignore
        let change = inputSum - amount - minerFee;
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
        try {
            txb.addOutput(nextColdAddr, amount);
        } catch (e) {
            txb.addOutput(fromBech32ToScript(nextColdAddr), amount);
        }
        if (change > 0) {
            throw new Error("输入没有完全花费，存在找零 ！！！");
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
