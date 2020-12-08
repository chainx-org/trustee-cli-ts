import { GluegunToolbox } from 'gluegun'
import Api from '../api/chainx'
import { AlreadySigned } from '../api/types'
import { remove0x, isNull } from '../utils'

const colors = require('colors/safe');
// const Table = require('cli-table3');
const api = Api.getInstance();
const bitcoin = require("bitcoinjs-lib");
const Table = require('cli-table3');

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

    if (!trusteeList) {

        return;
    }

    console.log(colors.red(`已签数量: ${trusteeList.length} \n`))
    console.log("信托列表签名情况:\n");

    const infoList = await Api.getInstance().getTrusteeSessionInfo();

    const alreadySignedList: string[] = [];
    for (let trustee of trusteeList) {
        const [accountId, signed] = trustee;
        if (signed) {
            alreadySignedList.push(accountId)
        }
    }

    const singedInfoList: AlreadySigned[] = [];
    for (let info of infoList.trusteeList) {
        singedInfoList.push({
            accountId: info,
            signed: !isNull(alreadySignedList.find(item => item === info))
        })
    }

    const table = new Table({
        head: ['id', 'accountId', 'signed']
    });

    singedInfoList.map((item, index) => {
        table.push([index, item.accountId, item.signed])
    })
    console.log(colors.yellow(table.toString()))

}


module.exports = {
    name: 'tx',
    alias: ['t'],
    run: async (toolbox: GluegunToolbox) => {


        const withdrawTx = await api.getTxByReadStorage();

        if (withdrawTx === null || withdrawTx.trusteeList === null) {
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