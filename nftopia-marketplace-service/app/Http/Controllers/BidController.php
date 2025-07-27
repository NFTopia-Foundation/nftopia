<?php

namespace App\Http\Controllers;


use App\Models\Listing;
use App\Models\Bid;
use App\Http\Requests\StoreBidRequest;
use Illuminate\Http\Response;

/**
 * @OA\Tag(
 *     name="Bids",
 *     description="Endpoints for managing bids on NFT listings"
 * )
 */
class BidController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/listings/{listing}/bids",
     *     tags={"Bids"},
     *     summary="List all bids for a listing",
     *     @OA\Parameter(
     *         name="listing",
     *         in="path",
     *         required=true,
     *         description="Listing UUID",
     *         @OA\Schema(type="string", format="uuid")
     *     ),
     *     @OA\Response(response=200, description="Success")
     * )
     */
    public function index(Listing $listing)
    {
        $bids = $listing->bids()->latest()->paginate(20);
        return response()->json(['data' => $bids]);
    }

    /**
     * @OA\Post(
     *     path="/api/listings/{listing}/bids",
     *     tags={"Bids"},
     *     summary="Place a new bid on a listing",
     *     @OA\Parameter(
     *         name="listing",
     *         in="path",
     *         required=true,
     *         description="Listing UUID",
     *         @OA\Schema(type="string", format="uuid")
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"bidder_id","amount","currency"},
     *             @OA\Property(property="bidder_id", type="string", format="uuid"),
     *             @OA\Property(property="amount", type="number", format="float"),
     *             @OA\Property(property="currency", type="string")
     *         )
     *     ),
     *     @OA\Response(response=201, description="Created"),
     *     @OA\Response(response=422, description="Validation error")
     * )
     */
    public function store(StoreBidRequest $request, Listing $listing)
    {
        // TODO: Add business logic for bid amount, ownership, escrow, etc.
        $bid = $listing->bids()->create($request->validated());
        return response()->json(['data' => $bid], Response::HTTP_CREATED);
    }

    /**
     * @OA\Get(
     *     path="/api/listings/{listing}/bids/{bid}",
     *     tags={"Bids"},
     *     summary="Get bid details",
     *     @OA\Parameter(name="listing", in="path", required=true, @OA\Schema(type="string", format="uuid")),
     *     @OA\Parameter(name="bid", in="path", required=true, @OA\Schema(type="string", format="uuid")),
     *     @OA\Response(response=200, description="Success"),
     *     @OA\Response(response=404, description="Not found")
     * )
     */
    public function show(Listing $listing, Bid $bid)
    {
        if ($bid->listing_id !== $listing->id) {
            return response()->json(['error' => 'Bid does not belong to this listing'], 404);
        }
        return response()->json(['data' => $bid]);
    }

    /**
     * @OA\Delete(
     *     path="/api/listings/{listing}/bids/{bid}",
     *     tags={"Bids"},
     *     summary="Retract a bid",
     *     @OA\Parameter(name="listing", in="path", required=true, @OA\Schema(type="string", format="uuid")),
     *     @OA\Parameter(name="bid", in="path", required=true, @OA\Schema(type="string", format="uuid")),
     *     @OA\Response(response=200, description="Success"),
     *     @OA\Response(response=404, description="Not found")
     * )
     */
    public function destroy(Listing $listing, Bid $bid)
    {
        if ($bid->listing_id !== $listing->id) {
            return response()->json(['error' => 'Bid does not belong to this listing'], 404);
        }
        $bid->delete();
        return response()->json(['message' => 'Bid retracted successfully']);
    }
}
