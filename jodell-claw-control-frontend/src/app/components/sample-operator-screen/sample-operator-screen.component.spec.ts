import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SampleOperatorScreenComponent } from './sample-operator-screen.component';

describe('Sample operator screen component', () => {
    let component: SampleOperatorScreenComponent;
    let fixture: ComponentFixture<SampleOperatorScreenComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
        });
        fixture = TestBed.createComponent(SampleOperatorScreenComponent);
        component = fixture.componentInstance;

        fixture.detectChanges();
    });

    it('should be created', () => {
        expect(component).toBeTruthy();
    });
});
