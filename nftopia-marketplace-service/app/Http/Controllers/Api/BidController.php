<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PlaceBidRequest;
use App\Models\Bid;
use App\Models\Listing;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class BidController extends Controller
{
    public function index(Listing $listing)
    {
        $bids = $listing->bids()->with('listing')->paginate(20);
        return response()->json([
            'success' => true,
            'data' => $bids,
        ]);
    }

    public function store(PlaceBidRequest $request, Listing $listing)
    {
        $bid = Bid::create([
            'id' => (string) Str::uuid(),
            'listing_id' => $listing->id,
            'bidder_id' => $request->user()->id,
            'amount' => $request->input('amount'),
            'status' => 'pending',
        ]);
        // Trigger escrow hold (mocked)
        Http::post(config('services.payment.url') . '/hold', [
            'bid_id' => $bid->id,
            'amount' => $bid->amount,
            'user_id' => $bid->bidder_id,
        ]);
        return response()->json([
            'success' => true,
            'data' => $bid,
        ], 201);
    }

    public function show(Listing $listing, Bid $bid)
    {
        return response()->json([
            'success' => true,
            'data' => $bid->load('listing'),
        ]);
    }

    public function destroy(Listing $listing, Bid $bid)
    {
        if ($bid->listing->highestBid()?->id !== $bid->id) {
            $bid->update(['status' => 'canceled']);
            return response()->json(null, 204);
        }
        return response()->json([
            'success' => false,
            'message' => 'Cannot retract highest bid.'
        ], 400);
    }
}
