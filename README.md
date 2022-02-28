# trustee-tools CLI

A CLI for trustee-tools.


## Init Environment

```shell
$ yarn
$ yarn run build
$ cp .env.example .env

```


## Config
- bitcoin_fee_rate

构建比特币交易时所用的 fee rate，单位为聪。

- min_change

最小找零，构造的比特币交易找零小于改值时，放弃该找零。

- chainx_ws_addr

ChainX websocket 链接地址。

- bitcoin_private_key

比特币私钥（256位），建议只在离线环境下配置该项。

- chainx_private_key

ChainX 账户私钥，用于签名并提交 ChainX 交易。

## V4.0 版本信托处理逻辑

### 信托交易

## 热转冷
```
// 构造热钱包转冷钱包交易，需要使用热地址私钥进行签名
trustee-tools  tohot  要转的btc数量
```

## 冷转热

```
// 构造冷钱包转热钱包交易，需要使用冷地址私钥或硬件钱包签名
trustee-tools  tocold  要转的btc数量
```

## 换届交易

```
// 构造换届交易原文，需要使用冷地址私钥或硬件钱包签名
trustee-tools tonext
```

## 使用硬件钱包或者私钥进行签名

1. 配置.env中的redeem_script赎回脚本, 然后签名

```
// 对交易原文进行签名
trustee-tools  sign 代签原文
// 选择签名方式：["trezor", "ledger", "privateKey"]
privateKey
```

# License

MIT - see LICENSE

