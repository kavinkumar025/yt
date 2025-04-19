import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { VideoPlayerComponent } from './pages/video-player/video-player.component';
import { ProfileComponent } from './pages/profile/profile.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'trending', component: HomeComponent },
  { path: 'explore', component: HomeComponent },
  { path: 'subscriptions', component: HomeComponent },
  { path: 'library', component: HomeComponent },
  { path: 'history', component: HomeComponent },
  { path: 'video/:id', component: VideoPlayerComponent },
  { path: 'channel/:id', component: ProfileComponent },
  { path: 'search', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }