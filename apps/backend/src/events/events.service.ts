/* eslint-disable prettier/prettier */

import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { AuctionsService } from '../auctions/auctions.service';
import { BidsService } from '../bids/bids.service';

@Injectable()
export class EventsService {
  private serverInstance: Server;

  constructor(
    private readonly auctionsService: AuctionsService,
    private readonly bidsService: BidsService,
  ) {}

  setServer(server: Server) {
    this.serverInstance = server;
  }

  get server() {
    return this.serverInstance;
  }

  async getAuctionState(auctionId: string) {
    return this.auctionsService.getAuction(auctionId);
  }

  async getBidHistory(auctionId: string) {
    return this.bidsService.getBidsByAuction(auctionId);
  }

  async placeBid(userId: number, auctionId: string, amount: number) {
    return this.bidsService.placeBid(userId, auctionId, amount);
  }

  async startBroadcastingActiveAuctions(client: Socket) {
    const interval = setInterval(async () => {
      if (!client.connected) {
        clearInterval(interval);
        return;
      }
      const activeAuctions = await this.auctionsService.getActiveAuctions();
      client.emit('active_auctions', activeAuctions);
    }, 10000); // every 10 seconds
  }
}
