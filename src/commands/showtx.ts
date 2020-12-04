import { GluegunToolbox } from 'gluegun'
import Api from '../api/chainx'
import { remove0x } from '../utils'

const colors = require('colors/safe');
// const Table = require('cli-table3');
const api = Api.getInstance();
const bitcoin = require("bitcoinjs-lib");

async function parseRawTxAndLog(rawTx) {
    const tx = bitcoin.Transaction.fromHex(remove0x(rawTx));

    const normalizedOuts = tx.outs.map(out => {
        const address = bitcoin.address.fromOutputScript(
            out.script,
            bitcoin.networks.testnet
        );
        const value = out.value / Math.pow(10, 8);
        return { address, ["value(BTC)"]: value };
    });

    // TODO: 输出inputs列表，需查询比特币网络

    console.log("\nOutputs 列表:");
    console.table(normalizedOuts);
}

async function logSignedIntentions(trusteeList) {
    // 返回信托列表
    // const info = await api.getTrusteeSessionInfo();

    console.log("已签信托列表:\n");

}


module.exports = {
    name: 'tx',
    alias: ['t'],
    run: async (toolbox: GluegunToolbox) => {
        const {
            // parameters,
            strings
        } = toolbox

        const withdrawTx = await api.getTxByReadStorage();

        if (strings.isBlank(withdrawTx?.toString())) {
            console.log(colors.yellow('链上无代签原文'))
            process.exit(0)
        } else {
            console.log("代签原文: \n", withdrawTx.tx);
            await parseRawTxAndLog(withdrawTx.tx);

            if (withdrawTx.trusteeList.length <= 0) {
                console.log(colors.yellow("目前没有信托签名"));
            } else {
                await logSignedIntentions(withdrawTx.trusteeList);
                if (withdrawTx.sigState === "Finish") {
                    console.log(colors.red("签名已完成"))
                }
                process.exit(0)
            }
        }
    },
}