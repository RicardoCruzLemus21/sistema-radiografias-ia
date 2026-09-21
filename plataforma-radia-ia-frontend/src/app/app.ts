import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SesionService } from './services/sesion.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('plataforma-radia-ia-frontend');

  constructor(sesionService: SesionService) {
    sesionService.iniciarVigilancia();
  }
}
