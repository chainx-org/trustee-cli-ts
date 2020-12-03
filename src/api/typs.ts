
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