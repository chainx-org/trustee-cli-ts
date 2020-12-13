require("babel-polyfill");
const TransportNodeHid = require("@ledgerhq/hw-transport-node-hid").default;
const AppBtc = require("@ledgerhq/hw-app-btc").default;
const bitcoinjs = require("bitcoinjs-lib");
const { getRedeemScriptFromRaw } = require("./bitcoin-utils");

const bitcore = require("bitcore-lib");
const mainnetPath = "m/45'/0'/0'/0/0";
const testnetPath = "m/45'/1'/0'/0/0";

class Ledger {

    public transport: any;
    public publicKey: string;
    public network: string;
    public appBtc: any;

    constructor(network: string) {
        this.network = network;
    }

    async init() {
        this.transport = await TransportNodeHid.open("");
        this.appBtc = new AppBtc(this.transport);
    }

    async getPubKeyFromLedger(btc: any) {
        const path = this.network === "mainnet" ? mainnetPath : testnetPath;

        const result = await btc.getWalletPublicKey(path);
        const compressed = btc.compressPublicKey(
            Buffer.from(result.publicKey, "hex")
        );

        return compressed.toString("hex");
    }

    async getPublicKey() {
        const key = await this.getPubKeyFromLedger(this.appBtc);
        return key;
    }

    public constructTxObj(raw, inputArr, redeemScript) {
        const net =
            this.network === "mainnet" ? bitcore.Networks.mainnet : bitcore.Networks.testnet;

        const txObj = bitcore.Transaction();

        const utxos = inputArr.map(input => {
            const tx = bitcore.Transaction(input.raw);
            const script = tx.outputs[input.index].script.toHex();
            return {
                txId: input.hash,
                outputIndex: input.index,
                address: input.address,
                script,
                satoshis: input.satoshi
            };
        });

        const script = bitcore.Script.fromString(redeemScript);
        const chunks = script.chunks.slice(1, script.chunks.length - 2);
        const pubkeys = chunks.map(chunk => chunk.buf.toString("hex"));
        const m = script.chunks[0].opcodenum - 80;

        for (let utxo of utxos) {
            txObj.from(utxo, pubkeys, m, false, { noSorting: true });
        }

        const originTx = bitcore.Transaction(raw);
        for (const output of originTx.outputs) {
            const address = bitcore.Address.fromScript(output.script, net);

            txObj.to(address.toString(), output.satoshis);
        }
        this.applyAlreadyExistedSig(txObj, raw);

        return txObj;
    }

    public applyAlreadyExistedSig(txObj, raw) {
        const tx = bitcoinjs.Transaction.fromHex(raw);
        const txb = bitcoinjs.TransactionBuilder.fromTransaction(
            tx,
            this.network === "mainnet"
                ? bitcoinjs.networks.bitcoin
                : bitcoinjs.networks.testnet
        );

        txb.__inputs.forEach((input, index) => {
            if (!input.pubkeys) {
                return;
            }

            const pubkyes = input.pubkeys.map(key => key.toString("hex"));
            input.signatures.forEach((sig, sigIdx) => {
                if (typeof sig === "undefined") {
                    return;
                }

                const pubkey = pubkyes[sigIdx];
                const obj = {
                    inputIndex: index,
                    signature: bitcore.crypto.Signature.fromBuffer(sig, false),
                    sigtype: bitcore.crypto.Signature.SIGHASH_ALL,
                    publicKey: bitcore.PublicKey(pubkey, {
                        network:
                            this.network === "mainnet"
                                ? bitcore.Networks.mainnet
                                : bitcore.Networks.testnet,
                        compressed: true
                    })
                };

                txObj.applySignature(obj);
            });
        });
    }

    public async sign(raw, inputsObj, redeemScript, network = "mainnet") {

        const pubkey = await this.getPubKeyFromLedger(this.appBtc);

        if (!redeemScript) {
            redeemScript = getRedeemScriptFromRaw(raw, this.network);
        }

        if (!redeemScript) {
            throw new Error("redeem script not provided");
        }

        const toSignInputs = inputsObj.map(({ raw, index }) => {
            const tx = this.appBtc.splitTransaction(raw, true);
            return [tx, index, redeemScript];
        });

        const outputScript = this.appBtc
            .serializeTransactionOutputs(this.appBtc.splitTransaction(raw))
            .toString("hex");

        const path = this.network === "mainnet" ? mainnetPath : testnetPath;
        const paths = toSignInputs.map(() => path);
        // @ts-ignore
        const result = await btc.signP2SHTransaction(
            toSignInputs,
            // @ts-ignore
            paths,
            outputScript
        );

        const signatureObjs = result.map(function (sig, index) {
            return {
                inputIndex: index,
                signature: bitcore.crypto.Signature.fromString(sig),
                sigtype: bitcore.crypto.Signature.SIGHASH_ALL,
                publicKey: bitcore.PublicKey(pubkey, {
                    network:
                        network === "mainnet"
                            ? bitcore.Networks.mainnet
                            : bitcore.Networks.testnet,
                    compressed: true
                })
            };
        });

        const finalTx = this.constructTxObj(raw, inputsObj, redeemScript);
        for (const signature of signatureObjs) {
            finalTx.applySignature(signature);
        }

        return finalTx.toString("hex");
    }

}

export default Ledger
