import { GluegunToolbox } from 'gluegun'
const fs = require('fs')

const colors = require('colors')
import Api from "../api/chainx";

module.exports = {
    name: 'sudo',
    alias: ['sudo'],
    run: async (toolbox: GluegunToolbox) => {
        const {
           parameters
        } = toolbox

        console.log(`第一个参数为: ${parameters.first}`)
        const filepath = parameters.first
        const isSubmit = parameters.second
        const data = fs.readFileSync(filepath, 'utf8')
        const lines = data.split(/\r?\n/)
        const nodeInfo = [];

        lines.forEach(line =>{
            const infolist = line.split(',')
            let oldPot = null
            let newPot = null
            let balance = null
            if (!infolist[0] || !infolist[1] || !infolist[2]) {
                console.log(`${line} is not valid`)
                return
            }
            for (let i = 0; i < infolist.length; i++) {
                oldPot = String(infolist[1]).replace("old_pot:","").trim()
                newPot = String(infolist[2]).replace("new_pot:","").trim()
                balance = String(infolist[3]).replace("pot_balance:","").trim()
            };
            
            console.log(`${colors.red(oldPot)} ${colors.green(newPot)} ${colors.red(balance)}`)
            nodeInfo.push({
                oldPot: oldPot,
                newPot: newPot,
                balance: balance
            })
        });
    

        const txlist = []
        const api = await Api.getInstance().getApi();
        await Api.getInstance().ready();

        nodeInfo.forEach(info => {
            txlist.push(
                api.tx.balances.forceTransfer(info.oldPot, info.newPot, info.balance)
            )
        })
        txlist.push(api.tx.xStaking.setBondingDuration(201600))

        txlist.push(api.tx.xGatewayBitcoin.setBtcWithdrawalFee(1000000))

        const account = await Api.getInstance().getAccountKeyring();

        console.log(`account address: ${account.address}`)

        const tx = await api.tx.utility.batchAll(
            txlist
        )
        const hash = tx.toHex()

        console.log(colors.red(`tx hash: ${hash}`))

        if (isSubmit) {
            console.log(`submitting tx...`)
            const democracy =  await api.tx.democracy.notePreimage(hash);
            democracy.signAndSend(account, ({ events = [], status }) => {
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
                            `提交交易失败 \n ${phase}: ${section}.${method}:: ${data}`)
                        );
                        process.exit(0);
                    } else if (method === "ExtrinsicSuccess") {
                        console.log(

                            colors.green(
                                `提交交易成功 \n ${phase}: ${section}.${method}:: ${data}`)
                        );
                        process.exit(0);
                    }
                });
            }
         });
            
        }

        
        process.exit(0);
    },
}
