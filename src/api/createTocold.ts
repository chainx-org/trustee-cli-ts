/**
 * 此脚本用于构造冷转热交易
 */

require("dotenv").config();
require("console.table");
import Api from "./chainx";
import {getUnspents, calcTargetUnspents} from "./bitcoin";
import {info} from "console";

const bitcoin = require("bitcoinjs-lib");
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

        console.log(colors.yellow(`amount ${this.amount}`))

        if (!process.env.min_change) {
            throw new Error("min_change 没有设置");
            process.exit(1);
        }
        const info = await Api.getInstance().getTrusteeSessionInfo(0);
        const hotAddr = info.hotAddress.addr;
        const properties = await Api.getInstance().getChainProperties();
        // todo: 等新的冷地址生成后替换成新的冷地址
//         const coldAddr = String("bc1pu77rn5kk87fy7k2aknxc3nv5pkt7gt4rdg4qjslznf74zcyw96gs8myphy");
        const coldAddr = info.coldAddress.addr;
        const required = info.threshold;

        console.log(colors.yellow(`redeem script ${info.coldAddress.redeemScript.toString()}`))

        const total = info.trusteeList.length;
        console.log(`bitcoin type ${properties.bitcoinType}`)

        const unspents = await getUnspents(hotAddr, properties.bitcoinType);
        unspents.sort((a, b) => {
            return b.amount > a.amount
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

        console.log(`inputSum ${inputSum} amount ${this.amount} minerFee ${minerFee}`);
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
            console.log(`hotAddr ${hotAddr} change ${change} BTC`);
            txb.addOutput(hotAddr, change);
        }

        this.logInputs(targetInputs);

        const rawTx = txb.buildIncomplete().toHex();
        console.log("未签原始交易原文:");
        console.log(colors.green(rawTx));

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


}
