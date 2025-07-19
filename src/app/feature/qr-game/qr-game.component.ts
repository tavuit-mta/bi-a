import { Component, OnInit } from '@angular/core';
import { QRCodeModule } from 'angularx-qrcode';
import { AppService } from '../../app.service';

@Component({
  selector: 'app-qr-game',
  standalone: true,
  imports: [
    QRCodeModule
  ],
  templateUrl: './qr-game.component.html',
  styleUrl: './qr-game.component.scss'
})
export class QrGameComponent implements OnInit {
  qrCodeValue: string = '';

  constructor(private appService: AppService) { }

  ngOnInit(): void {
    // Initialize the QR code value, this could be a game ID or any other relevant data
    this.qrCodeValue = this.appService.getGamePath();
  }

}
