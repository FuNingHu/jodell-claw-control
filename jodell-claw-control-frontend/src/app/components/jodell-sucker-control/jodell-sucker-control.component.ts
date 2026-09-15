import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ProgramPresenter, ProgramPresenterAPI, RobotSettings } from '@universal-robots/contribution-api';
import { JodellSuckerControlNode } from './jodell-sucker-control.node';
import { first } from 'rxjs/operators';
import { URCAP_ID, VENDOR_ID } from 'src/generated/contribution-constants';
import { JodellClawAppNode } from '../jodell-claw-app/jodell-claw-app.node';
import { XmlRpcClient } from '../xmlrpc/xmlrpc-client';

@Component({
    templateUrl: './jodell-sucker-control.component.html',
    styleUrls: ['./jodell-sucker-control.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false,
})

export class JodellSuckerControlComponent implements OnChanges, ProgramPresenter {
    // presenterAPI is optional
    @Input() presenterAPI: ProgramPresenterAPI;

    // robotSettings is optional
    @Input() robotSettings: RobotSettings;
    // contributedNode is optional
    @Input() contributedNode: JodellSuckerControlNode;

    private xmlrpc:XmlRpcClient;
    private activateStatus: Promise<string> | null = null;

    private options = ['Grip','Release'];
    applicationNode: JodellClawAppNode;
    
    constructor(
        protected readonly translateService: TranslateService,
        protected readonly cd: ChangeDetectorRef
    ) {
    }

    async ngOnChanges(changes: SimpleChanges): Promise<void> {
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

            const url = this.presenterAPI.getContainerContributionURL(VENDOR_ID, URCAP_ID, 'jodell-claw-control-backend','xmlrpc');
            this.xmlrpc = new XmlRpcClient(`${location.protocol}//${url}/`);
            this.xmlrpc.methodCall('getActivateState').then(res => console.log(res));
            
            //Changed
            // this.applicationNode = await this.presenterAPI.applicationService.getApplicationNode(`${VENDOR_ID}-${URCAP_ID}-frontend-${URCAP_ID}-application`) as JodellClawAppNode;
            this.applicationNode = await this.presenterAPI.applicationService.getApplicationNode(`jodell-jodell-claw-control-frontend-jodell-claw-app`) as JodellClawAppNode;
        }
    }

    async onMoveClick(){
        const title = 'Information';
        const text = 'Gripper is not enabled yet, go to Application node to proceed.';
        const icon = 'info';
        const confirmText = 'Acknowledge';
        const confirmIcon = 'info';

        this.activateStatus = this.xmlrpc.methodCall('getActivateState');
        const status = await this.activateStatus; //等待异步操作完成

        if(status!=='true'){
            const dialogData = await this.presenterAPI.dialogService.openConfirmDialog(
                title,
                text,
                icon,
                confirmText,
                confirmIcon,
            );  
            console.log(dialogData);
        }else{
            this.xmlrpc.methodCall('startOrStopDevice',
                this.contributedNode.position.toString());
            console.log("startOrStopDevice executed!")
        }
        // this.applicationNode.gripperID = Number(this.applicationNode.gripperID) + 1;
        // console.log(`PN add 1 to gripperID, result: ${this.applicationNode.gripperID}`);
    }
    

    // call saveNode to save node parameters
    async saveNode() {
        this.cd.detectChanges();   
        
        await this.presenterAPI.programNodeService.updateNode(this.contributedNode);
    }
}
