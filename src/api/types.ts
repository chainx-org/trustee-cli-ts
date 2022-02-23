import {bech32, bech32m} from "bech32";

export class CodeOrAddress {
    addr: string;
    redeemScript: string;
}

export class TrusteeSessionInfo {
    coldAddress: CodeOrAddress;
    hotAddress: CodeOrAddress;
    threshold: number;
    trusteeList: [];
    multiAccount: string;
    startHeight: number;
    endHeight: number;
}

export class ChainPerties {
    ss58Format: number;
    tokenDecimals: number;
    tokenSymbol: string;
    network: string;
    bitcoinType: string;
}

export class WithdrawaItem {
    id: string;
    assetId: number;
    applicant: string;
    balance: string;
    addr: string;
    ext: string;
    height: number;
    state: string;
}

export class WithDrawLimit {
    minimalWithdrawal: string;
    fee: string;
}

export class BtcWithdrawalProposal {
    sigState: string;
    withdrawalIdList: number[];
    tx: string;
    trusteeList: [string, boolean];
}

export interface AlreadySigned {
    accountId: string;
    address: string;
    signed: boolean;
}

export class ValidatorProfile {
    registeredAt: string;
    isChilled: string;
    lastChilled: string;
    referralId: string;
}

export interface Bech32Result {
    version: number;
    prefix: string;
    data: Buffer;
}

export function fromBech32(address: string): Bech32Result {
    let result;
    let version;
    try {
        result = bech32.decode(address);
        // tslint:disable-next-line:no-empty
    } catch (e) {
    }

    if (result) {
        version = result.words[0];
        if (version !== 0) throw new TypeError(address + ' uses wrong encoding');
    } else {
        result = bech32m.decode(address);
        version = result.words[0];
        if (version === 0) throw new TypeError(address + ' uses wrong encoding');
    }

    const data = bech32.fromWords(result.words.slice(1));

    return {
        version,
        prefix: result.prefix,
        data: Buffer.from(data),
    };
}

export function fromBech32ToScript(address: string): Buffer {
    return Buffer.from("5120"+fromBech32(address).data.toString("hex"), "hex");
}

export function scriptToBech32Adrress(script: Buffer): string {
    const result = bech32.toWords(script.slice(2, 34));
    return bech32m.encode("tb", result);
}

