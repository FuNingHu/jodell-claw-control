import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, SimpleChange, SimpleChanges } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LogMessage, RobotSettings, SystemInfoPresenter, SystemInfoPresenterAPI } from '@universal-robots/contribution-api';
import { first } from 'rxjs';
import { JodellClawAppNode } from '../jodell-claw-app/jodell-claw-app.node';

@Component({
    standalone: true,
    imports: [],
    templateUrl: './jodell-system-info-node.component.html',
    styleUrls: ['./jodell-system-info-node.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JodellSystemInfoNodeComponent implements SystemInfoPresenter {
    @Input() presenterAPI: SystemInfoPresenterAPI;
    @Input() robotSettings: RobotSettings;

    applicationNode: JodellClawAppNode;

    constructor(
        protected readonly translateService: TranslateService,
        protected readonly cd: ChangeDetectorRef
    ){}
    async ngOnChanges(changes: SimpleChanges): Promise<void>{
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

            //Changed
            this.applicationNode = await this.presenterAPI.applicationService.getApplicationNode(`jodell-jodell-claw-control-frontend-jodell-claw-app`) as JodellClawAppNode;
            console.log(`System Info application read: baudrate is ${this.applicationNode.baudrate}, gripperID is ${this.applicationNode.gripperID}`);            
        }
    }

    
}
