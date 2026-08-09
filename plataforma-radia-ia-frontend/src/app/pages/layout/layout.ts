import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterModule, CommonModule], // Importante agregar RouterModule aquí
  templateUrl: './layout.html',
  styleUrl: './layout.css'
})
export class LayoutComponent {
  // Aquí luego agregaremos la lógica para cerrar sesión
}