import Api from './chainx'
import { add0x } from '../utils'
require("dotenv").config();
require("console.table");
const colors = require("colors");

export default class SubmitTx {
    public rawTx: string;
    public api: Api;
    constructor(rawTx: string) {
        this.rawTx = rawTx;
        this.api = Api.getInstance();
    }

    async contructSubmit() {
        if (!process.env.chainx_private_key) {
            console.error("没有设置chainx_private_key");
            process.exit(1);
        }
        console.log(colors.green("\n开始构造并提交ChainX信托交易..."));
        const currentAccount = await this.api.getAccountKeyring();
        console.log(colors.blue(`当前信托账户: ${currentAccount.address}`))

        let extrinsic;
        if (this.rawTx === 'null') {
            extrinsic = this.api.getApi().tx["xGatewayBitcoin"]["signWithdrawTx"](null);
        } else {
            extrinsic = this.api.getApi().tx["xGatewayBitcoin"]["signWithdrawTx"](
                add0x(this.rawTx)
            );
        }

        await extrinsic.signAndSend(currentAccount, ({ events = [], status }) => {
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
                        console.log(

                            colors.green(
                                `提交信托签名交易成功 \n ${phase}: ${section}.${method}:: ${data}`)
                        );
                        process.exit(0);
                    }
                });
            }
        });
    }
}









