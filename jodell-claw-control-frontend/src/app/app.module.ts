import { DoBootstrap, Injector, NgModule } from '@angular/core';
import { JodellClawControlComponent } from './components/jodell-claw-control/jodell-claw-control.component';
import { JodellClawAppComponent } from './components/jodell-claw-app/jodell-claw-app.component';
import { UIAngularComponentsModule } from '@universal-robots/ui-angular-components';
import { BrowserModule } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';
import { HttpBackend, HttpClientModule } from '@angular/common/http';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import {MultiTranslateHttpLoader} from 'ngx-translate-multi-http-loader';
import { PATH } from '../generated/contribution-constants';
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import { JodellSmartSkillComponent } from './components/jodell-smart-skill/jodell-smart-skill.component';
import { JodellSmartSkillOpenInstance } from './components/jodell-smart-skill-open/jodell-smart-skill-open.node';
import { SampleOperatorScreenComponent } from './components/sample-operator-screen/sample-operator-screen.component';
import { SampleOperatorScreenConfigurationComponent } from './components/sample-operator-screen/sample-operator-screen-configuration.component';
import { JodellSystemInfoNodeComponent } from './components/jodell-system-info/jodell-system-info-node.component';
import { JodellSmartSkillOpenComponent } from './components/jodell-smart-skill-open/jodell-smart-skill-open.component';
import { JodellSmartSkillCloseComponent } from './components/jodell-smart-skill-close/jodell-smart-skill-close.component';

export const httpLoaderFactory = (http: HttpBackend) =>
    new MultiTranslateHttpLoader(http, [
        { prefix: PATH + '/assets/i18n/', suffix: '.json' },
        { prefix: './ui/assets/i18n/', suffix: '.json' },
    ]);

@NgModule({
    declarations: [
        JodellClawControlComponent,
        JodellClawAppComponent,
        JodellSmartSkillComponent
    ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        UIAngularComponentsModule,
        HttpClientModule,
        TranslateModule.forRoot({
            loader: { provide: TranslateLoader, useFactory: httpLoaderFactory, deps: [HttpBackend] },
            useDefaultLang: false,
        })
    ],
    providers: [],
})

export class AppModule implements DoBootstrap {
    constructor(private injector: Injector) {
    }

    ngDoBootstrap() {
        const jodellclawcontrolComponent = createCustomElement(JodellClawControlComponent, {injector: this.injector});
        customElements.define('jodell-jodell-claw-control-frontend-jodell-claw-control', jodellclawcontrolComponent);
        const jodellclawappComponent = createCustomElement(JodellClawAppComponent, {injector: this.injector});
        customElements.define('jodell-jodell-claw-control-frontend-jodell-claw-app', jodellclawappComponent);
        const jodellsmartskillComponent = createCustomElement(JodellSmartSkillComponent, {injector: this.injector});
        customElements.define('universal-robots-contribution-jodell-smart-skill', jodellsmartskillComponent);
        const jodellsmartskillopenComponent = createCustomElement(JodellSmartSkillOpenComponent, {injector: this.injector});
        customElements.define('universal-robots-contribution-jodell-smart-skill-open', jodellsmartskillopenComponent);
        const jodellsmartskillcloseComponent = createCustomElement(JodellSmartSkillCloseComponent, {injector: this.injector});
        customElements.define('universal-robots-contribution-jodell-smart-skill-close', jodellsmartskillcloseComponent);
        const sampleOperatorScreenComponent = createCustomElement(SampleOperatorScreenComponent, { injector: this.injector });
        customElements.define('universal-robots-contribution-samples-sample-operator-screen', sampleOperatorScreenComponent);
        const sampleOperatorScreenConfigurationComponent = createCustomElement(SampleOperatorScreenConfigurationComponent, { injector: this.injector });
        customElements.define('universal-robots-contribution-samples-sample-operator-screen-configuration', sampleOperatorScreenConfigurationComponent);
        const jodellSystemInfoNodeComponent = createCustomElement(JodellSystemInfoNodeComponent, { injector: this.injector });
        customElements.define('universal-robots-contribution-samples-sample-system-info-node', jodellSystemInfoNodeComponent);
    }

    // This function is never called, because we don't want to actually use the workers, just tell webpack about them
    registerWorkersWithWebPack() {
        new Worker(new URL('./components/jodell-claw-app/jodell-claw-app.behavior.worker.ts'
            /* webpackChunkName: "jodell-claw-app.worker" */, import.meta.url), {
            name: 'jodell-claw-app',
            type: 'module'
        });
        new Worker(new URL('./components/jodell-claw-control/jodell-claw-control.behavior.worker.ts'
            /* webpackChunkName: "jodell-claw-control.worker" */, import.meta.url), {
            name: 'jodell-claw-control',
            type: 'module'
        });
        new Worker(new URL('./components/jodell-smart-skill/jodell-smart-skill.behavior.worker.ts'
            /* webpackChunkName: "jodell-smart-skill.worker" */, import.meta.url), {
            name: 'jodell-smart-skill',
            type: 'module'
        });
        new Worker(new URL('./components/jodell-smart-skill-open/jodell-smart-skill-open.behavior.worker.ts'
            /* webpackChunkName: "jodell-smart-skill-open.worker" */, import.meta.url), {
            name: 'jodell-smart-skill-open',
            type: 'module'
        });
        new Worker(new URL('./components/jodell-smart-skill-close/jodell-smart-skill-close.behavior.worker.ts'
            /* webpackChunkName: "jodell-smart-skill-close.worker" */, import.meta.url), {
            name: 'jodell-smart-skill-close',
            type: 'module'
        });
        new Worker(new URL('./components/sample-operator-screen/sample-operator-screen.behavior.worker.ts'
            /* webpackChunkName: "sample-operator-screen.worker" */, import.meta.url), {
            name: 'sample-operator-screen.worker',
            type: 'module',
        });
    }
}

