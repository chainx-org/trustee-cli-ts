import { Keyring } from '@polkadot/api'
import Api from './chainx'
import { remove0x, add0x, isNull } from '../utils'

require("dotenv").config();
require("console.table");
const bitcoin = require("bitcoinjs-lib");
const colors = require("colors")

export default class Respond {
    public api: Api;
    public needSubmit: boolean;
    public redeemScript: Buffer;

    constructor(needSubmit: boolean) {
        this.needSubmit = needSubmit;
        this.api = Api.getInstance();
    }

    async init() {
        const info = await this.api.getTrusteeSessionInfo();
        this.redeemScript = Buffer.from(
            remove0x(info.hotAddress.redeemScript.toString()),
            'hex'
        )
        if (!process.env.bitcoin_private_key) {
            console.error("没有设置bitcoin_private_key");
            process.exit(1);
        }
    }

    async respond() {
        let withdrawalTx = await this.api.getTxByReadStorage();

        if (!withdrawalTx || isNull(withdrawalTx.toString())) {
            console.log(colors.yellow('链上无代签原文'))
            process.exit(0)
        } else {
            console.log(`代签原文: \n `, withdrawalTx.tx);
            const normalizedOuts = withdrawalTx.trusteeList.map(trustee => {
                const address = trustee[0];
                const result = trustee[1];
                return { ["信托地址:"]: address, ["签名结果:"]: result };
            });

            console.table(normalizedOuts);

            await this.parseRawTxAndLog(withdrawalTx.tx);

            await this.sign(withdrawalTx.tx);

            if (!this.needSubmit) {
                process.exit(0);
            }

        }

    }

    async parseRawTxAndLog(rawTx) {
        const tx = bitcoin.Transaction.fromHex(remove0x(rawTx));

        const properties = await this.api.getChainProperties();
        const network =
            properties.bitcoinType === "mainnet"
                ? bitcoin.networks.bitcoin
                : bitcoin.networks.testnet;

        const normalizedOuts = tx.outs.map(out => {
            const address = bitcoin.address.fromOutputScript(out.script, network);
            const value = out.value / Math.pow(10, 8);
            return { address, ["value(BTC)"]: value };
        });

        // TODO: 输出inputs列表，需查询比特币网络

        console.log("\nOutputs 列表:");
        console.table(normalizedOuts);
    }

    async sign(rawTx) {
        const properties = await this.api.getChainProperties();
        const network =
            properties.bitcoinType === "mainnet"
                ? bitcoin.networks.bitcoin
                : bitcoin.networks.testnet;

        const tx = bitcoin.Transaction.fromHex(remove0x(rawTx));
        const txb = bitcoin.TransactionBuilder.fromTransaction(tx, network);

        const keyPair = bitcoin.ECPair.fromWIF(
            process.env.bitcoin_private_key,
            network
        );

        try {
            for (let i = 0; i < tx.ins.length; i++) {
                txb.sign(i, keyPair, this.redeemScript);
            }
        } catch (e) {
            console.error(colors.red("签名出错：", e));
            process.exit(0);
        }

        const signedRawTx = txb.build().toHex();
        console.log(colors.green("签名后原文:"));
        console.log(colors.green(signedRawTx));

        await this.submitIfRequired(signedRawTx);
    }

    async submitIfRequired(rawTx) {
        if (!this.needSubmit) {
            return;
        }

        console.log("\n开始构造并提交ChainX信托交易...");

        if (!process.env.chainx_private_key) {
            console.error("没有设置chainx_private_key");
            process.exit(1);
        }

        const keyring = new Keyring({ type: "sr25519" });
        const alice = keyring.addFromUri(process.env.chainx_private_key);

        const extrinsic = this.api.getApi().tx["xGatewayBitcoin"]["signWithdrawTx"](
            add0x(rawTx)
        );

        await extrinsic.signAndSend(alice, ({ events = [], status }) => {
            console.log(`Current status is ${status.type}`);
            if (status.isFinalized) {
                console.log(`Transaction included at blockHash ${status.asFinalized}`);
                // Loop through Vec<EventRecord> to display all events
                events.forEach(({ phase, event: { data, method, section } }) => {
                    // console.log(`\t' ${phase}: ${section}.${method}:: ${data}`);
                    if (method === "ExtrinsicFailed") {
                        console.error(
                            `提交ChainX信托签名交易失败 \n ${phase}: ${section}.${method}:: ${data}`
                        );
                        process.exit(0);
                    } else if (method === "ExtrinsicSuccess") {
                        console.log(
                            `提交信托签名交易成功 \n ${phase}: ${section}.${method}:: ${data}`
                        );
                        process.exit(0);
                    }
                });
            }
        });
    }
}
