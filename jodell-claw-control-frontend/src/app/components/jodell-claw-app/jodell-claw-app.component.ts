import { TranslateService } from '@ngx-translate/core';
import { first } from 'rxjs/operators';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ApplicationPresenterAPI, ApplicationPresenter, RobotSettings } from '@universal-robots/contribution-api';
import { Hero, JodellClawAppNode } from './jodell-claw-app.node';
import { XmlRpcClient } from '../xmlrpc/xmlrpc-client';
import { URCAP_ID, VENDOR_ID } from 'src/generated/contribution-constants';
import { JodellSmartSkillInstance } from '../jodell-smart-skill/jodell-smart-skill.node';

@Component({
    templateUrl: './jodell-claw-app.component.html',
    styleUrls: ['./jodell-claw-app.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false,
})
export class JodellClawAppComponent implements ApplicationPresenter, OnChanges {
    // applicationAPI is optional
    @Input() applicationAPI: ApplicationPresenterAPI;
    // robotSettings is optional
    @Input() robotSettings: RobotSettings;
    // applicationNode is required
    @Input() applicationNode: JodellClawAppNode;

    private xmlrpc: XmlRpcClient;
    response: Promise<string> | null = null;
    openPortResult: Promise<string> | null = null;
    enableResult: Promise<string> | null = null;
    options = ["1200","2400","4800","9600","19200","38400","57600","115200"];
    

    heros = [
            {
                id: 'hero_4',
                name: '盖伦4'
            },
            {
                id: 'hero_5',
                name: '赵信5'
            },
            {
                id: 'hero_2',
                name: '嘉文'
            },
            {
                id: 'hero_6',
                name: '易大师6'
            },
            {
                id: 'hero_7',
                name: '泰达米尔7'
            }
    ];

    constructor(
        protected readonly translateService: TranslateService,
        protected readonly cd: ChangeDetectorRef
    ) {
    }
    
    ngOnChanges(changes: SimpleChanges): void {
        if (changes?.robotSettings) {
            if (!changes?.robotSettings?.currentValue) {
                return;
            }

            if (changes?.robotSettings?.isFirstChange()) {
                if (changes?.robotSettings?.currentValue) {
                    this.translateService.use(changes?.robotSettings?.currentValue?.language);
                }
                this.translateService.setDefaultLang('en');
            }

            this.translateService
                .use(changes?.robotSettings?.currentValue?.language)
                .pipe(first())
                .subscribe(() => {
                    this.cd.detectChanges();
                });

            
            const url = this.applicationAPI.getContainerContributionURL(VENDOR_ID, URCAP_ID, 'jodell-claw-control-backend', 'xmlrpc');
            this.xmlrpc = new XmlRpcClient(`${location.protocol}//${url}/`);
            // this.xmlrpc.methodCall('getMyId').then(res => console.log('application getMyId ngOnChange: ',res));
            console.log(`application node gripperID: ${this.applicationNode.gripperID}`);
            console.log(`application node isSimulation: ${this.applicationNode.isSimulation}`);
        }
    }
    
    onCheckClick(): void{
        this.response = this.xmlrpc.methodCall('getActivateState');
        this.response.then(res => {         
            console.log('Response: ',this.response);
            
        });
        

    }
    onOpenPortClick(): void{
        this.openPortResult = this.xmlrpc.methodCall('openMaster','/dev/ur-ttylink/ttyTool',`${this.applicationNode.baudrate}`);
        // this.openPortResult = this.xmlrpc.methodCall('openMaster','/dev/USB0',`${this.applicationNode.baudrate}`);
        this.openPortResult.then(res => {
            console.log('openPortResult: ',this.openPortResult);
            this.saveNode();
        })
    }
    handleToggle():void{
        this.applicationNode.isSimulation = !this.applicationNode.isSimulation;
        console.log('Toggle action: ',this.applicationNode.isSimulation);
        this.saveNode();
    }
    onEnableClick(): void{
        this.enableResult = this.xmlrpc.methodCall('enableClaw');
        this.enableResult.then(res => {
            console.log('enableResult: ',this.enableResult);
            this.saveNode();
        })
    }
    onDisableClick():void{
        this.enableResult = this.xmlrpc.methodCall('disableClaw');
        this.enableResult.then(res => {
            console.log('enableResult: ',this.enableResult);
            this.saveNode();
        })
    }
    trackByHero(hero:Hero): string{
        return hero.id;
    }

    // call saveNode to save node parameters
    saveNode() {
        this.cd.detectChanges();
        this.applicationAPI.applicationNodeService.updateNode(this.applicationNode);
    }
}
