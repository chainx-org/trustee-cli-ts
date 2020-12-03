require("dotenv").config();
require("console.table");
import { Api } from "../api/chainx";
import { Keyring } from "@polkadot/api";
import {
    getWithdrawLimit,
    getBTCWithdrawList,
    getTrusteeSessionInfo,
    getChainProperties
} from "../api/bitcoin";

