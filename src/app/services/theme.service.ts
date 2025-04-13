import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private darkThemeSubject = new BehaviorSubject<boolean>(false);
  isDarkTheme$ = this.darkThemeSubject.asObservable();
  
  constructor() {
    // Check if the user has already set a theme preference
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme) {
      // Apply saved theme preference
      this.setTheme(savedTheme as 'dark' | 'light');
    } else {
      // Check user's system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.setTheme(prefersDark ? 'dark' : 'light');
    }
  }
  
  get isDarkTheme(): boolean {
    return this.darkThemeSubject.value;
  }
  
  toggleTheme(): void {
    this.setTheme(this.isDarkTheme ? 'light' : 'dark');
  }
  
  setTheme(theme: 'dark' | 'light'): void {
    const isDark = theme === 'dark';
    this.darkThemeSubject.next(isDark);
    localStorage.setItem('theme', theme);
    this.applyTheme(isDark);
  }
  
  private applyTheme(isDark: boolean): void {
    if (isDark) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }
}