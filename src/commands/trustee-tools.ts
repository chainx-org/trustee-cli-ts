
import { GluegunCommand } from 'gluegun'
import Api from '../api/chainx'
import { TrusteeSessionInfo } from '../api/typs';


const command: GluegunCommand = {
  name: 'trustee-tools',
  run: async toolbox => {
    const { print } = toolbox
    const colors = require('colors');

    const api = Api.getInstance();
    const session: TrusteeSessionInfo = await api.getTrusteeSessionInfo()

    console.log(colors.red(session.trusteeList))

    print.info('Welcome to your CLI')
  },
}

module.exports = command
