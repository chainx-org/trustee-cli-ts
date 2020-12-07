import { GluegunToolbox } from 'gluegun'
import ContstructTx from '../api/contructTx'
import Api from '../api/chainx'
const { MultiSelect } = require('enquirer');

module.exports = {
    name: 'create',
    alias: ['create'],
    run: async (toolbox: GluegunToolbox) => {
        const {
            parameters
        } = toolbox

        const submit = parameters.first === 'submit'

        const withdrawList = await Api.getInstance().getBTCWithdrawList();

        console.log(JSON.stringify(withdrawList))

        const choiceList = []

        withdrawList.map(item => {
            choiceList.push(
                {
                    name: `地址：${item.addr} 提现数量: ${Number(item.balance) / Math.pow(10, 8)} BTC`,
                    value: item.id
                }
            )
        })

        const prompt = new MultiSelect({
            name: '构造提现',
            message: '选择交易构造提现列表',
            choices: choiceList,
            result(names) {
                return this.map(names);
            }
        });

        let selectResult = await prompt.run()

        console.log(selectResult)

        const constructTx = new ContstructTx(submit)
        constructTx.init()
        await constructTx.construct()

    },
}
