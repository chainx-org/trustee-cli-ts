
import { GluegunToolbox } from 'gluegun'
import Api from '../api/chainx'
const Table = require('cli-table3');
const colors = require('colors/safe');
module.exports = {
    name: 'info',
    alias: ['i'],
    run: async (toolbox: GluegunToolbox) => {
        // const {
        //     parameters,
        // } = toolbox
        const api = Api.getInstance();

        const session = await api.getTrusteeSessionInfo();
        const table = new Table({
            head: ['id', 'trustee addr', 'threshold']
        });
        session.trusteeList.map((item, index) => {
            table.push(
                [index, item, session.threshold]
            )
        })

        console.log(colors.green('信托账户列表：'))
        console.log(table.toString());
        console.log(colors.yellow('冷热钱包地址：'))

        const tableAddr = new Table({
            head: ['type', 'info']
        });
        tableAddr.push(
            ['hot adrr', session.hotAddress.addr],
            ['cold adrr', session.coldAddress.addr],
        )
        console.log(tableAddr.toString())

        console.log('redeemScript: ' + colors.red.underline(session.coldAddress.redeemScript));

        process.exit(0)
    },
}
