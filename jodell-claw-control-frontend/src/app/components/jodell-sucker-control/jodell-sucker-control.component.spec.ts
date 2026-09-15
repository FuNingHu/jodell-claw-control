import {ComponentFixture, TestBed} from '@angular/core/testing';
import {JodellSuckerControlComponent} from "./jodell-sucker-control.component";
import {TranslateLoader, TranslateModule} from "@ngx-translate/core";
import {Observable, of} from "rxjs";

describe('JodellSuckerControlComponent', () => {
  let fixture: ComponentFixture<JodellSuckerControlComponent>;
  let component: JodellSuckerControlComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [JodellSuckerControlComponent],
      imports: [TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader, useValue: {
            getTranslation(): Observable<Record<string, string>> {
              return of({});
            }
          }
        }
      })],
    }).compileComponents();

    fixture = TestBed.createComponent(JodellSuckerControlComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });
});
