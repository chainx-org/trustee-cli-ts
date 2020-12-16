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

比特币私钥（目前只之前 WIF 格式），建议只在离线环境下配置该项。

- chainx_private_key

ChainX 账户私钥，用于签名并提交 ChainX 交易。

## V2.0 版本信托处理逻辑

### 一、使用脚本构造比特币提现交易并进行上链
 
 * 1. 显示当前提现列表
    ```
    trustee-tools list
    
    ```
 * 2. 显示当前代签原文
   ```
    trustee-tools tx
   ```
 * 3. 构造代签原文
    * 构造原文后进行签名并提交上链(推荐)
   ```
     trustee-tools create sign submit
   ```
   * 构造原文后不进行签名提交上链
   ```
     trustee-tools create submit
   ```
 * 4. 响应代签原文
 
   * 使用硬件钱包(ledger或trezor)进行签名并提交上链 
   ```
   trustee-tools respond signHardware submit
   ```  
   * 使用比特币私钥进行签名并提交上链
   ```
    trustee-tools respond submit
   ```

### 三、 复制签名后的交易原文提交上链

```
trustee-tools submit 0x000......   
```

### 否决签名

```
trustee-tools submit null   
```

## 热转冷
```
trustee-tools  tohot  要转的btc数量
```

## 冷转热

```
trustee-tools  tocold  要转的btc数量
```

## 使用硬件钱包或者私钥进行签名

1. 配置.env中的redeem_script赎回脚本

```
trustee-tools  sign 代签原文
```
# License

MIT - see LICENSE

