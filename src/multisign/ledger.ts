require("babel-polyfill");
import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
const AppBtc = require("@ledgerhq/hw-app-btc").default;
import { compressPublicKey } from '@ledgerhq/hw-app-btc/lib/compressPublicKey';
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
        this.transport = await TransportNodeHid.create();
        this.transport.setDebugMode(true);
        this.appBtc = new AppBtc(this.transport);
    }

    async getPubKeyFromLedger(btc: any) {
        const path = mainnetPath;
        const result = await btc.getWalletPublicKey(path);
        const compressed = compressPublicKey(
            Buffer.from(result.publicKey, "hex")
        );
        return compressed.toString("hex");
    }

    async getPublicKey() {
        const key = await this.getPubKeyFromLedger(this.appBtc);
        return key;
    }

    async getBitcoinAddress() {
        const path = mainnetPath;
        const result = await this.appBtc.getWalletPublicKey(path);
        return result.bitcoinAddress;
    }

    public constructTxObj(raw, inputArr, redeemScript) {
        console.log('construct .......1')

        const net = bitcore.Networks.mainnet;
        console.log('construct .......2')

        const txObj = bitcore.Transaction();
        console.log('construct .......3')

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
        console.log('construct .......4')


        const script = bitcore.Script.fromString(redeemScript);
        const chunks = script.chunks.slice(1, script.chunks.length - 2);
        const pubkeys = chunks.map(chunk => chunk.buf.toString("hex"));
        const m = script.chunks[0].opcodenum - 80;
        console.log('construct .......5')

        try {
            for (let utxo of utxos) {
                txObj.from(utxo, pubkeys, m, false, { noSorting: true });
            }
        } catch (err) {
            console.log('construct .......' + JSON.stringify(err))
        }
        const originTx = bitcore.Transaction(raw);
        for (const output of originTx.outputs) {
            const address = bitcore.Address.fromScript(output.script, net);

            txObj.to(address.toString(), output.satoshis);
        }
        console.log('construct .......6')
        console.log('redeem script:' + JSON.stringify(redeemScript))
        this.applyAlreadyExistedSig(txObj, raw);

        return txObj;
    }

    public applyAlreadyExistedSig(txObj, raw) {
        console.log('apply .......1')
        const tx = bitcoinjs.Transaction.fromHex(raw);
        const txb = bitcoinjs.TransactionBuilder.fromTransaction(tx, bitcore.Networks.mainnet);
        console.log('apply .......2')
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
        console.log('apply .......3')
    }

    public async sign(raw, inputsObj, redeemScript, network = "mainnet") {
        console.log('sign .......1')
        const pubkey = await this.getPubKeyFromLedger(this.appBtc);
        if (!redeemScript) {
            redeemScript = getRedeemScriptFromRaw(raw, this.network);
        }
        console.log('sign .......2')
        if (!redeemScript) {
            throw new Error("redeem script not provided");
        }
        console.log('sign .......3')
        const toSignInputs = inputsObj.map(({ raw, index }) => {
            const tx = this.appBtc.splitTransaction(raw, true);
            return [tx, index, redeemScript];
        });
        console.log('sign .......4')
        const outputScript = this.appBtc
            .serializeTransactionOutputs(this.appBtc.splitTransaction(raw))
            .toString("hex");

        console.log('sign .......5')
        const path = this.network === "mainnet" ? mainnetPath : testnetPath;
        const paths = toSignInputs.map(() => path);
        console.log('sign .......6')

        const result = await this.appBtc.signP2SHTransaction({
            inputs: toSignInputs,
            associatedKeysets: paths,
            outputScriptHex: outputScript
        });
        console.log('sign .......7')


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
        console.log('sign .......8')
        const finalTx = this.constructTxObj(raw, inputsObj, redeemScript);
        for (const signature of signatureObjs) {
            finalTx.applySignature(signature);
        }
        console.log('sign .......9')
        console.log(`this.network: ${this.network}  network ${network} \n`)
        return finalTx.toString('hex');
    }
}

export default Ledger
