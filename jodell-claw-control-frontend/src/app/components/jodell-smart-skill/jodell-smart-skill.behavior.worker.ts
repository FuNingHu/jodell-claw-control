import { OptionalPromise, PopupLevel, registerSmartSkillBehavior, ScriptBuilder, SmartSkillBehaviors, SmartSkillsBehaviorAPI } from '@universal-robots/contribution-api';
import { URCAP_ID, VENDOR_ID } from 'src/generated/contribution-constants';
import { JodellSmartSkillInstance } from './jodell-smart-skill.node';
import { JodellClawAppNode } from '../jodell-claw-app/jodell-claw-app.node';

const createSmartNode =(): OptionalPromise<JodellSmartSkillInstance> =>({
    type: 'universal-robots-contribution-jodell-smart-skill',
    name: 'Jodell Initial',
    baudrate:'115200',
    gripperID: 9,
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
    startExecution: async (instance : JodellSmartSkillInstance) => {
        const api = new SmartSkillsBehaviorAPI(self);
        const applicationNode = await api.applicationService.getApplicationNode(`jodell-jodell-claw-control-frontend-jodell-claw-app`) as JodellClawAppNode;
        // const apps = await api.applicationService.getAvailableApplicationNodes();

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
        // builder.addStatements(`popup("Jodell activation GripperID ${instance.gripperID}, baudrate ${instance.baudrate}")`);
        builder.popup(`Initialize done with baudrate is ${applicationNode.baudrate}, gripperID is ${applicationNode.gripperID}`,"Application Info", PopupLevel.INFO, true);
        // builder.popup(`Available applications: ${apps}`,'Application Info',PopupLevel.INFO,false);
        builder.sleep(0.5);
        
        return builder;
    },

    // stopExecution is optional
    stopExecution: (instance) => {
        return new ScriptBuilder();
    },
};

registerSmartSkillBehavior(behaviors);