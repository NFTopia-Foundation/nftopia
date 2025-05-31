/* eslint-disable prettier/prettier */
import {
  WebSocketGateway,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Socket, Server } from 'socket.io';
import { EventsService } from './events.service';

@WebSocketGateway({ cors: true })
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    private readonly eventsService: EventsService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit(server: Server) {
    this.eventsService.setServer(server);
  }

  async handleConnection(client: Socket) {
    const token = client.handshake.auth.token;
    try {
      const payload = this.jwtService.verify(token);
      client.data.user = payload;
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect() {}

  @SubscribeMessage('join_auction')
  async handleJoinAuction(
    @ConnectedSocket() client: Socket,
    @MessageBody() auctionId: string,
  ) {
    await client.join(`auction_${auctionId}`);
    const state = await this.eventsService.getAuctionState(auctionId);
    client.emit('auction_state', state);
  }

  @SubscribeMessage('bid_history')
  async handleBidHistory(
    @MessageBody() auctionId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const history = await this.eventsService.getBidHistory(auctionId);
    client.emit('bid_history', history);
  }

  @SubscribeMessage('place_bid')
  async handlePlaceBid(
    @MessageBody() payload: { auctionId: string; amount: number },
    @ConnectedSocket() client: Socket,
  ) {
    const { user } = client.data;
    try {
      const bid = await this.eventsService.placeBid(
        user.id,
        payload.auctionId,
        payload.amount,
      );
      this.eventsService.server
        .to(`auction_${payload.auctionId}`)
        .emit('new_bid', bid);
    } catch (error) {
      client.emit('bid_error', { message: error.message });
    }
  }

  @SubscribeMessage('watch_active_auctions')
  async handleWatchActiveAuctions(@ConnectedSocket() client: Socket) {
    await this.eventsService.startBroadcastingActiveAuctions(client);
  }
}
