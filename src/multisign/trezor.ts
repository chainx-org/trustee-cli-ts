import console = require("console");

const reverse = require("buffer-reverse");
const EventEmitter = require("events");
var TrezorConnect = require('trezor-connect').default;
var DEVICE_EVENT = require('trezor-connect').DEVICE_EVENT;
var UI_EVENT =require('trezor-connect').UI_EVENT;
var DEVICE = require('trezor-connect').DEVICE;
var UI = require('trezor-connect').UI;
const bitcoin = require("bitcoinjs-lib-zcash");
const bs58check = require("bs58check");
const { getPubKeysFromRedeemScript, getRedeemScriptFromRaw } = require("./bitcoin-utils");
const bitcore = require("bitcore-lib");
const ora = require('ora');

const hardeningConstant = 0x80000000;
const mainnetPath = [
    (45 | hardeningConstant) >>> 0,
    (0 | hardeningConstant) >>> 0,
    (0 | hardeningConstant) >>> 0,
    0,
    0
];
const testnetPath = [
    (45 | hardeningConstant) >>> 0,
    (1 | hardeningConstant) >>> 0,
    (0 | hardeningConstant) >>> 0,
    0,
    0
];

function getSignatures(input, pubs) {
    if (input.signatures) {
        return input.signatures.map(sig => {
            return sig ? bitcore.crypto.Signature.fromBuffer(sig, false).toString() : "";
        });
    }
    return pubs.map(() => "");
}

function constructMultisig(
    pubKeys,
    devicePubKey,
    deviceXpub,
    signatures,
    m,
    network = "mainnet"
) {
    const net =
        network === "mainnet" ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;

    function getNode(xpub) {
        const hd = bitcoin.HDNode.fromBase58(xpub, net);
        return {
            depth: hd.depth,
            child_num: hd.index,
            fingerprint: hd.parentFingerprint,
            public_key: hd.keyPair.getPublicKeyBuffer().toString("hex"),
            chain_code: hd.chainCode.toString("hex")
        };
    }

    function getDefaultXpub(pub) {
        const chaincode = Buffer.from(
            "0000000000000000000000000000000000000000000000000000000000000000",
            "hex"
        );

        const buffer = Buffer.allocUnsafe(78);
        buffer.writeUInt32BE(net.bip32.public, 0);
        buffer.writeUInt8(0, 4);
        buffer.writeUInt32BE(0x00000000, 5);
        buffer.writeUInt32BE(0x00000000, 9);
        chaincode.copy(buffer, 13);
        Buffer.from(pub, "hex").copy(buffer, 45);

        return bs58check.encode(buffer);
    }

    const pubkeys = pubKeys.map(pub => {
        return {
            node:
                pub !== devicePubKey
                    ? getNode(getDefaultXpub(pub))
                    : getNode(deviceXpub),
            address_n: []
        };
    });

    return {
        pubkeys,
        signatures,
        m
    };
}

function getMultisigObj(input, redeemScript, devicePubKey, deviceXpub, network = "mainnet") {
    const [m, pubs] = getPubKeysFromRedeemScript(redeemScript);
    const signatures = getSignatures(input, pubs);
    return constructMultisig(
        pubs,
        devicePubKey,
        deviceXpub,
        signatures,
        m,
        network
    );
}

function constructInputs(tx, redeemScript, devicePubKey, deviceXpub, network = "mainnet") {
    const txb = bitcoin.TransactionBuilder.fromTransaction(
        tx,
        network === "mainnet"
            ? bitcoin.networks.bitcoin
            : bitcoin.networks.testnet
    );

    const multisigArr = txb.inputs.map(input => {
        return getMultisigObj(input, redeemScript, devicePubKey, deviceXpub, network);
    })

    return tx.ins.map((input, index) => {
        return {
            address_n: network === "mainnet" ? mainnetPath : testnetPath,
            script_type: "SPENDMULTISIG",
            prev_index: input.index,
            prev_hash: reverse(input.hash).toString("hex"),
            multisig: multisigArr[index]
        };
    });
}

function constructOutputs(raw, network = "mainnet") {
    const tx = bitcore.Transaction(raw);
    const net =
        network === "mainnet" ? bitcore.Networks.mainnet : bitcore.Networks.testnet;
    return tx.outputs.map(output => {
        const address = bitcore.Address.fromScript(output.script, net).toString();
        return {
            amount: output.satoshis,
            address,
            script_type: "PAYTOADDRESS"
        };
    });
}

