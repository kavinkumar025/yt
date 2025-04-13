import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'trending', component: HomeComponent }, // Will be replaced with a dedicated component later
  { path: 'explore', component: HomeComponent }, // Will be replaced with a dedicated component later
  { path: 'subscriptions', component: HomeComponent }, // Will be replaced with a dedicated component later
  { path: 'library', component: HomeComponent }, // Will be replaced with a dedicated component later
  { path: 'history', component: HomeComponent }, // Will be replaced with a dedicated component later
  { path: 'watch/:id', component: HomeComponent }, // Will be replaced with a dedicated component later
  { path: 'channel/:id', component: HomeComponent }, // Will be replaced with a dedicated component later
  { path: 'search', component: HomeComponent }, // Will be replaced with a dedicated component later
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }