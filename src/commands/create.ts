import { GluegunToolbox } from 'gluegun'
import ContstructTx from '../api/contructTx'
import Api from '../api/chainx'
//import TrezorConnector from '../multisign/trezor'
//import Ledger from '../multisign/ledger'
const { MultiSelect, Select } = require('enquirer');


const promptSelectWithdraw = async () => {
    const withdrawList = await Api.getInstance().getBTCWithdrawList();
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

    let selectResult = await prompt.run();

    const answer = [];
    Object.keys(selectResult).forEach((key: string) => {
        answer.push(selectResult[key])
    });

    if (answer.length === 0) {
        withdrawList.map(item => {
            answer.push(item.id)
        })
    }
    return answer;
}

const promtSelectDevice = async () => {
    console.log('\n')
    const prompt = new Select({
        name: 'select device',
        message: 'select device or privateKey',
        choices: ['privateKey ', 'ledger', 'trezor']
    });
    const device = await prompt.run();

    return device;
}

module.exports = {
    name: 'create',
    alias: ['create'],
    run: async (toolbox: GluegunToolbox) => {
        const {
            parameters
        } = toolbox

        const submit = parameters.first === 'sign'
        // const sign = parameters.second === 'submit'

        const selectDevice = await promtSelectDevice()

        console.log(selectDevice)


        const selectWithdraw = await promptSelectWithdraw()

        console.log(selectWithdraw)

        const constructTx = new ContstructTx(submit)
        constructTx.init()
        await constructTx.construct()

    },
}