function bjsTx2refTx(tx) {
    const extraData = tx.getExtraData();
    return {
        lock_time: tx.locktime,
        version: tx.isDashSpecialTransaction()
            ? tx.version | (tx.dashType << 16)
            : tx.version,
        hash: tx.getId(),
        inputs: tx.ins.map(function (input) {
            return {
                prev_index: input.index,
                sequence: input.sequence,
                prev_hash: reverse(input.hash).toString("hex"),
                script_sig: input.script.toString("hex")
            };
        }),
        bin_outputs: tx.outs.map(function (output) {
            return {
                amount: output.value,
                script_pubkey: output.script.toString("hex")
            };
        }),
        extra_data: extraData ? extraData.toString("hex") : null,
        version_group_id: tx.isZcashTransaction()
            ? parseInt(tx.versionGroupId, 16)
            : null
    };
}

function constructPreTxs(inputsArr) {
    return inputsArr
        .map(input => bitcoin.Transaction.fromHex(input.raw))
        .map(bjsTx2refTx);
}

class Trezor  {

    public list: any;
    public device: any;
    // constructor() {
    //     this.list = TrezorConnect.manifest.getDevices();
    //     console.log(`trezor device list: ${this.list}`);
    // }

    async init() {
        const spinner = ora('trezor connect init..').start();
        await TrezorConnect.init({
            connectSrc: 'https://localhost:8088/',
            lazyLoad: false, // this param will prevent iframe injection until TrezorConnect.method will be called
            manifest: {
                email: 'qinghuan@coming.chat',
                appUrl: 'http://coming.chat'
            },
            popup: true
        })
        const features = await TrezorConnect.getFeatures();

        console.log(features);
        
    }

    // async init() {

    //     const spinner = ora('trezor connect init..').start();
    //     return new Promise((resolve) => {
    //         this.list.on("connect", device => {
    //             // FIXME: 这里没有考虑多个设备的情况

    //             this.device = device;
    //             spinner.stop();
    //             resolve(device);
    //             device.on("disconnect", () => {
    //                 this.device.removeAllListeners();
    //                 this.device = null;
    //                 this.emit("disconnect");
    //             });

    //             device.on("button", code => {
    //                 console.log('press trezor button!')
    //                 this.emit("button", code);
    //             });

    //             device.on("pin", this.pinCallback);
    //         });

    //     })

    // }

    // isConnected() {
    //     return !!this.device;
    // }


    pinCallback(callback) {
        console.log('Please enter PIN. The positions:');
        console.log('7 8 9');
        console.log('4 5 6');
        console.log('1 2 3');

        // note - disconnecting the device should trigger process.stdin.pause too, but that
        // would complicate the code

        // we would need to pass device in the function and call device.on('disconnect', ...

        process.stdin.resume();
        process.stdin.on('data', function (buffer) {
            let text = buffer.toString().replace(/\n$/, "");
            process.stdin.pause();
            callback(null, text);
        });
    }

    async getDeviceXpub(network = "mainnet") {
        // const coin = network === "mainnet" ? "bitcoin" : "testnet";
        // const path = network === "mainnet" ? mainnetPath : testnetPath;
        // const result = await this.device.waitForSessionAndRun(function (session) {
        //     return session.getPublicKey(path, coin);
        // });

        const res = await TrezorConnect.getPublicKey({
            path: "m/49'/0'/0'/0/0",
            coin: "btc"
       })   
       console.log(`trezor getPublicKey res: ${JSON.stringify(res)}`);
       return res.payload.xpub;

       // return [result.message.node.public_key, result.message.xpub];
    }

    async getPublicKey(network = "mainnet") {
        // const [pubKey] = await this.getDeviceXpub(network);
        // return pubKey;

       const res = await TrezorConnect.getPublicKey({
            path: "m/49'/0'/0'",
            coin: "btc"
       })   
       console.log(`trezor getPublicKey res: ${res}`);
       return res.payload.xpub;
    }

    async sign(raw, inputsArr, redeemScript, network = "mainnet") {

        if (!redeemScript) {
            redeemScript = getRedeemScriptFromRaw(raw, network);
        }

        if (!redeemScript) {
            throw new Error("redeem script not provided");
        }

        const transaction = bitcoin.Transaction.fromHex(raw);


        const [devicePubKey, deviceXpub] =  [
            "034d3e7f87e69c6c71df6052b44f9ed99a3d811613140ebf09f8fdaf904a2e1de8",
            "xpub6GAsPTES9mw9xLQivyTG9qpEkwuCHDmoXVwVM2GWxhQ6mZoUBkHAVcc4hofSf8yGi5buGmMnGP44DRCVRjm53jNWgViszQ3KHNpCegVw91H"
        ]
        const inputs = constructInputs(transaction, redeemScript, devicePubKey, deviceXpub, network);
        const outputs = constructOutputs(raw, network);

        const txs = constructPreTxs(inputsArr);

        console.log(`trezor sign inputs: ${JSON.stringify(inputs)}`);
        console.log(`trezor sign outputs: ${JSON.stringify(outputs)}`);
        console.log(`trezor sign txs: ${JSON.stringify(txs)}`);

        return "";
    }
}


export default Trezor
