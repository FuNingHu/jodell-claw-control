import { OptionalPromise, PopupLevel, registerSmartSkillBehavior, ScriptBuilder, SmartSkillBehaviors, SmartSkillsBehaviorAPI } from '@universal-robots/contribution-api';
import { URCAP_ID, VENDOR_ID } from 'src/generated/contribution-constants';
import { JodellSmartSkillOpenInstance } from './jodell-smart-skill-open.node';
import { JodellClawAppNode } from '../jodell-claw-app/jodell-claw-app.node';

const createSmartNode =(): OptionalPromise<JodellSmartSkillOpenInstance> =>({
    type: 'universal-robots-contribution-jodell-smart-skill-open',
    name: 'Jodell Open',
    enabled: true,
    parameters:{
    }
});
const behaviors: SmartSkillBehaviors = {
    // factory is required
    factory: createSmartNode,
    // factory: () => {
    //     return {
    //         type: 'universal-robots-contribution-jodell-smart-skill',
    //         name: 'Jodell Initial',
    //         parameters: {
    //         },
    //     };
    // },

    // startExecution is required
    startExecution: async (instance : JodellSmartSkillOpenInstance) => {
        const api = new SmartSkillsBehaviorAPI(self);
        const applicationNode = await api.applicationService.getApplicationNode(`jodell-jodell-claw-control-frontend-jodell-claw-app`) as JodellClawAppNode;

        const builder = new ScriptBuilder();
        const url = `servicegateway/${VENDOR_ID}/${URCAP_ID}/jodell-claw-control-backend/xmlrpc`;
        builder.assign('jodell_daemon',`rpc_factory("xmlrpc","${location.protocol}//${url}/")`);
        builder.addStatements('set_tool_voltage(24)');
        builder.addStatements(`set_tool_communication(True, ${applicationNode.baudrate}, 0, 1, 1.0, 3.5)`);
        builder.addStatements(`jodell_daemon.openMaster("/dev/ur-ttylink/ttyTool", "${applicationNode.baudrate}")`);
        builder.addStatements(`jodell_daemon.setMyId(${applicationNode.gripperID})`);
        builder.ifCondition(`jodell_daemon.enableClaw() != "OK"`);
        builder.popup('Enable failure, contact vendor.','Jodell Error Info', PopupLevel.ERROR, true);
        builder.halt();
        builder.end();
        builder.sleep(0.2);
        builder.addStatements('jodell_daemon.doCmd(255,100,100)'); //(pos, speed, torque)
        return builder;
    },

    // stopExecution is optional
    stopExecution: (instance) => {
        return new ScriptBuilder();
    },
};

registerSmartSkillBehavior(behaviors);