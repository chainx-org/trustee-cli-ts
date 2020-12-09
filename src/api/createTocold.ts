/**
 * 此脚本用于构造热转冷交易
 */

require("dotenv").config();
require("console.table");
import Api from "./chainx";
import { getUnspents, calcTargetUnspents } from "./bitcoin";
const bitcoin = require("bitcoinjs-lib");
const { remove0x } = require("../utils");

export default class CreateToCold {
    public amount: number;
    constructor(rawAmount: string) {
        if (!rawAmount) {
            throw new Error("没有指定转账金额");
            process.exit(1);
        }

        this.amount = Math.pow(10, 8) * parseFloat(rawAmount);
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
        const properties = await Api.getInstance().getChainProperties();

        const { redeemScript } = info.hotAddress;
        const { addr } = info.coldAddress;

        const required = info.threshold;
        const total = info.trusteeList.length;

        const unspents = await getUnspents(addr, properties.bitcoinType);
        unspents.sort((a, b) => a.amount > b.amount);

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
            properties["bitcoin_type"] === "mainnet"
                ? bitcoin.networks.bitcoin
                : bitcoin.networks.testnet;
        const txb = new bitcoin.TransactionBuilder(network);
        txb.setVersion(1);

        // @ts-ignore
        for (const unspent of targetInputs) {
            txb.addInput(unspent.txid, unspent.vout);
        }

        // @ts-ignore
        txb.addOutput(coldAddr, this.amount);
        if (change > 0) {
            txb.addOutput(addr, change);
        }

        const keyPair = bitcoin.ECPair.fromWIF(
            process.env.bitcoin_private_key,
            network
        );

        let redeem = Buffer.from(remove0x(redeemScript), "hex");
        for (let i = 0; i < txb.__inputs.length; i++) {
            txb.sign(i, keyPair, redeem);
        }

        this.logInputs(targetInputs);
        this.logOutputs(txb, network);

        const rawTx = txb.build().toHex();
        console.log("生成代签原文:");
        console.log(rawTx);
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


