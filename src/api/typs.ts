
export class CodeOrAddress {
    addr: string;
    redeemScript: string;
}

export class TrusteeSessionInfo {
    coldAddress: CodeOrAddress;
    hotAddress: CodeOrAddress;
    threshold: number;
    trusteeList: string[];
}

export class ChainPerties {
    ss58Format: number;
    tokenDecimals: number;
    tokenSymbol: string;
    bitcoinType: string;
}

export class WithdrawaItem {
    id: string;
    assetId: number;
    applicant: string;
    balance: number;
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