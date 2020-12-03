import { ApiPromise, WsProvider } from "@polkadot/api"
import { options } from "@chainx-v2/api"
import { assert } from "console";
import { plainToClass } from 'class-transformer'
import { TrusteeSessionInfo } from './typs'

const ora = require('ora');
require("dotenv").config();

class Api {
    public api: ApiPromise;
    private static instance: Api;

    constructor() {
        if (!process.env.chainx_ws_addr) {
            assert(true, "没有设置chainx_ws_addr")
        }
        const wsProvider = new WsProvider(process.env.chainx_ws_addr);
        this.api = new ApiPromise(options({ provider: wsProvider }));

    }

    public static getInstance() {
        if (!Api.instance) {
            Api.instance = new Api();
        }

        return Api.instance;
    }

    async ready() {
        const spinner = ora('chainx api init..').start();
        await this.api.isReady;
        spinner.stop();
    }

    public async getTrusteeSessionInfo(): Promise<TrusteeSessionInfo> {
        await this.ready()
        // @ts-ignore
        const session = await this.api.rpc.xgatewaycommon.bitcoinTrusteeSessionInfo();
        const sessionClass = plainToClass(TrusteeSessionInfo, JSON.parse(JSON.stringify(session)))
        return sessionClass
    }

    // 获取Storage中信托提现的Proposal状态
    public async getTxByReadStorage() {
        const { parentHash } = await this.api.rpc.chain.getHeader();
        const btcTxLists = await this.api.query.xGatewayBitcoin.withdrawalProposal.at(
            parentHash
        );
        if (JSON.stringify(btcTxLists) !== "null") {
            // @ts-ignore
            return JSON.parse(btcTxLists);
        }
    }

    async getBtcNetworkState() {
        const { parentHash } = await this.api.rpc.chain.getHeader();
        const netWorkType = await this.api.query.xGatewayBitcoin.networkId.at(parentHash);
        if (netWorkType.toString() === "Testnet") {
            return "testnet";
        } else {
            return "mainnet";
        }
    }

    // 获取链状态
    async getChainProperties() {
        const systemProperties = await this.api.rpc.system.properties();
        const properties = systemProperties.toJSON();
        // BTC 精度信息
        // @ts-ignore
        const assets = await this.api.rpc.xassets.getAssets();
        // const json = assets.toJSON();
        // const normalized = Object.keys(json).map(id => {
        //     return {
        //         id,
        //         ...json[id]
        //     };
        // });

        const networkType = await this.getBtcNetworkState();

        properties.bitcoin_type = networkType;

        return properties;
    }

    async getBTCWithdrawList() {
        //  TODO: 处理分页问题
        // @ts-ignore
        const withdrawObject = await this.api.rpc.xgatewayrecords.withdrawalListByChain(
            "Bitcoin"
        );
        let withdrawList = [];
        Object.entries(withdrawObject.toJSON()).forEach(([key, value]) => {
            withdrawList.push({
                id: key,
                // @ts-ignore
                ...value
            });
        });

        return withdrawList;
    }

    async getWithdrawLimit(api) {
        // TODO: Bitcoin asstId为1
        // @ts-ignore
        const limit = await this.api.rpc.xgatewaycommon.withdrawalLimit("1");
        const json = JSON.parse(limit.toString());
        return json;
    }
}

export default Api