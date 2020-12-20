import Api from './chainx'
import { getUnspents, pickUtxos, getInputsAndOutputsFromTx } from './bitcoin'
import { remove0x, add0x } from '../utils'
import { WithDrawLimit, WithdrawaItem } from './types';
const { MultiSelect } = require('enquirer');
const colors = require('colors')
require("dotenv").config()
require("console.table")
const bitcoin = require("bitcoinjs-lib")

export default class ContstructTx {
    public bitcoinFeeRate: string;
    public minChange: string;
    public api: Api;
    public needSign: boolean;
    public needSubmit: boolean;
    public ids: string[];
    public device: any;
    public deviceType: string;
    public raw: string;

    constructor(needSign: boolean, needSubmit: boolean, raw?: string) {
        this.bitcoinFeeRate = process.env.bitcoin_fee_rate;
        this.minChange = process.env.min_change;
        this.needSign = needSign;
        this.needSubmit = needSubmit;
        this.raw = raw;
        this.api = Api.getInstance();
    }

    init(device: any, deviceType: string) {
        if (!process.env.bitcoin_fee_rate) {
            throw new Error("bitcoin_fee_rate 没有设置");
        }

        if (!process.env.min_change) {
            throw new Error("min_change 没有设置");
        }

        this.device = device;
        this.deviceType = deviceType;
    }

    async promptSelectWithdraw() {
        const withdrawList = await this.api.getBTCWithdrawList();
        const limit: WithDrawLimit = await this.api.getWithdrawLimit();

        let filteredList = this.filterSmallWithdraw(withdrawList, limit.minimalWithdrawal);
        filteredList = this.leaveOnelyApplying(filteredList);

        if (filteredList <= 0) {
            console.log("暂无合法提现");
            process.exit(0);
        }

        const normalizedOuts = filteredList.map(withdraw => {
            const address = withdraw.addr;
            const balance = Number(withdraw.balance) / Math.pow(10, 8);
            const state = withdraw.state;
            return { address, balance, state };
        });

        console.table(normalizedOuts);

        const choiceList = []
        filteredList.map((item) => {
            choiceList.push(
                {
                    name: `id:${item.id} 地址：${item.addr} 提现数量: ${Number(item.balance) / Math.pow(10, 8)} BTC  Applying : ${item.state}`,
                    value: item
                }
            )
        })

        const prompt = new MultiSelect({
            name: '构造提现',
            message: '选择交易构造提现列表',
            hint: '(使用 <空格> 进行选择, <回车键> 进行确认提交)',
            choices: choiceList,
            result(names) {
                return this.map(names)
            }
        });

        let selectResult = await prompt.run();

        const answer: WithdrawaItem[] = [];
        Object.keys(selectResult).forEach((key: string) => {
            answer.push(selectResult[key])
        });

        return answer;
    }

    async construct() {
        const limit: WithDrawLimit = await this.api.getWithdrawLimit();
        const filteredList = await this.promptSelectWithdraw();

        if (filteredList.length <= 0) {
            console.log("暂无合法提现");
            process.exit(0);
        }

        const normalizedOuts = filteredList.map(withdraw => {
            const address = withdraw.addr;
            const balance = Number(withdraw.balance) / Math.pow(10, 8);
            const state = withdraw.state;
            return { address, balance, state };
        });

        console.table(normalizedOuts);

        await this.composeBtcTx(filteredList, limit.fee);

        if (!this.needSubmit) {
            process.exit(0);
        }
    }

    filterSmallWithdraw(list, minimal) {
        return list.filter(withdrawal => withdrawal.balance >= minimal);
    }

    leaveOnelyApplying(list) {
        return list.filter(
            withdrawal =>
                withdrawal.state === "Applying"
        );
    }

    calculateWithOutSum(withdrawals: WithdrawaItem[], fees: number) {
        let outSum = 0;
        withdrawals.forEach(item => {
            let balanceWithFees = Number(item.balance) - fees;
            outSum += balanceWithFees;
        })
        return outSum;
    }

