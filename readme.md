# trustee-tools CLI

A CLI for trustee-tools.


## Init Environment

```shell
$ yarn
$ yarn run build
$ yarn run link
$ cp .env.example .env'

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
 * 3. 无代签原文则进行create构建（需设置信托私钥）
   
   ```
     trustee-tools create submit
   ```
 * 4. **复制签名后返回的交易原文，进入下一步**
   
### 二、使用信托UI工具构造特殊交易进行签名

![image](https://user-images.githubusercontent.com/7252280/101735161-6aa06c00-3afc-11eb-8d61-4053213c777e.png)
### 三、 复制签名后的交易原文提交上链

   ```
     trustee-tools submit 0x000......
   
   ```

## 热转冷

```
trustee-tools  tc
```

# License

MIT - see LICENSE

