<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ListingService;
use App\Model\Listing;
use Illuminate\Http\Request;
use App\Http\Controllers\Requests\ListingRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;
use Exception;

class ListingController extends Controller
{
    public function __construct(private readonly ListingService $listingService){}

    public function index(ListingRequest $request): JsonResponse
    {
        try {
            $validated = $request->validated();

            $perPage = $validated['per_page'] ?? 15;
            unset($validated['per_page']);

            $listings = $this->listingService->getActiveListings($validated, $perPage);

            return response()->json([
                'success' => true,
                'data' => $listings,
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    public function store(ListingRequest $request): JsonResponse
    {
        try {
            $validated = $request->validated();

            $listing = $this->listingService->createListing($validated);

            return response()->json([
                'success' => true,
                'message' => 'Listing created successfully',
                'data' => $listing,
            ], 201);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    public function show(Listing $listing): JsonResponse
    {
        try {

            $listing = $this->listingService->getListing($listing->id);

            return response()->json([
                'success' => true,
                'data' => $listing,
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Listing not found',
            ], 404);
        }
    }

    public function getSellerListings(Request $request, Listing $Listing): JsonResponse
    {
        try {
            $perPage = $request->get('per_page', 15);
            $listings = $this->listingService->getListingsBySeller($Listing->seller_id, $perPage);

            return response()->json([
                'success' => true,
                'data' => $listings,
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Update listing price (only for fixed price listings)
     */
    public function updatePrice(ListingRequest $request, Listing $listing): JsonResponse
    {
        try {
            $validated = $request->validate();

            $listing = $this->listingService->updateListingPrice(
                $listing->id,
                $validated['price'],
                $validated['seller_id']
            );

            return response()->json([
                'success' => true,
                'message' => 'Listing price updated successfully',
                'data' => $listing,
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    public function cancel(ListingRequest $request, Listing $listing): JsonResponse
    {
        try {
            $validated = $request->validated();

            $listing = $this->listingService->cancelListing($listing->id, $validated['seller_id']);

            return response()->json([
                'success' => true,
                'message' => 'Listing canceled successfully',
                'data' => $listing,
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    public function search(ListingRequest $request): JsonResponse
    {
        try {
            $validated = $request->validated();

            $perPage = $validated['per_page'] ?? 15;
            $listings = $this->listingService->searchListings($validated['query'], $perPage);

            return response()->json([
                'success' => true,
                'data' => $listings,
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    public function getAuctionsEndingSoon(Request $request): JsonResponse
    {
        try {
            $hours = $request->get('hours', 24);
            $auctions = $this->listingService->getAuctionsEndingSoon($hours);

            return response()->json([
                'success' => true,
                'data' => $auctions,
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    public function getStats(): JsonResponse
    {
        try {
            $stats = $this->listingService->getListingStats();

            return response()->json([
                'success' => true,
                'data' => $stats,
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}