    async composeBtcTx(withdrawals, fee) {
        const info = await this.api.getTrusteeSessionInfo();
        const properties = await this.api.getChainProperties();

        const { addr } = info.hotAddress;

        const required = info.threshold;
        const total = info.trusteeList.length;

        const unspents = await getUnspents(addr, properties.bitcoinType);

        unspents.sort((a, b) => {
            return b.amount - a.amount
        });

        let outSum = this.calculateWithOutSum(withdrawals, fee);

        let targetInputs = pickUtxos(unspents, outSum);

        let inputSum = targetInputs.reduce((sum, input) => sum + input.amount, 0);
        let bytes =
            targetInputs.length * (48 + 73 * required + 34 * total) +
            34 * (withdrawals.length + 1) +
            14;
        let minerFee = parseInt(
            // @ts-ignore
            (Number(process.env.bitcoin_fee_rate) * bytes) / 1000, 10
        );

        while (inputSum < outSum + minerFee) {
            targetInputs = pickUtxos(unspents, outSum + minerFee);
            bytes =
                targetInputs.length * (48 + 73 * required + 34 * total) +
                34 * (withdrawals.length + 1) +
                14;
            minerFee = (Number(process.env.bitcoin_fee_rate) * bytes) / 1000;
        }
        let change = inputSum - outSum - minerFee;
        if (change < Number(process.env.min_change)) {
            change = 0;
        }


        this.logMinerFee(minerFee);
        this.logInputs(targetInputs);
        this.logOutputs(withdrawals);


        const network =
            properties.bitcoinType === "mainnet"
                ? bitcoin.networks.bitcoin
                : bitcoin.networks.testnet;


        const txb = new bitcoin.TransactionBuilder(network);
        txb.setVersion(1);

        for (const unspent of targetInputs) {
            txb.addInput(unspent.txid, unspent.vout);
        }

        for (const withdrawal of withdrawals) {
            txb.addOutput(withdrawal.addr, withdrawal.balance - fee);
        }
        if (change > 0) {
            txb.addOutput(addr.toString(), change);
        }

        const signed = await this.signIfRequired(txb, network);

        let rawTx;
        if (signed) {
            rawTx = txb.build().toHex();
        } else {
            rawTx = txb.buildIncomplete().toHex();
        }
        console.log("生成代签原文:");
        console.log(colors.yellow(rawTx));

        await this.submitIfRequired(withdrawals, rawTx);
    }

    async signIfRequired(txb, network) {
        let signResult = false;

        const properties = await this.api.getChainProperties();

        const rawTx = txb.buildIncomplete().toHex();
        if (!this.needSign) {
            return false;
        }
        const info = await this.api.getTrusteeSessionInfo();
        const redeemScript = Buffer.from(
            remove0x(info.hotAddress.redeemScript.toString()),
            "hex"
        );

        if (this.deviceType === 'trezor' || this.deviceType === 'ledger') {

            const inputAndOutPutResult = await getInputsAndOutputsFromTx(rawTx, properties.bitcoinType);

            const signData = await this.device.sign(rawTx, inputAndOutPutResult.txInputs, info.coldAddress.redeemScript.replace(/^0x/, ''), properties.bitcoinType);
            console.log(`签名成功: \n ${signData}`)
            signResult = true;


        } else {
            if (!process.env.bitcoin_private_key) {
                console.error("没有设置bitcoin_private_key");
                process.exit(1);
            }
            const keyPair = bitcoin.ECPair.fromWIF(
                process.env.bitcoin_private_key,
                network
            );
            for (let i = 0; i < txb.__inputs.length; i++) {
                txb.sign(i, keyPair, redeemScript);
            }
            signResult = true;

        }
        return signResult;
    }

    async submitIfRequired(withdrawals, rawTx) {
        if (!this.needSubmit) {
            return;
        }

        console.log("\n开始构造并提交ChainX信托交易...");

        const alice = await this.api.getAccountKeyring();
        console.log(colors.red(`信托账户地址: ${alice.address}`))
        const ids = withdrawals.map(withdrawal => withdrawal.id);

        console.log("idx..." + JSON.stringify(ids));

        withdrawals.forEach(async (item) => {
            if (item.state === "Applying") {
                const extrinsic = this.api.getApi().tx["xGatewayBitcoin"]["createWithdrawTx"](
                    ids,
                    add0x(rawTx)
                );

                await extrinsic.signAndSend(alice, ({ events = [], status }) => {
                    console.log(`Current status is ${status.type}`);
                    if (status.isFinalized) {
                        console.log(
                            `Transaction included at blockHash ${status.asFinalized}`
                        );
                        // Loop through Vec<EventRecord> to display all events
                        events.forEach(({ phase, event: { data, method, section } }) => {
                            // console.log(`\t' ${phase}: ${section}.${method}:: ${data}`);
                            if (method === "ExtrinsicFailed") {
                                console.error(colors.red(
                                    `提交ChainX信托签名交易失败 \n ${phase}: ${section}.${method}:: ${data}`)
                                );
                                process.exit(0);
                            } else if (method === "ExtrinsicSuccess") {
                                console.log(colors.green(
                                    `提交信托签名交易成功 \n ${phase}: ${section}.${method}:: ${data}`)
                                );
                                process.exit(0);
                            }
                        });
                    }
                });
            }
        });
    }

    logMinerFee(minerFee) {
        console.log("所花手续费:");
        console.log(minerFee / Math.pow(10, 8) + " BTC");
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

    logOutputs(outputs) {
        console.log("提现列表:");
        console.table(
            outputs.map(out => ({
                address: out.address,
                balance: out.balance / Math.pow(10, 8) + " BTC"
            }))
        );

        const all = outputs.reduce((result, out) => result + out.balance, 0);
        console.table([{ all: all / Math.pow(10, 8) + " BTC" }]);
    }
}
