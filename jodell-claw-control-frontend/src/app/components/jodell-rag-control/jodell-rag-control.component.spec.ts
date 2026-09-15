import {ComponentFixture, TestBed} from '@angular/core/testing';
import {JodellRagControlComponent} from "./jodell-rag-control.component";
import {TranslateLoader, TranslateModule} from "@ngx-translate/core";
import {Observable, of} from "rxjs";

describe('JodellRagControlComponent', () => {
  let fixture: ComponentFixture<JodellRagControlComponent>;
  let component: JodellRagControlComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [JodellRagControlComponent],
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

    fixture = TestBed.createComponent(JodellRagControlComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });
});
