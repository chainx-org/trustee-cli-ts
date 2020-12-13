import { GluegunToolbox } from 'gluegun'
import Respond from '../api/respond'
import { promtSelectDevice } from '../utils'
import TrezorConnector from '../multisign/trezor'
import Ledger from '../multisign/ledger'

module.exports = {
    name: 'respond',
    alias: ['r'],
    run: async (toolbox: GluegunToolbox) => {
        const {
            parameters,
            // template: { generate },
            // print: { warning },
        } = toolbox

        let sign: boolean = parameters.first === 'signHardware';
        let submit: boolean = parameters.second === 'submit' || parameters.first === 'submit';

        if (sign) {
            const selectDevice = await promtSelectDevice()

            let device: any = null;
            let type: string = selectDevice

            if (selectDevice === 'trezor') {
                const trezor = new TrezorConnector();
                type = selectDevice;
                await trezor.init()
                device = trezor;
                console.log(trezor.isConnected())
            } else if (selectDevice === 'ledger') {
                const ledger = new Ledger()
                device = ledger;
                type = selectDevice;
            }

            const respond = new Respond(true, submit)
            await respond.init(device, type)
            await respond.respond();
        } else {
            const respond = new Respond(false, submit)
            await respond.init(null, 'privateKey')
            await respond.respond();
        }
    },
}
