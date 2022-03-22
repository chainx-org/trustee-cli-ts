import { ApiOptions } from '@polkadot/api/types';
// @ts-ignore
import chainxRpc from './types/chainx-rpc';
// @ts-ignore
import chainxTypes from './types/chainx-types';

export const defaultOptions: ApiOptions = {
  types: chainxTypes,
  rpc: chainxRpc
};

export const options = ({ types = {}, rpc = {}, typesChain = {}, typesAlias = {}, ...otherOptions }: ApiOptions = {}): ApiOptions => ({
  types: {
    ...chainxTypes,
    ...types
  },
  rpc: {
    ...chainxRpc,
    ...rpc
  },
  ...otherOptions
});