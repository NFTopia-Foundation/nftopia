<?php

namespace App\Http\Controllers;

use App\Models\Listing;
use App\Http\Requests\StoreListingRequest;
use App\Http\Requests\UpdateListingRequest;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;

/**
 * @OA\Tag(
 *     name="Listings",
 *     description="Endpoints for managing NFT listings"
 * )
 */
class ListingController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/listings",
     *     tags={"Listings"},
     *     summary="List all active listings (paginated)",
     *     @OA\Parameter(name="page", in="query", required=false, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Success")
     * )
     */
    public function index(Request $request)
    {
        $page = $request->get('page', 1);
        $cacheKey = "active_listings_page_{$page}";
        $listings = Cache::remember($cacheKey, 60, function () {
            return Listing::whereNull('deleted_at')
                ->where(function($q) {
                    $q->where('type', 'fixed_price')
                      ->orWhere(function($q2) {
                          $q2->where('type', 'auction')
                              ->where('auction_end', '>', now());
                      });
                })
                ->latest()
                ->paginate(20);
        });
        return response()->json(['data' => $listings]);
    }

    /**
     * @OA\Post(
     *     path="/api/listings",
     *     tags={"Listings"},
     *     summary="Create new listing",
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"nft_id","seller_id","type","price","royalty_percentage"},
     *             @OA\Property(property="nft_id", type="string", format="uuid"),
     *             @OA\Property(property="seller_id", type="string", format="uuid"),
     *             @OA\Property(property="type", type="string", enum={"fixed_price","auction"}),
     *             @OA\Property(property="price", type="number", format="float"),
     *             @OA\Property(property="auction_end", type="string", format="date-time", nullable=true),
     *             @OA\Property(property="royalty_percentage", type="number", format="float")
     *         )
     *     ),
     *     @OA\Response(response=201, description="Created"),
     *     @OA\Response(response=422, description="Validation error")
     * )
     */
    public function store(StoreListingRequest $request)
    {
        // TODO: Add ownership verification, min price, etc.
        $listing = Listing::create($request->validated());
        return response()->json(['data' => $listing], Response::HTTP_CREATED);
    }

    /**
     * @OA\Get(
     *     path="/api/listings/{listing}",
     *     tags={"Listings"},
     *     summary="Get listing details",
     *     @OA\Parameter(name="listing", in="path", required=true, @OA\Schema(type="string", format="uuid")),
     *     @OA\Response(response=200, description="Success"),
     *     @OA\Response(response=404, description="Not found")
     * )
     */
    public function show(Listing $listing)
    {
        return response()->json(['data' => $listing]);
    }

    /**
     * @OA\Put(
     *     path="/api/listings/{listing}",
     *     tags={"Listings"},
     *     summary="Update listing",
     *     @OA\Parameter(name="listing", in="path", required=true, @OA\Schema(type="string", format="uuid")),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="price", type="number", format="float"),
     *             @OA\Property(property="auction_end", type="string", format="date-time", nullable=true),
     *             @OA\Property(property="royalty_percentage", type="number", format="float")
     *         )
     *     ),
     *     @OA\Response(response=200, description="Success"),
     *     @OA\Response(response=422, description="Validation error")
     * )
     */
    public function update(UpdateListingRequest $request, Listing $listing)
    {
        $listing->update($request->validated());
        return response()->json(['data' => $listing]);
    }

    /**
     * @OA\Delete(
     *     path="/api/listings/{listing}",
     *     tags={"Listings"},
     *     summary="Cancel listing",
     *     @OA\Parameter(name="listing", in="path", required=true, @OA\Schema(type="string", format="uuid")),
     *     @OA\Response(response=200, description="Success"),
     *     @OA\Response(response=404, description="Not found")
     * )
     */
    public function destroy(Listing $listing)
    {
        $listing->delete();
        return response()->json(['message' => 'Listing cancelled successfully']);
    }
}
