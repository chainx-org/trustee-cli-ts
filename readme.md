# trustee-tools CLI

A CLI for trustee-tools.


## Init Environment

```shell
$ yarn
$ yarn run build
$ yarn run link
$ cp .env.example .env
```

## 配置env

```
bitcoin_fee_rate=29422
# 当提现找零 < 该值时，就不要找零了
min_change=1000
chainx_ws_addr=wss://testnet-2.chainx.org/ws
# 比特币私钥(WIF格式)
bitcoin_private_key=cN3Bw8z7o3DSQxPimBXt3M3xnATaq3nW7duisgMFwMYLGVJ4CQnT
#ChainX信托账户私钥
chainx_private_key=beauty quiz evil process wait roof picnic buzz drop knock token such//1//validator
```
## 查看信托信息

```
trustee-tools info
```

## 查看待提现列表

```
trustee-tools list
```

## 查看代签列表

```
trustee-tools tx
```

## 构造提现交易原文并提交上链

```
trustee-tools  create submit sign
```

## 构造提现交易原文不上链

```
trustee-tools  create
```

## 响应待签原文并提交上链

```
trustee-tools  respond submit

```

# License

MIT - see LICENSE

