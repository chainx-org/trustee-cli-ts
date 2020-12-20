import { GluegunToolbox } from 'gluegun'
import Api from '../api/chainx'
const colors = require('colors/safe');
const Table = require('cli-table3');

module.exports = {
    name: 'list',
    alias: ['l'],
    run: async (toolbox: GluegunToolbox) => {
        // const {
        //     parameters,
        // } = toolbox
        const api = Api.getInstance();

        const withdrawList = await api.getBTCWithdrawList();

        const table = new Table({
            head: ['id', 'assetId', 'applicant', 'balance', 'addr', 'state']
        });

        withdrawList.map(item => {
            table.push([item.id, item.assetId, item.applicant, Number(item.balance) / Math.pow(10, 8), item.addr, item.state])
        })

        console.log(colors.yellow(table.toString()))

        process.exit(0)
    },
}