require("babel-polyfill");
const TransportNodeHid = require("@ledgerhq/hw-transport-node-hid").default;
const AppBtc = require("@ledgerhq/hw-app-btc").default;

async function example() {
    const transport = await TransportNodeHid.create();
    const appBtc = new AppBtc(transport);
    const result = await appBtc.getWalletPublicKey("45'/0'/0'/0/0");
    return result;
}

example().then(
    result => {
        console.log(result);
    },
    e => {
        console.error(e);
    }
);