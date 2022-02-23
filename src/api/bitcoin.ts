import * as memoize from 'memoizee';
import mempoolJS from "@mempool/mempool.js";
import {scriptToBech32mAdress} from "./types";

const fetch = require("node-fetch");
const bitcoin = require("bitcoinjs-lib")

export async function getUnspents(address, network) {
    const net = network === "mainnet" ? "mainnet" : "signet";

    if (net === "mainnet") {
        const {bitcoin: {addresses}} = mempoolJS({
            hostname: 'mempool.space',
        });

        const addressTxsUtxo = await addresses.getAddressTxsUtxo({address});
        return addressTxsUtxo.map(utxo => ({
            txid: utxo.txid,
            vout: utxo.vout,
            amount: utxo.value
        }));
    } else {
        const {bitcoin: {addresses}} = mempoolJS({
            hostname: 'mempool.space',
            network: net
        });

        const addressTxsUtxo = await addresses.getAddressTxsUtxo({address});
        return addressTxsUtxo.map(utxo => ({
            txid: utxo.txid,
            vout: utxo.vout,
            amount: utxo.value
        }));
    }
}

export function pickUtxos(utxos, outSum) {
    let result = [];
    let inSum = 0;
    for (let utxo of utxos) {
        result.push(utxo);
        inSum += utxo.amount;
        if (inSum >= outSum) {
            break;
        }
    }

    if (inSum < outSum) {
        console.log(`Not enough funds to send ${outSum} satoshis.`);
        throw new Error("UTXO 不足以支付提现");
    }

    return result;
}

const fromTransaction = memoize(bitcoin.TransactionBuilder.fromTransaction, {
    normalizer: function (args) {
        return JSON.stringify(args[0]) + JSON.stringify(args[1]);
    },
});

export async function calcTargetUnspents(utxos, amount, feeRate, required, total) {
    let outSum = amount;
    let targetInputs = pickUtxos(utxos, amount);
    let inputSum = targetInputs.reduce((sum, input) => sum + input.amount, 0);
    let outputLength = 1;
    let bytes =
        targetInputs.length * (48 + 73 * required + 34 * total) +
        34 * (outputLength + 1) +
        14;

    let minerFee = parseInt(
        // @ts-ignore
        (Number(process.env.bitcoin_fee_rate) * bytes) / 1000, 10
    );

    while (inputSum < outSum + minerFee) {
        targetInputs = pickUtxos(utxos, outSum + minerFee);
        inputSum = targetInputs.reduce((sum, input) => sum + input.amount, 0);
        bytes =
            targetInputs.length * (48 + 73 * required + 34 * total) +
            34 * (outputLength + 1) +
            14;
        minerFee = (Number(process.env.bitcoin_fee_rate) * bytes) / 1000;
    }

    return [targetInputs, minerFee];
}


export const getInputsAndOutputsFromTx = async (tx, currentNetwork?) => {
    const getAddressFromScript = (script, network) => {
        try {
            return bitcoin.address.fromOutputScript(script, network);
        } catch {
            try {
                return scriptToBech32mAdress(script, currentNetwork);
            } catch {
                return '';
            }
        }
    };

    if (!tx) return;

    const network =
        currentNetwork === "mainnet"
            ? bitcoin.networks.bitcoin
            : bitcoin.networks.testnet;

    const transactionRaw = bitcoin.Transaction.fromHex(tx.replace(/^0x/, ''));
    const txbRAW = fromTransaction(transactionRaw, network);
    const resultOutputs = txbRAW.__tx.outs.map((item = {}) => {
        // @ts-ignore
        const address = getAddressFromScript(item.script, network);
        return {
            address,
            // @ts-ignore
            value: item.value / Math.pow(10, 8),
            // @ts-ignore
            satoshi: item.value,
            ...(address ? {} : {err: true}),
        };
    });


    const ins = txbRAW.__tx.ins.map(item => {
        return {
            ...item,
            hash: item.hash.reverse().toString('hex'),
        };
    });
    const ids = ins.map(item => item.hash);
    const result = await fetchNodeTxsFromTxidList(ids);
    let resultInputs = [];

    if (result && result.length) {
        resultInputs = ins.map(item => {
            const findOne = result.find(one => one.txid === item.hash);
            const transaction = bitcoin.Transaction.fromHex(findOne.raw);
            const txb = fromTransaction(transaction, network);
            const findOutputOne = txb.__tx.outs[item.index];
            const address = getAddressFromScript(findOutputOne.script, network);
            return {
                index: item.index,
                raw: findOne.raw,
                address,
                hash: findOne.txid,
                value: findOutputOne.value / Math.pow(10, 8),
                satoshi: findOutputOne.value,
                ...(address ? {} : {err: true}),
            };
        });
    }
    return {
        txOutpust: resultOutputs,
        txInputs: resultInputs
    }
};

export const fetchNodeTxsFromTxidList = async (ids) => {
    const actions = ids.map(async id => {
        const params = {
            jsonrpc: "1.0",
            id: "1",
            method: "getrawtransaction",
            params: [id]
        }
        const response = await fetch(
            'http://115.29.163.193:38332/',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Basic YXV0aDpiaXRjb2luLWIyZGQwNzc=`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(params),
            }
        );
        return response.json();
    });
    let res = await Promise.all(actions);


    if (res && res.length) {
        return res.map((item, index) => ({
            txid: ids[index],
            // @ts-ignore
            raw: item.result,
        }));
    }

};
