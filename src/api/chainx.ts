import { ApiPromise, WsProvider, Keyring } from "@polkadot/api"
import { options } from "../chainxtypes"
import { assert } from "console";
import { plainToClass } from 'class-transformer'
import { TrusteeSessionInfo, ChainPerties, WithdrawaItem, WithDrawLimit, BtcWithdrawalProposal, XpalletMiningStakingValidatorProfile } from './types'

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

    public getApi(): ApiPromise {
        return this.api
    }

    public async getAccountKeyring() {
        if (!process.env.chainx_private_key) {
            assert(true, "没有设置ChainX信托账户私钥")
        }
        await this.api.isReady
        const systemProperties = await this.api.rpc.system.properties();

        const properties = plainToClass(ChainPerties, systemProperties.toJSON());
        const keyring = new Keyring({ type: "ed25519" });
        keyring.setSS58Format(properties.ss58Format)
        const account = keyring.addFromUri(process.env.chainx_private_key);
        return account;
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
        const sessionInfo = await this.api.rpc.xgatewaycommon.bitcoinTrusteeSessionInfo();
        const sessionClass = plainToClass(TrusteeSessionInfo, JSON.parse(JSON.stringify(sessionInfo)))
        return sessionClass
    }

    // 获取Storage中信托提现的Proposal状态
    public async getTxByReadStorage(): Promise<BtcWithdrawalProposal | null> {
        await this.ready()
        const { parentHash } = await this.api.rpc.chain.getHeader();
        const btcTxLists = await this.api.query.xGatewayBitcoin.withdrawalProposal.at(
            parentHash
        );
        if (JSON.stringify(btcTxLists) === "null") {
            return null;
        }

        return plainToClass(BtcWithdrawalProposal, JSON.parse(JSON.stringify(btcTxLists)))
    }

    // 获取节点名称
    public async getNodeNames(accountId: string): Promise<XpalletMiningStakingValidatorProfile | null> {
        await this.ready()
        const { parentHash } = await this.api.rpc.chain.getHeader();
        const validatorProfile = await this.api.query.xStaking.validators.at(
            parentHash, accountId
        ); 
        if (JSON.stringify(validatorProfile) === "null") {
            return null;
        }

        return plainToClass(XpalletMiningStakingValidatorProfile, JSON.parse(JSON.stringify(validatorProfile)))
    }

    async getBtcNetworkState() {
        await this.ready()
        const { parentHash } = await this.api.rpc.chain.getHeader();
        // @ts-ignore
        const netWorkType = await this.api.query.xGatewayBitcoin.networkId.at(parentHash);
        if (netWorkType.toString() === "Testnet") {
            return "testnet";
        } else {
            return "mainnet";
        }
    }

    // 获取链状态
    async getChainProperties(): Promise<ChainPerties> {
       // await this.ready()
       // const systemProperties = await this.api.rpc.system.properties();
            //  const properties = plainToClass(ChainPerties, systemProperties.toJSON());
        //const networkType = await this.getBtcNetworkState();

        //properties.bitcoinType = networkType;
        return {
            ss58Format: 44,
            bitcoinType: "mainnet",
            tokenDecimals:18,
            tokenSymbol:'PCX'
        };
    }

    async getBTCWithdrawList(): Promise<WithdrawaItem[]> {
        //  TODO: 处理分页问题
        // @ts-ignore
        await this.ready()
        // @ts-ignore
        const withdrawObject = await this.api.rpc.xgatewayrecords.withdrawalListByChain(
            "Bitcoin"
        );
        const withdrawList: WithdrawaItem[] = [];
        const withdrawItem = plainToClass(WithdrawaItem, withdrawObject.toJSON())
        Object.entries(withdrawItem).forEach(([key, value]) => {
            withdrawList.push({
                id: key,
                // @ts-ignore
                ...value
            });
        });
        // @ts-ignore
        return withdrawList;
    }

    async getWithdrawLimit(): Promise<WithDrawLimit> {
        // TODO: Bitcoin asstId为1
        await this.ready()
        // @ts-ignore
        const limit = await this.api.rpc.xgatewaycommon.withdrawalLimit("1");

        const withdrawLimit = plainToClass(WithDrawLimit, limit.toJSON())
        return withdrawLimit;
    }
}

export default Api