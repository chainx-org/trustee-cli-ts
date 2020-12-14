require("babel-polyfill");
import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
const AppBtc = require("@ledgerhq/hw-app-btc").default;
const bitcoinjs = require("bitcoinjs-lib");
const { getRedeemScriptFromRaw } = require("./bitcoin-utils");

const bitcore = require("bitcore-lib");
const mainnetPath = "m/44'/0'/0'/0/0";
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
        this.transport = await TransportNodeHid.create();
        this.transport.setDebugMode(true);
        this.appBtc = new AppBtc(this.transport);
    }

    async getPubKeyFromLedger(btc: any) {
        const path = this.network === "mainnet" ? mainnetPath : testnetPath;
        const result = await btc.getWalletPublicKey(path);
        return result.publicKey.toString('hex');
    }

    async getPublicKey() {
        const key = await this.getPubKeyFromLedger(this.appBtc);
        return key;
    }

    public constructTxObj(raw, inputArr, redeemScript) {

        const net = bitcore.Networks.mainnet;

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

        try {
            for (let utxo of utxos) {
                txObj.from(utxo, pubkeys, m, false, { noSorting: true });
            }
        } catch (err) {
            console.log('construct error.......' + JSON.stringify(err))
        }
        const originTx = bitcore.Transaction(raw);
        for (const output of originTx.outputs) {
            const address = bitcore.Address.fromScript(output.script, net);

            txObj.to(address.toString(), output.satoshis);
        }
        console.log('redeem script:' + JSON.stringify(redeemScript))
        this.applyAlreadyExistedSig(txObj, raw);

        return txObj;
    }

    public applyAlreadyExistedSig(txObj, raw) {
        const tx = bitcoinjs.Transaction.fromHex(raw);
        const txb = bitcoinjs.TransactionBuilder.fromTransaction(tx, bitcore.Networks.mainnet);
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
                        network: bitcore.Networks.mainnet,
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

        const result = await this.appBtc.signP2SHTransaction({
            inputs: toSignInputs,
            associatedKeysets: paths,
            outputScriptHex: outputScript
        });


        const signatureObjs = result.map(function (sig, index) {
            return {
                inputIndex: index,
                signature: bitcore.crypto.Signature.fromString(sig),
                sigtype: bitcore.crypto.Signature.SIGHASH_ALL,
                publicKey: bitcore.PublicKey(pubkey, {
                    network: bitcore.Networks.mainnet,
                    compressed: true
                })
            };
        });
        const finalTx = this.constructTxObj(raw, inputsObj, redeemScript);
        for (const signature of signatureObjs) {
            finalTx.applySignature(signature);
        }
        console.log(`this.network: ${this.network}  network ${network} \n`)
        return finalTx.toString('hex');
    }
}

export default Ledger
