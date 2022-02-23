
import { GluegunCommand } from 'gluegun'
import Api from '../api/chainx'
import { TrusteeSessionInfo } from '../api/types';


const command: GluegunCommand = {
  name: 'trustee-tools',
  run: async toolbox => {
    const { print } = toolbox
    const colors = require('colors');

    const api = Api.getInstance();
    const session: TrusteeSessionInfo = await api.getTrusteeSessionInfo(-1)
    console.log(colors.red(session.trusteeList))
    print.info('Welcome to Trustee-Tools CLI')
    process.exit(0)
  },
}

module.exports = command
