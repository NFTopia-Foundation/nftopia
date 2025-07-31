<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateListingRequest;
use App\Http\Requests\UpdateListingRequest;
use App\Models\Listing;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class ListingController extends Controller
{
    public function index(Request $request)
    {
        $perPage = $request->input('per_page', 20);
        $cacheKey = "active_listings_page_{$request->get('page', 1)}_{$perPage}";
        $listings = Cache::remember($cacheKey, now()->addMinutes(5), function () use ($perPage) {
            return Listing::where('status', 'active')
                ->when(request('listing_type'), fn($q) => $q->where('listing_type', request('listing_type')))
                ->with('bids')
                ->paginate($perPage);
        });
        return response()->json([
            'success' => true,
            'data' => $listings,
        ]);
    }

    public function store(CreateListingRequest $request)
    {
        $data = $request->validated();
        $data['id'] = (string) Str::uuid();
        $listing = Listing::create($data);
        return response()->json([
            'success' => true,
            'data' => $listing,
        ], 201);
    }

    public function show(Listing $listing)
    {
        $data = Cache::remember("listing_{$listing->id}", 300, function () use ($listing) {
            return $listing->load('bids');
        });
        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    public function update(UpdateListingRequest $request, Listing $listing)
    {
        $listing->update($request->validated());
        return response()->json([
            'success' => true,
            'data' => $listing,
        ]);
    }

    public function destroy(Request $request, Listing $listing)
    {
        // Add policy/authorization as needed
        if ($request->user()->id !== $listing->seller_id || $listing->status !== 'active') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized or listing not active.'
            ], 403);
        }
        $listing->update(['status' => 'canceled']);
        return response()->json(null, 204);
    }
}
