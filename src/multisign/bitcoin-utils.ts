const bitcoin = require("bitcoinjs-lib");
const bitcore = require("bitcore-lib");

export const getRedeemScriptFromRaw = (raw, network = "mainnet") => {
    const tx = bitcoin.Transaction.fromHex(raw);
    const txb = bitcoin.TransactionBuilder.fromTransaction(
        tx,
        network === "main" ? bitcoin.networks.bitcoin : bitcoin.networks.testnet
    );

    if (txb.__inputs[0].redeemScript) {
        return txb.__inputs[0].redeemScript.toString("hex");
    }

    return null;
};

export const getPubKeysFromRedeemScript = redeemScript => {
    const script = bitcore.Script.fromString(redeemScript);
    const m = script.chunks[0].opcodenum - 80;
    const pubs = script.chunks
        .slice(1, script.chunks.length - 2)
        .map(chunk => chunk.buf.toString("hex"));

    return [m, pubs];
};
