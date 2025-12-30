/// <reference lib="webworker" />
import {
    ApplicationBehaviors,
    ApplicationNode, OptionalPromise,
    PopupLevel,
    registerApplicationBehavior,
    ScriptBuilder
} from '@universal-robots/contribution-api';
import { JodellClawAppNode } from './jodell-claw-app.node';
import { URCAP_ID, VENDOR_ID } from 'src/generated/contribution-constants';


// factory is required
const createApplicationNode = (): OptionalPromise<JodellClawAppNode> => ({
    type: 'jodell-jodell-claw-control-frontend-jodell-claw-app',    // type is required
    version: '1.0.3',     // version is required
    gripperID: 9,
    baudrate: '115200',
    isSimulation: true
});

// generatePreamble is optional
const generatePreambleScriptCode = async (node: JodellClawAppNode): Promise<ScriptBuilder> => {
    const builder = new ScriptBuilder();
    
    if(!node.isSimulation){
        const url = `servicegateway/${VENDOR_ID}/${URCAP_ID}/jodell-claw-control-backend/xmlrpc`;
        builder.assign('jodell_daemon',`rpc_factory("xmlrpc","${location.protocol}//${url}/")`);
        builder.addStatements('set_tool_voltage(24)');
        builder.addStatements(`set_tool_communication(True, ${node.baudrate}, 0, 1, 1.0, 3.5)`);
        builder.addStatements(`jodell_daemon.openMaster("/dev/ur-ttylink/ttyTool", "${node.baudrate}")`);
        builder.addStatements(`jodell_daemon.setMyId(${node.gripperID})`);
        builder.ifCondition(`jodell_daemon.enableClaw() != "OK"`);
        builder.popup('Enable failure, contact vendor.','Jodell Error Info', PopupLevel.ERROR, true);
        builder.halt();
        builder.end();  
    }
    builder.sleep(0.2);  
    
    //Read the script file using Fetch API
    const scriptFilePath = 'assets/scripts/custom_fncs.script';
    const response = await fetch(scriptFilePath);
    const scriptContent = await response.text();
    builder.addRaw(scriptContent);
    return builder;
};

// upgradeNode is optional
const upgradeApplicationNode
  = (loadedNode: ApplicationNode, defaultNode: JodellClawAppNode): JodellClawAppNode =>
      defaultNode;

// downgradeNode is optional
const downgradeApplicationNode
  = (loadedNode: ApplicationNode, defaultNode: JodellClawAppNode): JodellClawAppNode =>
      defaultNode;

const behaviors: ApplicationBehaviors = {
    factory: createApplicationNode,
    generatePreamble: generatePreambleScriptCode,
    upgradeNode: upgradeApplicationNode,
    downgradeNode: downgradeApplicationNode
};

registerApplicationBehavior(behaviors);


