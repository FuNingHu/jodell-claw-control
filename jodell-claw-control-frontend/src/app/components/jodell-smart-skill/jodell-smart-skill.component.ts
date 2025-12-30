import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, SimpleChanges} from '@angular/core';
import {
  RobotSettings,
  SmartSkillInstance,
  SmartSkillPresenter,
  SmartSkillsPresenterAPI
} from '@universal-robots/contribution-api';
import {TranslateService} from "@ngx-translate/core";
import {first} from "rxjs";
import { JodellSmartSkillInstance } from './jodell-smart-skill.node';
import { JodellClawAppNode } from '../jodell-claw-app/jodell-claw-app.node';
import { URCAP_ID, VENDOR_ID } from 'src/generated/contribution-constants';

@Component({
    templateUrl: './jodell-smart-skill.component.html',
    styleUrls: ['./jodell-smart-skill.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false,
})
export class JodellSmartSkillComponent implements SmartSkillPresenter, OnChanges {
    @Input()
    // instance: SmartSkillInstance;
    instance: JodellSmartSkillInstance;

    @Input()
    presenterAPI: SmartSkillsPresenterAPI;

    @Input()
    robotSettings: RobotSettings;

    applicationNode: JodellClawAppNode;
    
    private options = ["1200","2400","4800","9600","19200","38400","57600","115200"];
    // private baudrate: string = "115200";
    // private gripperID: number = 9; 

    constructor(
        protected readonly translateService: TranslateService,
        protected readonly cd: ChangeDetectorRef
    ) {
    }

    async ngOnChanges(changes: SimpleChanges): Promise<void> {
        if (changes.robotSettings?.isFirstChange()) {
            this.translateService.setDefaultLang('en');
        }

        if (changes.robotSettings) {
            if (!changes.robotSettings.currentValue) {
                return;
            }

            if (this.robotSettings) {
                this.robotSettings.units.LENGTH = changes.robotSettings.currentValue.units.LENGTH;
                this.robotSettings.units.PLANE_ANGLE = changes.robotSettings.currentValue.units.PLANE_ANGLE;
                this.robotSettings.units.MASS = changes.robotSettings.currentValue.units.MASS;
            }

            this.translateService.use(changes.robotSettings.currentValue.language).pipe(first()).subscribe();
            this.cd.detectChanges();

            this.applicationNode = await this.presenterAPI.applicationService.getApplicationNode(`${VENDOR_ID}-${URCAP_ID}-frontend-${URCAP_ID}-application`) as JodellClawAppNode;
            
            
        }
        
        console.log('Smart skill instance name: '+this.instance.name);
        console.log('Smart skill instance baudrate: '+this.instance.baudrate);
        console.log('Smart skill instance gripperID: '+this.instance.gripperID);
        console.log('Smart skill instance enabled: '+this.instance.enabled);
    }

    selectionChange($event){
        console.log($event);
    }

    // Example of updating the node parameters from the component
    updateSmartSkillParameter(variable_name: string, value: unknown): void {
        this.presenterAPI.smartSkillInstanceService.updateInstance({
            ...this.instance,
            parameters: { ...this.instance.parameters, [variable_name]: value },
        });
    }

    
}
