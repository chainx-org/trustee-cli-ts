import {ApiPromise, Keyring, WsProvider} from "@polkadot/api"
import {assert} from "console";
import {plainToClass} from 'class-transformer'
import {
    BtcWithdrawalProposal,
    ChainPerties,
    TrusteeSessionInfo,
    ValidatorProfile,
    WithdrawaItem,
    WithDrawLimit
} from './types'
const ora = require('ora');
require("dotenv").config();
const fs = require('fs');
const {TypeRegistry} = require("@polkadot/types");
const {Metadata} = require("@polkadot/types/metadata/Metadata");
const rpcFile = JSON.parse(fs.readFileSync('./rpc.json').toString());
const typeFile = JSON.parse(fs.readFileSync('./types.json').toString());
const metaFile = fs.readFileSync('./meta.txt').toString().replace(/[\r\n]/g,"");

class Api {
    public api: ApiPromise;
    private static instance: Api;

    constructor() {
        if (!process.env.chainx_ws_addr) {
            assert(true, "没有设置chainx_ws_addr")
        }
        const resigtry = new TypeRegistry();
        resigtry.setMetadata(new Metadata(resigtry, metaFile))
        const wsProvider = new WsProvider(process.env.chainx_ws_addr);
        this.api = new ApiPromise({rpc: rpcFile, types: typeFile, provider: wsProvider, registry: resigtry});

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
        const properties = plainToClass(ChainPerties, JSON.parse(JSON.stringify(systemProperties)));
        const keyring = new Keyring({type: "ed25519"});
        keyring.setSS58Format(properties.ss58Format)
        return keyring.addFromUri(process.env.chainx_private_key);
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

    public async getTrusteeSessionInfo(session_num): Promise<TrusteeSessionInfo> {
        await this.ready()
        // @ts-ignore
        const session = await this.api.rpc.xgatewaycommon.bitcoinTrusteeSessionInfo(session_num);
        return plainToClass(TrusteeSessionInfo, JSON.parse(JSON.stringify(session)))
    }

    // 获取Storage中信托提现的Proposal状态
    public async getTxByReadStorage(): Promise<BtcWithdrawalProposal | null> {
        await this.ready()
        // @ts-ignore
        const {parentHash} = await this.api.rpc.chain.getHeader();
        const btcTxLists = await this.api.query.xGatewayBitcoin.withdrawalProposal.at(
            parentHash
        );
        if (JSON.stringify(btcTxLists) === "null") {
            return null;
        }

        return plainToClass(BtcWithdrawalProposal, JSON.parse(JSON.stringify(btcTxLists)))
    }

    // 获取节点名称
    public async getNodeNames(accountId: string): Promise<ValidatorProfile | null> {
        await this.ready()
        // @ts-ignore
        const {parentHash} = await this.api.rpc.chain.getHeader();
        const validatorProfile = await this.api.query.xStaking.validators.at(
            parentHash, accountId
        );
        if (JSON.stringify(validatorProfile) === "null") {
            return null;
        }

        return plainToClass(ValidatorProfile, JSON.parse(JSON.stringify(validatorProfile)))
    }

    async getBtcNetworkState() {
        await this.ready()
        // @ts-ignore
        const {parentHash} = await this.api.rpc.chain.getHeader();
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
        await this.ready()
        const systemProperties = await this.api.rpc.system.properties();
        const properties = plainToClass(ChainPerties, JSON.parse(JSON.stringify(systemProperties)));
        properties.bitcoinType = await this.getBtcNetworkState();
        return properties;
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

        return plainToClass(WithDrawLimit, limit.toJSON());
    }
}

export default Api
