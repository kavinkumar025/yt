import { AppServerModule } from './app/app.server.module';
import { environment } from './environments/environment';
import { enableProdMode } from '@angular/core';
import { renderModule } from '@angular/platform-server';

if (environment.production) {
  enableProdMode();
}

export default function render(url: string, document: string) {
  return renderModule(AppServerModule, {
    document,
    url,
  });
}
