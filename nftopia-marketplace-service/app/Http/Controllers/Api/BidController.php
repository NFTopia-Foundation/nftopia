<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\BidService;
use App\Model\Bid;
use App\Model\Listing;
use Illuminate\Http\Request;
use App\Http\Controllers\Requests\BidRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;
use Exception;

class BidController extends Controller
{
    public function __construct(protected BidService $bidService){}

    public function store(BidRequest $request): JsonResponse
    {
        try {
            $validated = $request->validated();

            $bid = $this->bidService->createBid($validated);

            return response()->json([
                'success' => true,
                'message' => 'Bid created successfully',
                'data' => $bid->load('listing'),
            ], 201);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    public function getListingBids(Request $request, Bid $Bid): JsonResponse
    {
        try {
            $perPage = $request->get('per_page', 15);
            $bids = $this->bidService->getBidsForListing($Bid->id, $perPage);

            return response()->json([
                'success' => true,
                'data' => $bids,
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    public function getBidderBids(Request $request, Bid $Bid): JsonResponse
    {
        try {
            $perPage = $request->get('per_page', 15);
            $bids = $this->bidService->getBidsByBidder($Bid->bidder_id, $perPage);

            return response()->json([
                'success' => true,
                'data' => $bids,
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Accept a bid (for auction listings)
     */
    public function accept(Bid $Bid): JsonResponse
    {
        try {
            $bid = $this->bidService->acceptBid($Bid->id);

            return response()->json([
                'success' => true,
                'message' => 'Bid accepted successfully',
                'data' => $bid->load('listing'),
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    public function cancel(Request $request, Bid $Bid): JsonResponse
    {
        try {
            $validated = $request->validate([
                'bidder_id' => 'required|uuid',
            ]);

            $bid = $this->bidService->cancelBid($Bid->id, $validated['bidder_id']);

            return response()->json([
                'success' => true,
                'message' => 'Bid canceled successfully',
                'data' => $bid,
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Get the highest bid for a listing
     */
    public function getHighestBid(Listing $Listing): JsonResponse
    {
        try {
            $bid = $this->bidService->getHighestBid($Listing->id);

            return response()->json([
                'success' => true,
                'data' => $bid,
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Update bid with blockchain transaction hash
     */
    public function updateTransactionHash(BidRequest $request, Bid $Bid): JsonResponse
    {
        try {
            $validated = $request->validated();

            $bid = $this->bidService->updateBidTransactionHash($Bid->id, $validated['transaction_hash']);

            return response()->json([
                'success' => true,
                'message' => 'Bid transaction hash updated successfully',
                'data' => $bid,
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Process expired auctions (admin endpoint)
     */
    public function processExpiredAuctions(): JsonResponse
    {
        try {
            $processedBids = $this->bidService->processExpiredAuctions();

            return response()->json([
                'success' => true,
                'message' => 'Expired auctions processed successfully',
                'data' => [
                    'processed_count' => $processedBids->count(),
                    'processed_bids' => $processedBids,
                ],
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}